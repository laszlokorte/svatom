<script>
	import { onMount, tick } from "svelte";
	import * as L from "partial.lenses";
	import * as G from "./generators";
	import * as R from "ramda";
	import * as U from "./utils";

	import {
		Renderer,
		Camera,
		Transform,
		Box,
		Program,
		Mesh,
		Geometry,
		Vec3,
		Mat4,
	} from "ogl";

	import {
		atom,
		view,
		read,
		combine,
		update,
		failableView,
		bindValue,
		autofocusIf,
		setValue,
	} from "./svatom.svelte.js";
	import exampleMesh, { cube2 } from "./example_mesh";
	import objCube from "./cube.obj?raw";
	import objTorus from "./torus.obj?raw";
	import objTeapot from "./teapot.obj?raw";
	import objMonkey from "./suzanne.obj?raw";
	import exampleRenew from "./Renew/example.rnw?raw";
	import exampleDoubleArrow from "./Renew/doublearrow.rnw?raw";
	import { parserAutoDetect } from "../renew/index.js";
	import {
		parse as parseObj,
		toGeo,
		renewToGeo,
		marchingCubesToGeo,
	} from "./obj.js";
	import { render } from "svelte/server";

	const objs = {
		initial: {
			label: "Initial",
			geo: cube2,
		},
		cube: { label: "Cube", data: objCube, scale: 20 },
		monkey: {
			label: "Suzanne",
			data: objMonkey,
			scale: 20,
			scaleX: -1,
			scaleY: -1,
		},
		torus: { label: "Torus", data: objTorus, scale: 5 },
		renew1: { label: "Renew #1", renew: exampleRenew, scale: 5 },
		renew2: { label: "Renew #2", renew: exampleDoubleArrow, scale: 5 },
	};

	const numf = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	});
	//const expect = (p, f) => (x) => (p(x) ? f(x) : undefined);
	const expect = (p, f) => (x) => (x === undefined ? x : f(x));

	const {
		geo = atom(exampleMesh),
		camera = atom({
			clip: {
				near: 2,
				far: 400,
			},
			aspectRatio: 1,
			fov: Math.PI / 2 / 3,
			orthogonality: 0,
			eye: {
				tx: 0,
				ty: 0,
				tz: 30,
				rx: (33 / 180) * Math.PI,
				ry: -(33 / 180) * Math.PI,
				rz: 0,
				sx: 1,
				sy: 1,
				sz: 1,
			},
			offset: {
				x: 0,
				y: -10,
				z: 130,
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

	const lerp = (a, b, t) => b * t + (1 - t) * a;

	const lens3dProjectBuilder =
		(ax1, ax2, ax3, ax4) =>
		(ortho = 0) => [
			L.applyAt(
				L.pick({ ax1, ax2, ax3, ax4 }),
				L.iso(
					expect(R.is(Object), ({ ax1, ax2, ax3, ax4 }) => ({
						ax1: ax1 / lerp(ax4, 1.5, ortho),
						ax2: ax2 / lerp(ax4, 1.5, ortho),
						ax3: ax3 / lerp(ax4, 1.5, ortho),
						ax4: ax4,
					})),
					expect(R.is(Object), ({ ax1, ax2, ax3, ax4 }) => ({
						ax1: ax1 * lerp(ax4, 1.5, ortho),
						ax2: ax2 * lerp(ax4, 1.5, ortho),
						ax3: ax3 * lerp(ax4, 1.5, ortho),
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
	const lens3dPerspective = lens3dPerspectiveBuilder("x", "y", "z", "w");
	const lens3dProject = lens3dProjectBuilder("x", "y", "z", "w");

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
				r: R.always(3),
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

	const lensAddProp = (k, v) => L.iso(R.assoc(k, v), R.dissoc(k));
	const normLength = L.normalize((o) => {
		return L.modify(L.values, R.divide(R.__, L.sum(L.values, o) || 1), o);
	});
	const worldGeo = atom(
		marchingCubesToGeo(
			(x, y, z) => Math.sqrt(x * x + y * y + z * z) - 8,
			-10,
			-10,
			-10,
			10,
			10,
			10,
			10,
		),
	);
	const sunLightDir = atom({
		pos: { x: 0, y: 0, z: -100 },
		dir: { x: -1, y: 0.8, z: 0.5 },
	});
	const sunLight = view(
		L.pickIn({
			pos: [],
			dir: [normLength],
		}),
		sunLightDir,
	);

	const worldTransform = atom({
		tx: 0,
		ty: 0,
		tz: -100,
		rx: 0,
		ry: 0,
		rz: 0,
		sx: 1.1,
		sy: 1.2,
		sz: 1,
	});
	const meshColor = atom("#5fdfb4");
	const meshColorGL = view(
		L.reread((hex) => {
			const digits = hex.slice(1);
			const int = parseInt(digits, 16);
			return [
				(int >> 16) & 0xff,
				(int >> 8) & 0xff,
				(int << 0) & 0xff,
			].map((x) => x / 255);
		}),
		meshColor,
	);

	const lensMatrixTransform = (transform) => [
		lens3dScale(transform.sx, transform.sy, transform.sz),
		lens3dRotateX(transform.rx),
		lens3dRotateY(transform.ry),
		lens3dRotateZ(transform.rz),
		lens3dTranslate(transform.tx, transform.ty, transform.tz),
	];

	const fastMatrixTransform = (v, transform) => {
		const v0 = {
			x: v.x * transform.sx,
			y: v.y * transform.sy,
			z: v.z * transform.sz,
		};

		const v1 = {
			x: v0.x,
			y: v0.y * Math.cos(transform.rx) - v0.z * Math.sin(transform.rx),
			z: v0.y * Math.sin(transform.rx) + v0.z * Math.cos(transform.rx),
		};

		const v2 = {
			x: v1.x * Math.cos(transform.ry) - v1.z * Math.sin(transform.ry),
			y: v1.y,
			z: v1.x * Math.sin(transform.ry) + v1.z * Math.cos(transform.ry),
		};

		const v3 = {
			x: v2.x * Math.cos(transform.rz) - v2.y * Math.sin(transform.rz),
			y: v2.x * Math.sin(transform.rz) + v2.y * Math.cos(transform.rz),
			z: v2.z,
		};

		return {
			x: v3.x + transform.tx,
			y: v3.y + transform.ty,
			z: v3.z + transform.tz,
		};
	};

	const cameraTransform = (camera, screenAspect, translation = true) =>
		L.compose(
			L.inverse(
				L.compose(
					lens3dScale(camera.eye.sx, camera.eye.sy, camera.eye.sz),
					lens3dTranslate(
						camera.offset.x,
						camera.offset.y,
						camera.offset.z,
					),
					lens3dRotateX(camera.eye.rx),
					lens3dRotateY(camera.eye.ry),
					lens3dRotateZ(camera.eye.rz),
					lens3dTranslate(
						-camera.offset.x,
						-camera.offset.y,
						-camera.offset.z,
					),
					translation
						? lens3dTranslate(
								camera.eye.tx,
								camera.eye.ty,
								camera.eye.tz,
							)
						: L.identity,
				),
			),
			lensAddProp("w", 1),
			lens3dPerspective(
				camera.fov,
				camera.aspectRatio * screenAspect,
				camera.clip.near,
				camera.clip.far,
			),
		);

	const fastCameraTransform = (v, camera, screenAspect) => {
		const v5 = {
			x: v.x + camera.offset.x - camera.eye.tx,
			y: v.y + camera.offset.y - camera.eye.ty,
			z: v.z + camera.offset.z - camera.eye.tz,
		};

		const v4 = {
			x:
				v5.x * Math.cos(-camera.eye.rz) -
				v5.y * Math.sin(-camera.eye.rz),
			y:
				v5.x * Math.sin(-camera.eye.rz) +
				v5.y * Math.cos(-camera.eye.rz),
			z: v5.z,
		};

		const v3 = {
			x:
				v4.x * Math.cos(-camera.eye.ry) -
				v4.z * Math.sin(-camera.eye.ry),
			y: v4.y,
			z:
				v4.x * Math.sin(-camera.eye.ry) +
				v4.z * Math.cos(-camera.eye.ry),
		};

		const v2 = {
			x: v3.x,
			y:
				v3.y * Math.cos(-camera.eye.rx) -
				v3.z * Math.sin(-camera.eye.rx),
			z:
				v3.y * Math.sin(-camera.eye.rx) +
				v3.z * Math.cos(-camera.eye.rx),
		};

		const v1 = {
			x: v2.x - camera.offset.x,
			y: v2.y - camera.offset.y,
			z: v2.z - camera.offset.z,
		};

		const v0 = {
			x: v1.x / camera.eye.sx,
			y: v1.y / camera.eye.sy,
			z: v1.z / camera.eye.sz,
		};

		const tanfov = 1 / Math.tan(camera.fov / 2);
		const fpn =
			-(camera.clip.far + camera.clip.near) /
			(camera.clip.far - camera.clip.near);
		const ftn =
			-(2 * camera.clip.far * camera.clip.near) /
			(camera.clip.far - camera.clip.near);
		const aspect = camera.aspectRatio * screenAspect;

		const r = {
			x: v0.x * tanfov * aspect,
			y: v0.y * tanfov,
			z: v0.z * fpn + ftn,
			w: -v0.z,
		};
		return r;
	};

	const ratio = (a, b) => [
		L.pick({ a, b }),
		L.choose(({ a }) => ["b", L.divide(a)]),
	];

	const screenAspect = view(["size", ratio("x", "y")], screen);
	const screenSize = view(["size", L.props("x", "y")], screen);

	const ndcGeo = view(
		L.choose(({ camera, transform, screenAspect }) => {
			return [
				"geo",
				L.applyAt("vertices", [
					mapIso([
						lensMatrixTransform(transform),
						cameraTransform(camera, screenAspect),
					]),
				]),
			];
		}),
		combine({
			geo: worldGeo,
			transform: worldTransform,
			camera,
			screenAspect,
		}),
	);

	const ndcGeoFast = view(
		({ geo, camera, transform, screenAspect }) => {
			const t = L.compose(cameraTransform(camera, screenAspect));

			return {
				...geo,
				vertices: geo.vertices.map((v) => {
					const r = fastCameraTransform(
						fastMatrixTransform(v, transform),
						camera,
						screenAspect,
					);

					return r;
				}),
			};
		},
		combine({
			geo: worldGeo,
			transform: worldTransform,
			camera,
			screenAspect,
		}),
	);

	const ndcLight = view(
		L.choose(({ camera, transform, screenAspect }) => {
			return [
				"light",
				L.applyAt(
					L.values,
					cameraTransform(camera, screenAspect, false),
				),
			];
		}),
		combine({
			light: sunLight,
			camera,
			screenAspect,
		}),
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

	const ndcCubeVertices = view(
		L.choose(
			({
				screen: { size },
				cube: { vertices },
				camera: { orthogonality },
			}) => {
				return [
					"cube",
					"vertices",
					mapIso([
						lens3dProject(orthogonality),
						lens2dScale(size.x / 2, size.y / 2),
					]),
				];
			},
		),
		combine({ screen, cube: ndcCube, camera }),
	);

	const ndcCubeVertexPath = view(coordPathString(3), ndcCubeVertices);

	const ndcCubeEdgePath = view(
		({ geo: { edges }, projectedVertices }) => {
			return R.join(
				" ",
				R.map(
					({ from, to }) =>
						`M${L.get(coordPair, projectedVertices[from])} L ${L.get(coordPair, projectedVertices[to])}`,
					edges,
				),
			);
		},
		combine({ projectedVertices: ndcCubeVertices, geo: ndcCube }),
	);

	const ndcPlanes = [
		{ axis: "x", sign: +1, offset: 0.2 }, // x ≤ w
		{ axis: "x", sign: -1, offset: 0.2 }, // -x ≤ w
		{ axis: "y", sign: +1, offset: 0.2 }, // y ≤ w
		{ axis: "y", sign: -1, offset: 0.2 }, // -y ≤ w
		{ axis: "z", sign: +1, offset: 0.2 }, // z ≤ w
		{ axis: "z", sign: -1, offset: 0.2 }, // -z ≤ w
	];

	const interpolate = (p0, p1, t, k) => p0[k] + (p1[k] - p0[k]) * t;

	const polygonClipper = (poly, { axis, sign, offset }) => {
		const result = [];

		const length = poly.length;

		for (let i = 0; i < length; i++) {
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

			if (bSign <= 0) {
				if (aSign >= 0) {
					result.push(c);
				}

				result.push(b);
			} else if (aSign <= 0) {
				result.push(c);
			}
		}

		return result;
	};

	const edgeClipper = (poly, { axis, sign, offset }) => {
		const result = [];

		const length = poly.length;

		for (let i = 0; i < length; i++) {
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

			if (aSign <= 0) {
				result.push(a);
			} else if (aSign > 0 !== bSign > 0) {
				result.push(c);
			}
		}

		return result;
	};

	const clipFace4D = (clipper) => (polygon) => {
		return ndcPlanes.reduce(clipper, polygon);
	};

	const clipVertex4D = (point) => {
		return R.all(({ axis, sign, offset }) => {
			return sign * point[axis] - point.w + offset < 0;
		}, ndcPlanes);
	};

	const ndcGeoEdgePaths = view(
		L.choose(
			({
				screen: { size },
				geo: { vertices, edges },
				camera: { orthogonality },
			}) => {
				const project = L.compose(
					lens3dProject(orthogonality),
					lens2dScale(size.x / 2, size.y / 2),
				);

				return [
					"geo",
					"edges",
					L.applyAt(
						L.compose(L.elems, "vertices", L.elems),
						(i) => vertices[i],
					),
					mapIso(
						L.applyAt(
							"vertices",
							L.compose(
								clipFace4D(edgeClipper),
								L.applyAt(L.elems, project),
							),
						),
					),
				];
			},
		),
		combine({ screen, geo: ndcGeo, camera }),
	);

	const lightRay = view(
		L.choose(({ screen: { size }, camera: { orthogonality } }) => {
			const project = L.compose(
				lens3dProject(orthogonality),
				lens2dScale(size.x / 2, size.y / 2),
			);

			return ["light", L.applyAt(L.values, project)];
		}),
		combine({ screen, light: ndcLight, camera }),
	);

	const isClockwise = (points) => {
		return R.pipe(
			R.aperture(3),
			R.map(
				([a, b, c]) =>
					(b.y - a.y) * (c.x - b.x) - (c.y - b.y) * (b.x - a.x) >= 0,
			),
			R.all(R.identity),
		)(points);
	};

	const putProp = (prop, fn) =>
		L.lens(
			(obj) => ({
				...obj,
				[prop]: fn(obj),
			}),
			({ [prop]: _, ...rest }) => ({
				...rest,
			}),
		);

	const ndcGeoFacePaths = view(
		L.choose(
			({
				screen: { size },
				geo: { vertices, faces },
				camera: { orthogonality },
			}) => {
				const project = mapIso(
					L.compose(
						lens3dProject(orthogonality),
						lens2dScale(size.x / 2, size.y / 2),
					),
				);

				return [
					"geo",
					"faces",
					L.applyAt(
						L.compose(L.elems, "vertices", L.elems),
						(i) => vertices[i],
					),
					mapIso(
						L.applyAt(
							"vertices",
							L.compose(
								clipFace4D(polygonClipper),
								project,
								L.pick({
									clockwise: isClockwise,
									points: [],
								}),
							),
						),
					),
				];
			},
		),
		combine({ screen, geo: ndcGeo, camera }),
	);

	const ndcGeoMaskPaths = view(
		L.choose(
			({
				screen: { size },
				geo: { vertices },
				camera: { orthogonality },
			}) => {
				const project = mapIso(
					L.compose(
						lens3dProject(orthogonality),
						lens2dScale(size.x / 2, size.y / 2),
					),
				);

				return [
					"geo",
					"masks",
					L.applyAt(
						L.compose(L.elems, "vertices", L.elems),
						(i) => vertices[i],
					),
					mapIso(
						L.applyAt(
							"vertices",
							L.compose(
								clipFace4D(polygonClipper),
								project,
								L.pick({
									clockwise: isClockwise,
									points: [],
								}),
							),
						),
					),
				];
			},
		),
		combine({ screen, geo: ndcGeo, camera }),
	);

	const ndcGeoVertices = view(
		L.choose(({ screen: { size }, camera: { orthogonality } }) => {
			const project = L.compose(
				lens3dProject(orthogonality),
				lens2dScale(size.x / 2, size.y / 2),
			);

			return [
				"geo",
				"vertices",
				R.map((o) => ({ ...o, clipped: !clipVertex4D(o) })),
				mapIso(project),
			];
		}),
		combine({ screen, geo: ndcGeo, camera }),
	);

	const ndcGeoLabels = view(
		L.choose(
			({
				screen: { size },
				geo: { vertices },
				camera: { orthogonality },
			}) => {
				const project = L.compose(
					lens3dProject(orthogonality),
					lens2dScale(size.x / 2, size.y / 2),
				);

				return [
					"geo",
					"labels",
					mapIso([
						L.applyAt(
							"vertex",
							L.compose(
								(i) => vertices[i],
								(o) => ({ ...o, clipped: !clipVertex4D(o) }),
								project,
								L.props("x", "y", "clipped"),
							),
						),
					]),
				];
			},
		),
		combine({ screen, geo: ndcGeo, camera }),
	);

	const cameraFoV = view(["fov", lensRadToDegree], camera);
	const cameraAspectRatio = view(["aspectRatio"], camera);
	const cameraOrtho = view(
		["orthogonality", L.normalize(R.clamp(0, 1))],
		camera,
	);

	const cameraEye = view(["eye"], camera);
	const cameraOffset = view(["offset"], camera);
	const cameraEyePosX = view(["tx"], cameraEye);
	const cameraEyePosY = view(["ty"], cameraEye);
	const cameraEyePosZ = view(["tz"], cameraEye);
	const cameraOffsetX = view(["x"], cameraOffset);
	const cameraOffsetY = view(["y"], cameraOffset);
	const cameraOffsetZ = view(["z"], cameraOffset);
	const cameraEyeRotX = view(["rx", lensRadToDegree], cameraEye);
	const cameraEyeRotY = view(["ry", lensRadToDegree], cameraEye);
	const cameraEyeRotZ = view(["rz", lensRadToDegree], cameraEye);
	const cameraClipNear = view(
		[["clip", L.choose(({ far }) => ["near", L.normalize(R.min(far))])]],
		camera,
	);
	const cameraClipFar = view(
		[["clip", L.choose(({ near }) => ["far", L.normalize(R.max(near))])]],
		camera,
	);

	const worldTransformRotX = view(["rx", lensRadToDegree], worldTransform);
	const worldTransformRotY = view(["ry", lensRadToDegree], worldTransform);
	const worldTransformRotZ = view(["rz", lensRadToDegree], worldTransform);

	const worldTransformPosX = view(["tx"], worldTransform);
	const worldTransformPosY = view(["ty"], worldTransform);
	const worldTransformPosZ = view(["tz"], worldTransform);

	const worldTransformScaleX = view(["sx"], worldTransform);
	const worldTransformScaleY = view(["sy"], worldTransform);
	const worldTransformScaleZ = view(["sz"], worldTransform);

	const worldTransformMatrix = view(
		L.reread(({ rx, ry, rz, tx, ty, tz, sx, sy, sz }) => [
			[sx, 0, 0, tx, 0, sy, 0, ty, 0, 0, sz, tz, 0, 0, 0, 1],
		]),
		worldTransform,
	);

	const wrapRange = (a, b) => {
		const range_width = b - a;
		return L.normalize(
			(x) => ((((x - a) % range_width) + range_width) % range_width) + a,
		);
	};

	const objectPointerRotate = view(
		L.pick({
			dx: L.cond(
				[
					R.pipe(R.prop("rx"), Math.abs, R.lt(Math.PI / 2)),
					[
						"ry",
						wrapRange(-Math.PI, Math.PI),
						lensRadToDegree,
						L.setter((a, b) => b + a / 1.5),
					],
				],
				[
					[
						"ry",
						wrapRange(-Math.PI, Math.PI),
						lensRadToDegree,
						L.setter((a, b) => b - a / 1.5),
					],
				],
			),
			dy: [
				"rx",
				wrapRange(-Math.PI, Math.PI),
				lensRadToDegree,
				L.setter((a, b) => b - a / 1.5),
			],
		}),
		worldTransform,
	);

	const cameraFoVWheel = view(
		[
			L.normalize(R.clamp(0.001, 180)),
			L.setter((a, b) => b * Math.exp(a / 1000)),
		],
		cameraFoV,
	);

	const eyePointerRotate = view(
		L.pick({
			dx: [
				"ry",
				wrapRange(-Math.PI, Math.PI),
				lensRadToDegree,
				L.setter((a, b) => b + a / 3),
			],
			dy: [
				"rx",
				wrapRange(-Math.PI, Math.PI),
				lensRadToDegree,
				L.setter((a, b) => b + a / 3),
			],
		}),
		cameraEye,
	);

	const eyePointerPan = view(
		L.pick({
			dx: ["tx", L.setter((a, b) => b - a / 10)],
			dy: ["ty", L.setter((a, b) => b - a / 10)],
		}),
		cameraEye,
	);

	const eyePointerWalk = view(
		L.pick({
			dx: [
				"tx",
				wrapRange(-Math.PI, Math.PI),
				lensRadToDegree,
				L.setter((a, b) => b),
			],
			dy: [
				"tz",
				wrapRange(-Math.PI, Math.PI),
				lensRadToDegree,
				L.setter((a, b) => b - a * 2),
			],
		}),
		cameraEye,
	);
	const eyeArrowWalk = view(
		L.pick({
			dx: ["tx", L.setter((a, b) => b + a * 2)],
			dy: ["tz", L.setter((a, b) => b - a * 2)],
		}),
		cameraEye,
	);

	const pointer = atom({ x: 0, y: 0, dx: 0, dy: 0 });
	const pointerPos = view(
		L.lens(
			({ x, y }) => ({ clientX: x, clientY: y }),
			({ clientX: x, clientY: y }, o) => ({
				x,
				y,
				dx: x - o.x,
				dy: y - o.y,
			}),
		),
		pointer,
	);
	const pointerDelta = view(L.props("dx", "dy"), pointer);

	const arrowKeys = atom({
		Shift: false,
		ArrowLeft: false,
		ArrowRight: false,
		ArrowDown: false,
		ArrowUp: false,
	});

	const arrowDirection = view((map) => {
		const dx = (map.ArrowLeft ? -1 : 0) + (map.ArrowRight ? 1 : 0);
		const dy = (map.ArrowDown ? -1 : 0) + (map.ArrowUp ? 1 : 0);
		const len = Math.hypot(dy, dx);

		return {
			dx: (len ? dx / len : 0) * (map.Shift ? 3 : 1),
			dy: (len ? dy / len : 0) * (map.Shift ? 3 : 1),
		};
	}, arrowKeys);

	const keyDown = view(
		L.lens(
			(map) => {
				return Object.entries(map)
					.filter(([k, v]) => v)
					.map(([k, v]) => k);
			},
			(key, map) => {
				return Object.prototype.hasOwnProperty.call(map, key)
					? { ...map, [key]: true }
					: map;
			},
		),
		arrowKeys,
	);
	const keyUp = view(
		L.lens(
			(map) => {
				return Object.entries(map)
					.filter(([k, v]) => !v)
					.map(([k, v]) => k);
			},
			(key, map) => {
				return Object.prototype.hasOwnProperty.call(map, key)
					? { ...map, [key]: false }
					: map;
			},
		),
		arrowKeys,
	);

	let raf = null;
	function frame(dx, dy, time) {
		if (raf) {
			raf = requestAnimationFrame(frame.bind(null, dx, dy));

			eyeArrowWalk.value = { dx, dy };
		}
	}

	$effect(() => {
		const { dx, dy } = arrowDirection.value;

		if (dx || dy) {
			raf = requestAnimationFrame(frame.bind(null, dx, dy));
		}

		return () => {
			cancelAnimationFrame(raf);
		};
	});

	const allProps = (val) =>
		L.lens(R.pipe(R.values, R.all(R.equals(val))), (v, o) =>
			v ? R.map(R.always(val), o) : R.map(R.always(!val), o),
		);

	const backfaceCull = atom({
		cw: false,
		ccw: true,
	});
	const hideCW = view("cw", backfaceCull);
	const hideCCW = view("ccw", backfaceCull);
	const hideNone = view(allProps(false), backfaceCull);
	const hideAll = view(allProps(true), backfaceCull);

	const debugLabels = atom({
		svg: true,
		canvas: true,
		edge: false,
		face: false,
		vertex: false,
		ndcCube: false,
		screenTriangle: false,
	});
	const showSvg = view("svg", debugLabels);
	const showCanvas = view("canvas", debugLabels);
	const labelFace = view("face", debugLabels);
	const labelVertex = view("vertex", debugLabels);
	const labelEdge = view("edge", debugLabels);
	const showNDCCube = view("ndcCube", debugLabels);
	const screenTriangle = view("screenTriangle", debugLabels);
	const penSize = atom({
		fg: 2,
		bg: 1,
		circleRad: 0,
		fontSize: 12,
	});

	const strokeWidthBg = view("bg", penSize);
	const strokeWidthFg = view("fg", penSize);
	const circleRad = view("circleRad", penSize);
	const fontSize = view("fontSize", penSize);

	const geoJson = view(L.inverse(L.json({ space: "  " })), worldGeo);

	const clipEdge = clipFace4D(edgeClipper);
	const clipFace = clipFace4D(polygonClipper);
	const fastProject = (v, camera, screen) => {
		return {
			x:
				((v.x / lerp(v.w, 1.5, camera.orthogonality)) * screen.size.x) /
				2,
			y:
				((v.y / lerp(v.w, 1.5, camera.orthogonality)) * screen.size.y) /
				2,
			z: v.z / lerp(v.w, 1.5, camera.orthogonality),
			w: 1,
		};
	};
	const ndcGeoEdgePathsFast = view(
		({ ndcGeo, camera, screen, screenAspect }) => {
			const vertices = ndcGeo.vertices;
			return ndcGeo.edges.map((edge) => {
				const vs = clipEdge(
					edge.vertices.map((vi) => vertices[vi]),
				).map((v) => fastProject(v, camera, screen));
				return {
					attrs: edge.attrs,
					frontFacing: edge.faces.some((fi) => {
						const face = ndcGeo.faces[fi];
						return isClockwise(
							clipFace(
								face.vertices.map((vi) => vertices[vi]),
							).map((v) => fastProject(v, camera, screen)),
						);
					}),
					path: "M" + vs.map((c) => c.x + "," + c.y).join(" L"),
					center: vs.length
						? vs.reduce(
								({ x: ax, y: ay }, { x, y }) => ({
									x: ax + x / vs.length,
									y: ay + y / vs.length,
								}),
								{ x: 0, y: 0 },
							)
						: { "data-count": 0 },
				};
			});
		},
		combine({
			ndcGeo: ndcGeoFast,
			camera,
			screen,
			screenAspect,
		}),
	);
	const ndcGeoFacePathsFast = view(
		({ ndcGeo, camera, screen, screenAspect }) => {
			const vertices = ndcGeo.vertices;
			return ndcGeo.faces.map((face) => {
				const vs = clipFace(
					face.vertices.map((vi) => vertices[vi]),
				).map((v) => fastProject(v, camera, screen));
				return {
					attrs: face.attrs,
					clockwise: isClockwise(vs),
					path: vs.map((c) => c.x + "," + c.y).join(","),
					center: vs.length
						? vs.reduce(
								({ x: ax, y: ay }, { x, y }) => ({
									x: ax + x / vs.length,
									y: ay + y / vs.length,
								}),
								{ x: 0, y: 0 },
							)
						: { "data-count": 0 },
				};
			});
		},
		combine({
			ndcGeo: ndcGeoFast,
			camera,
			screen,
			screenAspect,
		}),
	);
	const ndcGeoMaskPathsFast = view(
		({ ndcGeo, camera, screen, screenAspect }) => {
			const vertices = ndcGeo.vertices;
			return (ndcGeo.masks ?? []).map((face) => {
				const vs = clipFace(
					face.vertices.map((vi) => vertices[vi]),
				).map((v) => fastProject(v, camera, screen));
				return {
					attrs: face.attrs,
					clockwise: isClockwise(vs),
					path: vs.map((c) => c.x + "," + c.y).join(","),
				};
			});
		},
		combine({
			ndcGeo: ndcGeoFast,
			camera,
			screen,
			screenAspect,
		}),
	);
	const ndcGeoVerticesFast = view(
		({ ndcGeo, camera, screen, screenAspect }) => {
			return ndcGeo.vertices.map((v) => ({
				...fastProject(v, camera, screen),
				clipped: !clipVertex4D(v),
			}));
		},
		combine({
			ndcGeo: ndcGeoFast,
			worldTransform,
			camera,
			screen,
			screenAspect,
		}),
	);
	const ndcGeoLabelsFast = view(
		({ ndcGeo, camera, screen, screenAspect }) => {
			return ndcGeo.labels.map((v) => ({
				...v,
				vertex: fastProject(ndcGeo.vertices[v.vertex], camera, screen),
				clipped: !clipVertex4D(ndcGeo.vertices[v.vertex]),
				lines: Array.isArray(v.text) ? v.text : v.text.split("\n"),
			}));
		},
		combine({
			ndcGeo: ndcGeoFast,
			camera,
			screen,
			screenAspect,
		}),
	);

	const canvasRoot = atom(undefined);

	class CustomGeo extends Geometry {
		constructor(gl, geo) {
			// 1. Extract and flatten vertices
			const positions = new Float32Array(
				geo.vertices.flatMap((v) => [v.x, -v.y, v.z]),
			);

			// 2. Convert faces to triangles (handle quads)
			const indices = [];

			for (const face of geo.faces) {
				const v = face.vertices;
				for (let i = 2; i < v.length; i++) {
					indices.push(v[0], v[i - 1], v[i]);
				}
			}

			const indexArray = new Uint16Array(indices);

			super(gl, {
				position: { size: 3, data: positions },
				index: { data: indexArray },
			});
		}
	}

	onMount(() => {
		const renderer = new Renderer({
			alpha: true,
		});
		const gl = renderer.gl;

		gl.clearColor(1, 1, 1, 1);

		const cameraOffsetTransform = new Transform();
		const camera = new Camera(gl);

		camera.setParent(cameraOffsetTransform);

		$effect(() => {
			renderer.setSize(screenSize.value.x, screenSize.value.y);
			camera.perspective({ aspect: 1 / screenAspect.value });
		});

		$effect(() => {
			if (canvasRoot.value) {
				gl.canvas.classList.add("viewport");
				canvasRoot.value.appendChild(gl.canvas);
			}
		});

		const scene = new Transform();

		const geometry = new CustomGeo(gl, worldGeo.value);

		const program = new Program(gl, {
			vertex: /* glsl */ `
			precision mediump float;

            attribute vec3 position;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
			fragment: /* glsl */ `
			precision mediump float;
            uniform vec3 uMeshColor;

            void main() {
                gl_FragColor = vec4(uMeshColor,0.2);
            }
        `,
			uniforms: {
				uMeshColor: { value: new Vec3(0, 0, 0) },
			},
		});

		const mesh = new Mesh(gl, { geometry, program });
		mesh.setParent(scene);

		$effect(() => {
			mesh.rotation.x = -L.getInverse(
				lensRadToDegree,
				worldTransformRotX.value,
			);
			mesh.rotation.y = -L.getInverse(
				lensRadToDegree,
				worldTransformRotY.value,
			);
			mesh.rotation.z = -L.getInverse(
				lensRadToDegree,
				worldTransformRotZ.value,
			);
			mesh.position.x = worldTransformPosX.value;
			mesh.position.y = worldTransformPosY.value;
			mesh.position.z = worldTransformPosZ.value;
			mesh.scale.x = worldTransformScaleX.value;
			mesh.scale.y = worldTransformScaleY.value;
			mesh.scale.z = worldTransformScaleZ.value;
		});

		$effect(() => {
			mesh.geometry = new CustomGeo(gl, worldGeo.value);
		});

		$effect(() => {
			cameraOffsetTransform.position.x =
				cameraEyePosX.value - cameraOffsetX.value;
			cameraOffsetTransform.position.y =
				-cameraEyePosY.value + cameraOffsetY.value;
			cameraOffsetTransform.position.z =
				cameraEyePosZ.value - cameraOffsetZ.value;

			camera.position.x = +cameraOffsetX.value;
			camera.position.y = -cameraOffsetY.value;
			camera.position.z = +cameraOffsetZ.value;

			cameraOffsetTransform.rotation.x = -L.getInverse(
				lensRadToDegree,
				cameraEyeRotX.value,
			);
			cameraOffsetTransform.rotation.y = -L.getInverse(
				lensRadToDegree,
				cameraEyeRotY.value,
			);
			cameraOffsetTransform.rotation.z = -L.getInverse(
				lensRadToDegree,
				cameraEyeRotZ.value,
			);

			camera.perspective({
				near: cameraClipNear.value,
				far: cameraClipFar.value,
				fov: cameraFoV.value,
			});

			cameraOffsetTransform.updateMatrixWorld();
		});

		$effect(() => {
			program.uniforms.uMeshColor.value.set(...meshColorGL.value);
		});

		let raf = requestAnimationFrame(update);
		function update(t) {
			renderer.render({ scene, camera });

			raf = requestAnimationFrame(update);
		}

		return () => {
			if (raf) {
				cancelAnimationFrame(raf);
			}
		};
	});
</script>

<div
	style="display: grid; grid-template-columns: repeat(auto-fit, minmax(20em, 1fr)); gap: 1em; padding: 1em 0"
>
	<div>
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

		<fieldset>
			<legend>Object</legend>

			<div
				style="display: grid; grid-template-columns: repeat(auto-fit, minmax(10em, 1fr)); gap: 1em; "
			>
				<div>
					<label class="number-picker"
						><span class="number-picker-label">Position X:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-150"
							max="150"
							step="0.001"
							bind:value={worldTransformPosX.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformPosX.value)})</output
						>
					</label>
					<label class="number-picker"
						><span class="number-picker-label">Position Y:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-150"
							max="150"
							step="0.001"
							bind:value={worldTransformPosY.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformPosY.value)})</output
						>
					</label>
					<label class="number-picker"
						><span class="number-picker-label">Position Z:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-150"
							max="150"
							step="0.001"
							bind:value={worldTransformPosZ.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformPosZ.value)})</output
						>
					</label>
				</div>
				<div>
					<label class="number-picker"
						><span class="number-picker-label">Rotation X:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-180"
							max="180"
							step="1"
							bind:value={worldTransformRotX.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformRotX.value)})</output
						>
					</label>
					<label class="number-picker"
						><span class="number-picker-label">Rotation Y:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-180"
							max="180"
							step="1"
							bind:value={worldTransformRotY.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformRotY.value)})</output
						>
					</label>
					<label class="number-picker"
						><span class="number-picker-label">Rotation Z:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-180"
							max="180"
							step="1"
							bind:value={worldTransformRotZ.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformRotZ.value)})</output
						>
					</label>
				</div>
				<div>
					<label class="number-picker"
						><span class="number-picker-label">Scale X:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-5"
							max="5"
							step="0.1"
							bind:value={worldTransformScaleX.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformScaleX.value)})</output
						>
					</label>
					<label class="number-picker"
						><span class="number-picker-label">Scale Y:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-5"
							max="5"
							step="0.1"
							bind:value={worldTransformScaleY.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformScaleY.value)})</output
						>
					</label>
					<label class="number-picker"
						><span class="number-picker-label">Scale Z:</span>
						<input
							type="range"
							class="number-picker-slider"
							min="-5"
							max="5"
							step="0.1"
							bind:value={worldTransformScaleZ.value}
						/><output class="number-picker-value ro"
							>({numf.format(worldTransformScaleZ.value)})</output
						>
					</label>
				</div>
				<div>
					<label>
						Color:
						<input type="color" bind:value={meshColor.value} />
					</label>
				</div>
			</div>
		</fieldset>
		<fieldset>
			<legend>Debug Labels</legend>

			<label
				><input type="checkbox" bind:checked={showSvg.value} /> SVG</label
			>
			<label
				><input type="checkbox" bind:checked={showCanvas.value} /> Canvas</label
			>
			<label
				><input type="checkbox" bind:checked={labelFace.value} /> Face</label
			>
			<label
				><input type="checkbox" bind:checked={labelVertex.value} /> Vertex</label
			>
			<label
				><input type="checkbox" bind:checked={labelEdge.value} /> Edge</label
			>
			<label
				><input type="checkbox" bind:checked={showNDCCube.value} /> NDC Cube</label
			>
			<label
				><input type="checkbox" bind:checked={screenTriangle.value} /> Clipped
				Triangle</label
			>
		</fieldset>
		<fieldset>
			<legend>Drawing Style</legend>
			<label class="number-picker"
				><span class="number-picker-label">Stroke Fg:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="0"
					max="10"
					step="0.1"
					bind:value={strokeWidthFg.value}
				/><output class="number-picker-value ro"
					>({numf.format(strokeWidthFg.value)})</output
				>
			</label>

			<label class="number-picker"
				><span class="number-picker-label">Stroke Bg:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="0"
					max="10"
					step="0.1"
					bind:value={strokeWidthBg.value}
				/><output class="number-picker-value ro"
					>({numf.format(strokeWidthBg.value)})</output
				>
			</label>
			<label class="number-picker"
				><span class="number-picker-label">Vertex Size:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="0"
					max="20"
					step="0.1"
					bind:value={circleRad.value}
				/><output class="number-picker-value ro"
					>({numf.format(circleRad.value)})</output
				>
			</label>
			<label class="number-picker"
				><span class="number-picker-label">Font Size:</span>
				<input
					type="range"
					class="number-picker-slider"
					min="0"
					max="20"
					step="0.1"
					bind:value={fontSize.value}
				/><output class="number-picker-value ro"
					>({numf.format(fontSize.value)})</output
				>
			</label>
		</fieldset>
	</div>

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
								step="0.001"
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
								step="0.001"
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
								step="0.001"
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
								min="-180"
								max="180"
								step="1"
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
								min="-180"
								max="180"
								step="1"
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
								min="-180"
								max="180"
								step="1"
								bind:value={cameraEyeRotZ.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraEyeRotZ.value)})</output
							>
						</label>
					</div>
					<div>
						<label class="number-picker"
							><span class="number-picker-label">Offset X:</span>
							<input
								type="range"
								class="number-picker-slider"
								min="-100"
								max="100"
								step="0.001"
								bind:value={cameraOffsetX.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraOffsetX.value)})</output
							>
						</label>
						<label class="number-picker"
							><span class="number-picker-label">Offset Y:</span>
							<input
								type="range"
								class="number-picker-slider"
								min="-100"
								max="100"
								step="0.001"
								bind:value={cameraOffsetY.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraOffsetY.value)})</output
							>
						</label>
						<label class="number-picker"
							><span class="number-picker-label">Offset Z:</span>
							<input
								type="range"
								class="number-picker-slider"
								min="-100"
								max="100"
								step="0.001"
								bind:value={cameraOffsetZ.value}
							/><output class="number-picker-value ro"
								>({numf.format(cameraOffsetZ.value)})</output
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
						max="400"
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
						min="1"
						max="400"
						step="1"
						bind:value={cameraClipFar.value}
					/><output class="number-picker-value ro"
						>({numf.format(cameraClipFar.value)})</output
					>
				</label>
			</fieldset>
			<fieldset>
				<legend>Backface</legend>

				<label
					><input type="checkbox" bind:checked={hideCW.value} /> Hide Clockwise
					Faces</label
				>
				<label
					><input type="checkbox" bind:checked={hideCCW.value} /> Hide
					Counter-Clockwise Faces</label
				>
				<button onclick={setValue(hideNone)} value="true">
					Show All</button
				>
				<button onclick={setValue(hideAll)} value="true">
					Hide All</button
				>
			</fieldset>
		</fieldset>

		<fieldset>
			<legend>Load Example model</legend>

			<div>
				<select
					size="10"
					onchange={(evt) => {
						const obj = objs[evt.currentTarget.value];
						if (obj.geo) {
							worldGeo.value = obj.geo;
						} else if (obj.data) {
							worldGeo.value = obj.geo = toGeo(
								parseObj(obj.data),
								obj.scale ?? 1,
								obj.reverse ?? true,
								obj.scaleX ?? 1,
								obj.scaleY ?? 1,
								obj.scaleZ ?? 1,
							);
						} else if (obj.renew) {
							worldGeo.value = obj.geo = renewToGeo(
								parserAutoDetect(obj.renew, false),
								50,
								8,
							);
						}
					}}
				>
					{#each Object.entries(objs) as [k, v] (k)}
						<option value={k}>{v.label}</option>
					{/each}
				</select>
			</div>
		</fieldset>
	</div>
</div>
<div class="resize">
	{#if showCanvas.value}
		<div class="viewportContainer" bind:this={canvasRoot.value}></div>
	{/if}
	<svg
		data-hide-cw={hideCW.value}
		data-hide-ccw={hideCCW.value}
		bind:clientWidth={clientWidth.value}
		bind:clientHeight={clientHeight.value}
		tabindex="-1"
		class="viewport vector"
		viewBox={viewBox.value}
		preserveAspectRatio={aspectRatio.value}
		onpointerdown={(evt) => {
			if (evt.isPrimary) {
				evt.preventDefault();
				evt.currentTarget.focus();
				evt.currentTarget.setPointerCapture(evt.pointerId);
				pointerPos.value = evt;
			}
		}}
		onpointermove={(evt) => {
			if (
				evt.isPrimary &&
				evt.currentTarget.hasPointerCapture(evt.pointerId)
			) {
				pointerPos.value = evt;
				if (evt.ctrlKey) {
					objectPointerRotate.value = pointerDelta.value;
				} else if (evt.shiftKey) {
					eyePointerPan.value = pointerDelta.value;
				} else {
					eyePointerRotate.value = pointerDelta.value;
				}
			}
		}}
		onkeydown={(evt) => {
			evt.preventDefault();
			keyDown.value = evt.key;
		}}
		onkeyup={(evt) => {
			evt.preventDefault();
			keyUp.value = evt.key;
		}}
		onwheel={(evt) => {
			evt.preventDefault();
			cameraFoVWheel.value = evt.deltaY;
		}}
	>
		{#if showSvg.value}
			<g style:--mesh-color={meshColor.value}>
				<rect {...debugRect.value} class:hidden={!showNDCCube.value}>
					<title>Debug Rect</title>
				</rect>
				<polygon
					{...debugPolygon.value}
					class:hidden={!screenTriangle.value}
				/>
				<polygon
					{...debugBoundsSvg.value}
					class:hidden={!showNDCCube.value}
				/>
				<polygon
					{...debugPolygonClipped.value}
					class:hidden={!screenTriangle.value}
				/>
				<circle
					{...debugCircle.value}
					class:hidden={!showNDCCube.value}
				>
					<title>Debug Center</title>
				</circle>
				<path
					fill="red"
					d={ndcCubeVertexPath.value}
					class:hidden={!showNDCCube.value}
				/>
				<path
					stroke-width="1"
					vector-effect="non-scaling-stroke"
					stroke="gray"
					stroke-dasharray="5 5"
					d={ndcCubeEdgePath.value}
					class:hidden={!showNDCCube.value}
				/>

				{#each ndcGeoFacePathsFast.value as p, i (i)}
					<polygon
						fill={p.attrs.color ?? "#ccc"}
						fill-opacity="0.5"
						vector-effect="non-scaling-stroke"
						stroke="none"
						{...p.attrs}
						stroke-opacity="0.1"
						data-clockwise={p.clockwise !== (p.attrs.flip ?? false)}
						points={p.path}
					/>
					{#if labelFace.value}
						<text
							class={p.attrs.class}
							{...p.center}
							data-clockwise={p.clockwise !==
								(p.attrs.flip ?? false)}
							text-anchor="middle"
							fill="black"
							transform="translate(0, -10)">f{i}</text
						>
					{/if}
				{/each}
				<g
					style:--stroke-width-fg={strokeWidthFg.value + "px"}
					style:--stroke-width-bg={strokeWidthBg.value + "px"}
					style:--stroke-width-bg2={strokeWidthBg.value * 2 + "px"}
				>
					{#each ndcGeoEdgePathsFast.value as p, i (i)}
						<path
							stroke-opacity="1"
							vector-effect="non-scaling-stroke"
							stroke={p.attrs.color ?? "black"}
							{...p.attrs}
							data-any-clockwise={p.frontFacing !==
								(p.attrs.flip ?? false)}
							d={p.path}
						/>
						{#if labelEdge.value}
							<text
								class={p.attrs.class}
								{...p.center}
								data-any-clockwise={p.frontFacing !==
									(p.attrs.flip ?? false)}
								text-anchor="middle"
								transform="translate(0, -10)">e{i}</text
							>
						{/if}
					{/each}
				</g>
				<g style:--circle-rad={circleRad.value + "px"}>
					{#each ndcGeoVerticesFast.value as v, i (i)}
						{#if !v.clipped}
							<circle
								class="vertex"
								cx={v.x}
								cy={v.y}
								r="5"
								fill="black"
							/>
							{#if labelVertex.value}
								<text
									x={v.x}
									y={v.y}
									text-anchor="middle"
									transform="translate(0, -10)">v{i}</text
								>
							{/if}
						{/if}
					{/each}
				</g>

				<g style:--font-size={fontSize.value + "px"}>
					{#each ndcGeoLabelsFast.value as v, i (i)}
						{#if !v.clipped}
							<text
								{...v.vertex}
								text-anchor="middle"
								transform="translate(0, -10)"
								{...v.attrs}
								>{#each v.lines as line, l (l)}
									<tspan x={v.vertex.x} dy="1em">{line}</tspan
									>
								{/each}</text
							>
							{#if v.attrs.stroke}
								<text
									{...v.vertex}
									text-anchor="middle"
									transform="translate(0, -10)"
									{...v.attrs}
									stroke="none"
									stroke-width="0"
									>{#each v.lines as line, l (l)}
										<tspan x={v.vertex.x} dy="1em"
											>{line}</tspan
										>
									{/each}</text
								>
							{/if}
						{/if}
					{/each}
				</g>
			</g>
		{/if}
		<defs>
			<marker
				id="simple-arrow"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" />
			</marker>

			{#each ndcGeoMaskPathsFast.value as p, i (i)}
				<clipPath id="mask-{i}">
					<polygon
						class={p.attrs.class}
						data-clockwise={p.clockwise !== (p.attrs.flip ?? false)}
						points={p.path}
					/>
				</clipPath>
			{/each}
		</defs>

		{#if worldGeo.value.masks.length}
			<circle cx="0" cy="0" r="60" clip-path="url(#mask-0)" fill="blue"
			></circle>
		{/if}
	</svg>
</div>
<textarea bind:value={geoJson.value}></textarea>

<style>
	.viewportContainer :global(.viewport),
	.viewport {
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		overscroll-behavior: contain;
		grid-area: 1/1/-1/-1;
	}

	.viewport:focus,
	.viewport:has-focus,
	.viewport:focus-inside {
		touch-action: none;
	}

	.viewportContainer {
		background: #fff;
		display: contents;
	}

	.viewport.vector {
		z-index: 10;
	}

	.resize {
		resize: both;
		width: 100%;
		height: 30em;
		border: 1px solid gray;
		overflow: hidden;
		display: grid;
		grid-template: 1fr;
	}

	polygon {
		stroke-linejoin: round;
		stroke-width: 5px;
	}

	[data-hide-ccw="true"] .cube-face[data-clockwise="false"] {
		display: none;
	}

	[data-hide-cw="true"] .cube-face[data-clockwise="true"] {
		display: none;
	}

	[data-hide-ccw="true"] text[data-clockwise="false"] {
		display: none;
	}

	[data-hide-cw="true"] text[data-clockwise="true"] {
		display: none;
	}

	.cube-edge[data-any-clockwise="false"] {
		stroke-dasharray: calc(var(--stroke-width-bg, 4) * 2)
			calc(var(--stroke-width-bg, 4) * 2);
		stroke-width: var(--stroke-width-bg, 2);
		stroke-opacity: 0.7;
	}

	.vertex {
		r: var(--circle-rad, 10px);
	}

	.cube-edge[data-any-clockwise="true"] {
		stroke-width: var(--stroke-width-fg, 8);
	}

	.cube-edge {
		stroke-linecap: round;
	}

	text.cube-edge[data-any-clockwise="false"] {
		opacity: 0.6;
	}

	text.cube-face[data-clockwise="false"] {
		opacity: 0.3;
	}

	text.cube-face[data-count="0"] {
		display: none;
	}

	text.cube-edge[data-count="0"] {
		display: none;
	}

	.hidden {
		display: none;
	}

	polygon.ground {
		fill-opacity: 0.2;
		stroke: var(--mesh-color, mediumaquamarine);
		stroke-opacity: 0.5;
		stroke-width: 1px;
		opacity: 1;
		pointer-events: none;
	}

	text.ground {
		display: none;
	}

	polygon.cube-face:hover {
		fill-opacity: 0.7;
	}

	polygon.cube-face {
		pointer-events: fill;
	}

	.cube-edge {
		pointer-events: none;
	}

	.cube-mask[data-clockwise="false"] {
		display: none;
	}

	polygon.ground[data-clockwise="false"] {
		display: none;
	}

	text.cube-label {
		font-size: var(--font-size, 1em) !important;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	polygon.obj-face {
		opacity: 0.4;
		fill-opacity: 1;
		fill: var(--mesh-color, mediumaquamarine);
	}

	path.obj-edge {
		stroke: var(--mesh-color, mediumaquamarine);
	}

	.obj-edge[data-any-clockwise="true"] {
		stroke-width: var(--stroke-width-fg, 8);
	}

	.obj-edge {
		stroke-linecap: round;
	}

	.obj-edge[data-any-clockwise="false"] {
		stroke-dasharray: calc(var(--stroke-width-bg, 4) * 2)
			calc(var(--stroke-width-bg, 4) * 2);
		stroke-width: var(--stroke-width-bg, 2);
		stroke-opacity: 0.7;
	}

	[data-hide-ccw="true"] .obj-face[data-clockwise="false"] {
		display: none;
	}

	[data-hide-cw="true"] .obj-face[data-clockwise="true"] {
		display: none;
	}

	text.obj-face[data-count="0"] {
		display: none;
	}

	text.obj-edge[data-count="0"] {
		display: none;
	}

	.petri-edge {
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.petri-label {
		font-family: monospace;
	}

	polygon.petri-face {
		opacity: 0.4;
		fill-opacity: 1;
		fill: currentColor;
	}

	[data-hide-ccw="true"] .petri-face[data-clockwise="false"] {
		display: none;
	}

	[data-hide-cw="true"] .petri-face[data-clockwise="true"] {
		display: none;
	}

	text.petri-face[data-count="0"] {
		display: none;
	}

	text.petri-edge[data-count="0"] {
		display: none;
	}

	text.petri-label {
		font-size: var(--font-size, 1em) !important;
	}

	path.petri-edge {
		stroke: currentColor;
	}
	.petri-edge[data-any-clockwise="true"] {
		stroke-width: var(--stroke-width-fg, 8);
	}

	.petri-line {
		stroke-width: var(--stroke-width-fg, 8);
	}

	.petri-edge {
		stroke-linecap: round;
	}

	.petri-edge[data-any-clockwise="false"] {
		stroke-dasharray: calc(var(--stroke-width-bg, 4) * 2)
			calc(var(--stroke-width-bg, 4) * 2);
		stroke-width: var(--stroke-width-bg, 2);
		stroke-opacity: 0.7;
	}

	path.petri-edge.edge-3d {
		stroke-opacity: 0.5;
		stroke-width: var(--stroke-width-bg, 8);
	}
</style>
