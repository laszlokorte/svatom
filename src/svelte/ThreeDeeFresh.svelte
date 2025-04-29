<script>
	import * as L from "partial.lenses";
	import * as G from "./generators";
	import * as R from "ramda";
	import * as U from "./utils";
	import {
		atom,
		view,
		read,
		combine,
		update,
		failableView,
		bindValue,
		autofocusIf,
	} from "./svatom.svelte.js";
	import exampleMesh from "./example_mesh";

	const numf = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	});
	const expect = (p, f) => (x) => (p(x) ? f(x) : undefined);

	const {
		geo = atom(exampleMesh),
		camera = atom({
			clip: {
				near: 2,
				far: 1000,
			},
			aspectRatio: 1,
			fov: Math.PI / 5,
			orthogonality: 0,
			eye: {
				tx: 0,
				ty: 0,
				tz: 0,
				rx: 0,
				ry: 0,
				rz: 0,
				sx: 1,
				sy: 1,
				sz: 1,
			},
		}),
		screen = atom({
			aspect: "meet",
			alignX: "Mid",
			alignY: "Mid",
			size: {
				x: 100,
				y: 100,
			},
		}),
	} = $props();

	const offsetRect = (o) => [
		L.applyAt("x", L.add(o)),
		L.applyAt("y", L.add(o)),
		L.applyAt("width", L.subtract(2 * o)),
		L.applyAt("height", L.subtract(2 * o)),
	];

	const lensTranslateBuilder =
		(...axis) =>
		(...deltas) =>
			R.zipWith((ax, d) => L.applyAt(ax, L.add(d)), axis, deltas);

	const lensScaleBuilder =
		(...axis) =>
		(...deltas) =>
			R.zipWith((ax, d) => L.applyAt(ax, L.multiply(d)), axis, deltas);

	const lensRotateBuilder = (ax1, ax2) => (angle) => [
		L.applyAt(
			L.pick({ ax1, ax2 }),
			L.iso(
				expect(R.is(Object), ({ ax1, ax2 }) => ({
					ax1: ax1 * Math.cos(angle) - ax2 * Math.sin(angle),
					ax2: ax1 * Math.sin(angle) + ax2 * Math.cos(angle),
				})),
				expect(R.is(Object), ({ ax1, ax2 }) => ({
					ax1: ax1 * Math.cos(-angle) - ax2 * Math.sin(-angle),
					ax2: ax1 * Math.sin(-angle) + ax2 * Math.cos(-angle),
				})),
			),
		),
	];

	const lens3dPerspectiveBuilder =
		(ax1, ax2, ax3, ax4) => (fov, aspect, near, far) => {
			const tanfov = 1 / Math.tan(fov / 2);
			const fpn = -(far + near) / (far - near);
			const ftn = -(2 * far * near) / (far - near);

			return [
				L.applyAt(ax1, [L.multiply(tanfov), L.multiply(aspect)]),
				L.applyAt(ax2, L.multiply(tanfov)),
				L.applyAt(
					L.pick({ ax3, ax4 }),
					L.iso(
						({ ax3, ax4 }) => ({
							ax3: fpn * ax3 + ftn * ax4,
							ax4: -ax3,
						}),
						({ ax3, ax4 }) => ({
							ax3: -ax4,
							ax4: (ax3 + fpn * ax4) / ftn,
						}),
					),
				),
			];
		};

	const lens3dProjectBuilder = (ax1, ax2, ax3, ax4) => [
		L.applyAt(
			L.pick({ ax1, ax2, ax3, ax4 }),
			L.iso(
				expect(R.is(Object), ({ ax1, ax2, ax3, ax4 }) => ({
					ax1: ax1 / ax4,
					ax2: ax2 / ax4,
					ax3: ax3 / ax4,
					ax4: ax4,
				})),
				expect(R.is(Object), ({ ax1, ax2, ax3, ax4 }) => ({
					ax1: ax1 * ax4,
					ax2: ax2 * ax4,
					ax3: ax3 * ax4,
					ax4: ax4,
				})),
			),
		),
	];

	const lens3dTranslate = lensTranslateBuilder("x", "y", "z");
	const lens2dTranslate = lensTranslateBuilder("x", "y", "z");
	const lens3dScale = lensScaleBuilder("x", "y", "z");
	const lens2dScale = lensScaleBuilder("x", "y");
	const lens3dRotateX = lensRotateBuilder("y", "z");
	const lens3dRotateY = lensRotateBuilder("x", "z");
	const lens3dRotateZ = lensRotateBuilder("x", "y");
	const lens2dRotate = lensRotateBuilder("x", "y");
	const lens3dProject = lens3dProjectBuilder("x", "y", "z", "w");
	const lens3dPerspective = lens3dPerspectiveBuilder("x", "y", "z", "w");

	const coordPair = L.iso(
		expect(R.is(Object), ({ x, y }) => `${x},${y}`),
		expect(R.is(String), (s) => {
			const [x, y] = s.split(",").map(Number);
			return { x, y };
		}),
	);

	const coordString = L.iso(
		expect(R.is(Array), R.pipe(R.map(L.get(coordPair)), R.join(" "))),
		expect(
			R.is(String),
			R.pipe(
				R.trim,
				R.split(/\s+/),
				R.map((p) => L.set(coordPair, p, p)),
			),
		),
	);

	const viewBox = view(
		["size", ({ x, y }) => `${-x / 2} ${-y / 2} ${x} ${y}`],
		screen,
	);
	const aspectRatio = view(
		({ alignX, alignY, aspect }) => `x${alignX}Y${alignY} ${aspect}`,
		screen,
	);
	const clientWidth = view(["size", "x"], screen);
	const clientHeight = view(["size", "y"], screen);

	const debugRect = view(
		[
			"size",
			L.pick({
				x: ["x", L.subtract(10), L.divide(2), L.negate],
				y: ["y", L.subtract(10), L.divide(2), L.negate],
				width: ["x", L.subtract(10)],
				height: ["y", L.subtract(10)],
				fill: R.always("red"),
				opacity: R.always(0.1),
			}),
		],
		screen,
	);

	const lensRectEdges = L.lens(
		({ x, y, width, height }) => [
			{
				x,
				y,
			},
			{ x: x + width, y: y },
			{ x: x + width, y: y + height },
			{ x: x, y: y + height },
		],
		(edges) => ({
			x: R.min(R.map(R.prop("x"), edges)),
			y: R.min(R.map(R.prop("y"), edges)),
			width:
				R.max(R.map(R.prop("x"), edges)) -
				R.min(R.map(R.prop("x"), edges)),
			height:
				R.max(R.map(R.prop("x"), edges)) -
				R.min(R.map(R.prop("y"), edges)),
		}),
	);

	const debugBounds = view(
		[
			L.pick({
				points: lensRectEdges,
			}),
		],
		debugRect,
	);

	const debugBoundsSvg = view(
		[
			L.pickIn({
				points: coordString,
				stroke: R.always("cyan"),
				fill: R.always("white"),
				"fill-opacity": R.always("0.1"),
			}),
		],
		debugBounds,
	);

	const lensRadToDegree = [L.multiply(180), L.divide(Math.PI)];

	const offset = atom({
		x: 0,
		y: 0,
	});
	const rotation = atom(0);
	const scale = atom({ x: 1, y: 1 });
	const rotationAngle = view(lensRadToDegree, rotation);

	const debugCircle = view(
		[
			L.pick({
				fill: R.always("black"),
				r: R.always(10),
				cx: ["x"],
				cy: ["y"],
			}),
		],
		offset,
	);

	const rangeX = view(
		[
			"size",
			L.pick({
				min: ["x", L.divide(2), L.negate],
				max: ["x", L.divide(2)],
			}),
		],
		screen,
	);
	const rangeY = view(
		[
			"size",
			L.pick({
				min: ["y", L.divide(2), L.negate],
				max: ["y", L.divide(2)],
			}),
		],
		screen,
	);
	const offsetX = view("x", offset);
	const offsetY = view("y", offset);
	const scaleX = view("x", scale);
	const scaleY = view("y", scale);

	const polygon2DShape = atom({
		points: [
			{ x: -400, y: 300 },
			{ x: 0, y: -300 },
			{ x: 300, y: 100 },
		],
	});

	const mapIso = (iso) =>
		L.iso(
			expect(R.is(Array), R.map(L.get(iso))),
			expect(R.is(Array), R.zipWith(L.set(iso))),
		);

	const transformChain = ({
		offset: { x, y },
		rotation,
		scale: { x: sx, y: sy },
	}) =>
		mapIso([
			lens2dScale(sx, sy),
			lens2dRotate(rotation),
			lens2dTranslate(x, y),
		]);

	const polygon2D = view(
		L.choose(({ offset, scale, rotation }) => [
			"poly",
			L.applyAt("points", transformChain({ offset, scale, rotation })),
		]),
		combine({ offset, rotation, scale, poly: polygon2DShape }),
	);

	function intersect(l1p1, l1p2, l2p1, l2p2) {
		const denom =
			(l1p1.x - l1p2.x) * (l2p1.y - l2p2.y) -
			(l1p1.y - l1p2.y) * (l2p1.x - l2p2.x);
		if (denom === 0) return null; // lines are parallel

		const px =
			((l1p1.x * l1p2.y - l1p1.y * l1p2.x) * (l2p1.x - l2p2.x) -
				(l1p1.x - l1p2.x) * (l2p1.x * l2p2.y - l2p1.y * l2p2.x)) /
			denom;
		const py =
			((l1p1.x * l1p2.y - l1p1.y * l1p2.x) * (l2p1.y - l2p2.y) -
				(l1p1.y - l1p2.y) * (l2p1.x * l2p2.y - l2p1.y * l2p2.x)) /
			denom;

		return { x: px, y: py };
	}

	function leftOf(p, edge) {
		const a = edge.from;
		const b = edge.to;
		return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) > 0;
	}

	const clipPolygonEdge = (polygon, edge) => {
		const result = [];

		for (let i = 0; i < polygon.points.length; i++) {
			const j = (i + 1) % polygon.points.length;
			const a = polygon.points[i];
			const b = polygon.points[j];

			const c = intersect(a, b, edge.from, edge.to);

			if (leftOf(b, edge)) {
				if (!leftOf(a, edge)) {
					result.push(c);
				}

				result.push(b);
			} else if (leftOf(a, edge)) {
				result.push(c);
			}
		}

		return { ...polygon, points: result };
	};

	const polygonEdges = function* (polygon) {
		for (let i = 0; i < polygon.points.length; i++) {
			const j = (i + 1) % polygon.points.length;

			yield { from: polygon.points[i], to: polygon.points[j] };
		}
	};

	const clipPolygonPolygon = (polygonInner, polygonOuter) => {
		return G.reduce(
			clipPolygonEdge,
			polygonInner,
			polygonEdges(polygonOuter),
		);
	};

	const debugPolygon = view(
		L.pickIn({
			points: coordString,
			stroke: R.always("blue"),
			"stroke-dasharray": R.always("10 10"),
			fill: R.always("white"),
			"fill-opacity": R.always("0.3"),
		}),
		polygon2D,
	);

	const inset = atom(10);

	const debugPolygonClipped = view(
		L.choose(({ inset }) =>
			L.pick({
				stroke: R.always("purple"),
				points: [
					L.applyAt("bounds", [
						offsetRect(inset),
						L.pick({ points: lensRectEdges }),
					]),
					({ poly, bounds }) => clipPolygonPolygon(poly, bounds),
					"points",
					coordString,
				],
				fill: R.always("purple"),
				"stroke-width": R.always(5),
				"vector-effect": R.always("non-scaling-stroke"),
				"fill-opacity": R.always("0.1"),
				"stroke-opacity": R.always(0.5),
			}),
		),
		combine({ poly: polygon2D, bounds: debugRect, inset }),
	);

	const ndcCube = atom({
		vertices: [
			{ x: -1, y: -1, z: -1, w: 2 },
			{ x: -1, y: -1, z: 1, w: 1 },
			{ x: -1, y: 1, z: -1, w: 2 },
			{ x: -1, y: 1, z: 1, w: 1 },
			{ x: 1, y: -1, z: -1, w: 2 },
			{ x: 1, y: -1, z: 1, w: 1 },
			{ x: 1, y: 1, z: -1, w: 2 },
			{ x: 1, y: 1, z: 1, w: 1 },
		],
		edges: [
			{ from: 0, to: 1 },
			{ from: 2, to: 3 },
			{ from: 4, to: 5 },
			{ from: 6, to: 7 },
			{ from: 0, to: 2 },
			{ from: 2, to: 6 },
			{ from: 4, to: 0 },
			{ from: 4, to: 6 },
			{ from: 1, to: 3 },
			{ from: 3, to: 7 },
			{ from: 5, to: 1 },
			{ from: 5, to: 7 },
		],
	});

	const worldTriangle = atom({
		vertices: [
			{ x: -1.4, y: 1.4, z: -3, w: 1 },
			{ x: 0.2, y: 3.4, z: -4, w: 1 },
			{ x: 0.3, y: -1.4, z: -8, w: 1 },
		],
		edges: [
			{ from: 0, to: 1 },
			{ from: 1, to: 2 },
			{ from: 2, to: 0 },
		],
		faces: [{ a: 0, b: 1, c: 2 }],
	});

	const cameraTransform = (camera, screenAspect) => [
		L.inverse([
			lens3dScale(camera.eye.sx, camera.eye.sy, camera.eye.sz),
			lens3dRotateX(camera.eye.rx),
			lens3dRotateY(camera.eye.ry),
			lens3dRotateZ(camera.eye.rz),
			lens3dTranslate(camera.eye.tx, camera.eye.ty, camera.eye.tz),
		]),

		lens3dPerspective(
			camera.fov,
			camera.aspectRatio * screenAspect,
			camera.clip.near,
			camera.clip.far,
		),
	];

	const ratio = (a, b) => [
		L.pick({ a, b }),
		L.choose(({ a }) => ["b", L.divide(a)]),
	];

	const screenAspect = view(["size", ratio("x", "y")], screen);

	const ndcTriangle = view(
		L.choose(({ camera, screenAspect, geo }) => {
			return [
				"geo",
				L.applyAt(
					"vertices",
					mapIso(cameraTransform(camera, screenAspect)),
				),
			];
		}),
		combine({ geo: worldTriangle, camera, screenAspect }),
	);

	const coordPathString = (r) =>
		L.iso(
			expect(
				R.is(Array),
				R.pipe(
					R.map(
						({ x, y }) =>
							`M ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y}`,
					),
					R.join(" "),
				),
			),
			expect(
				R.is(String),
				R.pipe(
					R.trim(),
					R.split(","),
					R.map((s) => {
						const [x, y] = s.split(",").map(Number);
						return { x, y };
					}),
				),
			),
		);

	const ndcCubeVertexPath = view(
		L.choose(({ screen: { size }, cube: { vertices } }) => {
			return [
				"cube",
				"vertices",
				mapIso([lens3dProject, lens2dScale(size.x / 2, size.y / 2)]),
				coordPathString(3),
			];
		}),
		combine({ screen, cube: ndcCube }),
	);

	const ndcCubeEdgePath = view(
		({ screen: { size }, geo: { vertices, edges } }) => {
			const projectedVertices = L.get(
				[
					mapIso([
						lens3dProject,
						lens2dScale(size.x / 2, size.y / 2),
						coordPair,
					]),
				],
				vertices,
			);

			return R.join(
				" ",
				R.map(
					({ from, to }) =>
						`M${projectedVertices[from]} L ${projectedVertices[to]}`,
					edges,
				),
			);
		},
		combine({ screen, geo: ndcCube }),
	);

	const ndcPlanes = [
		{ axis: "x", sign: +1, offset: 0.02 }, // x ≤ w
		{ axis: "x", sign: -1, offset: 0.02 }, // -x ≤ w
		{ axis: "y", sign: +1, offset: 0.02 }, // y ≤ w
		{ axis: "y", sign: -1, offset: 0.02 }, // -y ≤ w
		{ axis: "z", sign: +1, offset: 0.02 }, // z ≤ w
		{ axis: "z", sign: -1, offset: 0.02 }, // -z ≤ w
	];

	function clipEdge4D(edge) {
		let p0 = edge.from;
		let p1 = edge.to;

		for (const { axis, sign, offset } of ndcPlanes) {
			const a0 = sign * p0[axis] - p0.w + offset;
			const a1 = sign * p1[axis] - p1.w + offset;

			// Both points outside → fully clipped
			if (a0 > 0 && a1 > 0) return null;

			// One point outside → clip
			if (a0 > 0 || a1 > 0) {
				const t = a0 / (a0 - a1);
				const interpolate = (k) => p0[k] + (p1[k] - p0[k]) * t;
				const pi = {
					x: interpolate("x"),
					y: interpolate("y"),
					z: interpolate("z"),
					w: interpolate("w"),
				};
				if (a0 > 0) p0 = pi;
				else p1 = pi;
			}
		}

		return { from: p0, to: p1 };
	}
	const interpolate = (p0, p1, t, k) => p0[k] + (p1[k] - p0[k]) * t;

	function clipPoly4D(poly, { axis, sign, offset }) {
		const result = [];

		for (let i = 0; i < poly.length; i++) {
			const j = (i + 1) % poly.length;

			const a = poly[i];
			const b = poly[j];

			const aSign = sign * a[axis] - a.w + offset;
			const bSign = sign * b[axis] - b.w + offset;

			const t = aSign / (aSign - bSign);
			const c = {
				x: interpolate(a, b, t, "x"),
				y: interpolate(a, b, t, "y"),
				z: interpolate(a, b, t, "z"),
				w: interpolate(a, b, t, "w"),
			};

			if (bSign < 0) {
				if (aSign > 0) {
					result.push(c);
				}

				result.push(b);
			} else if (aSign < 0) {
				result.push(c);
			}
		}

		return result;
	}

	function clipFace4D(polygon) {
		return ndcPlanes.reduce(clipPoly4D, polygon);
	}

	const ndcTriangleEdgePath = view(
		({ screen: { size }, geo: { vertices, edges } }) => {
			const project = [
				L.defaults({ x: 0, y: 0, z: 0, w: 1 }),
				lens3dProject,
				lens2dScale(size.x / 2, size.y / 2),
				coordPair,
			];

			const edgesWithCoords = R.map(({ from, to }) => {
				return { from: vertices[from], to: vertices[to] };
			}, edges);

			const projectedVertices = L.get(
				[
					mapIso([
						clipEdge4D,
						L.applyAt("from", project),
						L.applyAt("to", project),
						({ from, to }) => `M${from} L${to}`,
					]),
					L.inverse(L.split(" ")),
				],
				edgesWithCoords,
			);

			return projectedVertices;
		},
		combine({ screen, geo: ndcTriangle }),
	);

	const ndcTriangleFacePath = view(
		({ screen: { size }, geo: { vertices, faces } }) => {
			const project = mapIso([
				lens3dProject,
				lens2dScale(size.x / 2, size.y / 2),
				coordPair,
			]);

			const facesWithCoords = R.map(({ a, b, c }) => {
				return [vertices[a], vertices[b], vertices[c]];
			}, faces);

			const projectedVertices = L.get(
				[
					mapIso([clipFace4D, project, L.inverse(L.split(" "))]),
					L.inverse(L.split(" ")),
				],
				facesWithCoords,
			);

			return projectedVertices;
		},
		combine({ screen, geo: ndcTriangle }),
	);

	const cameraFoV = view(["fov", lensRadToDegree], camera);
	const cameraAspectRatio = view(["aspectRatio"], camera);
	const cameraOrtho = view(
		["orthogonality", L.normalize(R.clamp(0, 1))],
		camera,
	);

	const cameraEye = view(["eye"], camera);
	const cameraEyePosX = view(["tx"], cameraEye);
	const cameraEyePosY = view(["ty"], cameraEye);
	const cameraEyePosZ = view(["tz"], cameraEye);
	const cameraEyeRotX = view(["rx", lensRadToDegree], cameraEye);
	const cameraEyeRotY = view(["ry", lensRadToDegree], cameraEye);
	const cameraEyeRotZ = view(["rz", lensRadToDegree], cameraEye);
	const cameraClipNear = view([["clip", "near"]], camera);
	const cameraClipFar = view([["clip", "far"]], camera);
</script>

<div
	style="display: grid; grid-template-columns: repeat(auto-fit, minmax(20em, 1fr)); gap: 1em; padding: 1em 0"
>
	<fieldset>
		<legend>Plane Triangle</legend>
		<label class="number-picker"
			><span class="number-picker-label">Offset X:</span>
			<input
				type="range"
				class="number-picker-slider"
				{...rangeX.value}
				bind:value={offsetX.value}
			/><output class="number-picker-value ro"
				>({numf.format(offsetX.value)})</output
			>
		</label>
		<label class="number-picker"
			><span class="number-picker-label">Offset Y:</span>
			<input
				type="range"
				class="number-picker-slider"
				{...rangeY.value}
				bind:value={offsetY.value}
			/><output class="number-picker-value ro"
				>({numf.format(offsetY.value)})</output
			>
		</label>
		<label class="number-picker"
			><span class="number-picker-label">Rotation:</span>
			<input
				type="range"
				class="number-picker-slider"
				min="-360"
				max="360"
				bind:value={rotationAngle.value}
			/><output class="number-picker-value ro"
				>({numf.format(rotationAngle.value)})</output
			>
		</label>

		<label class="number-picker"
			><span class="number-picker-label">Scale X:</span>
			<input
				type="range"
				class="number-picker-slider"
				min="-4"
				max="4"
				step="0.01"
				bind:value={scaleX.value}
			/><output class="number-picker-value ro"
				>({numf.format(scaleX.value)})</output
			>
		</label>

		<label class="number-picker"
			><span class="number-picker-label">Scale Y:</span>
			<input
				type="range"
				class="number-picker-slider"
				min="-4"
				max="4"
				step="0.01"
				bind:value={scaleY.value}
			/><output class="number-picker-value ro"
				>({numf.format(scaleY.value)})</output
			>
		</label>
	</fieldset>

	<div>
		<fieldset>
			<legend>View</legend>

			<label class="number-picker"
				><span class="number-picker-label">Inset:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="-10"
					max="50"
					step="1"
					bind:value={inset.value}
				/><output class="number-picker-value ro"
					>({numf.format(inset.value)})</output
				>
			</label>
		</fieldset>
		<fieldset>
			<legend>Camera</legend>

			<label class="number-picker"
				><span class="number-picker-label">Field of View:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="1"
					max="120"
					step="1"
					bind:value={cameraFoV.value}
				/><output class="number-picker-value ro"
					>({numf.format(cameraFoV.value)})</output
				>
			</label>

			<label class="number-picker"
				><span class="number-picker-label">Aspect Ratio:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="0.1"
					max="10"
					step="0.1"
					bind:value={cameraAspectRatio.value}
				/><output class="number-picker-value ro"
					>({numf.format(cameraAspectRatio.value)})</output
				>
			</label>

			<label class="number-picker"
				><span class="number-picker-label">Orthogonality:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="0"
					max="1"
					step="0.01"
					bind:value={cameraOrtho.value}
				/><output class="number-picker-value ro"
					>({numf.format(cameraOrtho.value)})</output
				>
			</label>

			<fieldset>
				<legend>Eye</legend>

				<div
					style="display: grid; grid-template-columns: repeat(auto-fit, minmax(10em, 1fr)); gap: 1em; "
				>
					<div>
						<label class="number-picker"
							><span class="number-picker-label">Position X:</span
							>
							<input
								type="range"
								class="number-picker-slider"
								min="-100"
								max="100"
								step="0.01"
								bind:value={cameraEyePosX.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraEyePosX.value)})</output
							>
						</label>
						<label class="number-picker"
							><span class="number-picker-label">Position Y:</span
							>
							<input
								type="range"
								class="number-picker-slider"
								min="-100"
								max="100"
								step="0.01"
								bind:value={cameraEyePosY.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraEyePosY.value)})</output
							>
						</label>
						<label class="number-picker"
							><span class="number-picker-label">Position Z:</span
							>
							<input
								type="range"
								class="number-picker-slider"
								min="-100"
								max="100"
								step="0.01"
								bind:value={cameraEyePosZ.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraEyePosZ.value)})</output
							>
						</label>
					</div>
					<div>
						<label class="number-picker"
							><span class="number-picker-label">Rotation X:</span
							>
							<input
								type="range"
								class="number-picker-slider"
								min="-360"
								max="360"
								step="01"
								bind:value={cameraEyeRotX.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraEyeRotX.value)})</output
							>
						</label>
						<label class="number-picker"
							><span class="number-picker-label">Rotation Y:</span
							>
							<input
								type="range"
								class="number-picker-slider"
								min="-360"
								max="360"
								step="01"
								bind:value={cameraEyeRotY.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraEyeRotY.value)})</output
							>
						</label>
						<label class="number-picker"
							><span class="number-picker-label">Rotation Z:</span
							>
							<input
								type="range"
								class="number-picker-slider"
								min="-360"
								max="360"
								step="01"
								bind:value={cameraEyeRotZ.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraEyeRotZ.value)})</output
							>
						</label>
					</div>
				</div>
			</fieldset>

			<fieldset>
				<legend>Clip</legend>
				<label class="number-picker"
					><span class="number-picker-label">Near:</span>
					<input
						type="range"
						class="number-picker-slider"
						min="1"
						max="200"
						step="1"
						bind:value={cameraClipNear.value}
					/><output class="number-picker-value ro"
						>({numf.format(cameraClipNear.value)})</output
					>
				</label>
				<label class="number-picker"
					><span class="number-picker-label">Far:</span>
					<input
						type="range"
						class="number-picker-slider"
						min="10"
						max="1000"
						step="1"
						bind:value={cameraClipFar.value}
					/><output class="number-picker-value ro"
						>({numf.format(cameraClipFar.value)})</output
					>
				</label>
			</fieldset>
		</fieldset>
	</div>
</div>
<div class="resize">
	<svg
		bind:clientWidth={clientWidth.value}
		bind:clientHeight={clientHeight.value}
		class="viewport"
		viewBox={viewBox.value}
		preserveAspectRatio={aspectRatio.value}
	>
		<rect {...debugRect.value}>
			<title>Debug Rect</title>
		</rect>
		<polygon {...debugPolygon.value} />
		<polygon {...debugBoundsSvg.value} />
		<polygon {...debugPolygonClipped.value} />
		<circle {...debugCircle.value}>
			<title>Debug Center</title>
		</circle>
		<path
			stroke-width="1"
			vector-effect="non-scaling-stroke"
			stroke="gray"
			stroke-dasharray="5 5"
			d={ndcCubeEdgePath.value}
		/>
		<polygon
			fill="magenta"
			fill-opacity="0.2"
			stroke-width="2"
			vector-effect="non-scaling-stroke"
			stroke="magenta"
			points={ndcTriangleFacePath.value}
		/>
		<path
			stroke-width="4"
			vector-effect="non-scaling-stroke"
			stroke="white"
			stroke-dasharray="5 5"
			d={ndcTriangleEdgePath.value}
		/>
		<path fill="red" d={ndcCubeVertexPath.value} />
	</svg>
</div>

<style>
	.viewport {
		width: 100%;
		height: 100%;
		display: block;
	}

	.resize {
		resize: both;
		width: 100%;
		height: 30em;
		border: 1px solid gray;
		overflow: hidden;
	}

	path,
	polygon {
		stroke-linejoin: round;
	}
</style>
