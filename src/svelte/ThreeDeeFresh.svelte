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

	const {
		geo = atom(exampleMesh),
		camera = atom({
			clip: {
				near: 5,
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
				dx: 1,
				sy: 1,
				sz: 1,
			},
		}),
		screen = atom({
			aspect: "meet",
			alignX: "Mid",
			alignY: "Mid",
			autoPadding: true,
			size: {
				x: 100,
				y: 100,
			},
		}),
	} = $props();

	const offsetRect = (o) =>
		L.lens(
			(value) => ({
				...value,
				x: value["x"] + o,
				y: value["y"] + o,
				width: value["width"] - 2 * o,
				height: value["height"] - 2 * o,
			}),
			(value) => ({
				...value,
				x: value["x"] - o,
				y: value["y"] - o,
				width: value["width"] * 2 * o,
				height: value["height"] * 2 * o,
			}),
		);

	const lens2dTranslateBuilder = (ax1, ax2) => (t1, t2) =>
		L.lens(
			(value) => ({
				...value,
				[ax1]: value[ax1] + t1,
				[ax2]: value[ax2] + t2,
			}),
			(value, orig) => ({
				...orig,
				...value,
				[ax1]: value[ax1] - t1,
				[ax2]: value[ax2] - t2,
			}),
		);

	const lens3dTranslateBuilder = (ax1, ax2, ax3) => (t1, t2, t3) =>
		L.lens(
			(value) => ({
				...value,
				[ax1]: value[ax1] + t1,
				[ax2]: value[ax2] + t2,
				[ax3]: value[ax3] + t3,
			}),
			(value, orig) => ({
				...orig,
				...value,
				[ax1]: value[ax1] - t1,
				[ax2]: value[ax2] - t2,
				[ax3]: value[ax3] - t3,
			}),
		);

	const lens3dScaleBuilder = (ax1, ax2, ax3) => (s1, s2, s3) =>
		L.lens(
			(value) => ({
				...value,
				[ax1]: value[ax1] * s1,
				[ax2]: value[ax2] * s2,
				[ax3]: value[ax3] * s3,
			}),
			(value, orig) => ({
				...orig,
				...value,
				[ax1]: value[ax1] / s1,
				[ax2]: value[ax2] / s2,
				[ax3]: value[ax3] / s3,
			}),
		);

	const lens2dScaleBuilder = (ax1, ax2) => (s1, s2) =>
		L.lens(
			(value) => ({
				...value,
				[ax1]: value[ax1] * s1,
				[ax2]: value[ax2] * s2,
			}),
			(value, orig) => ({
				...orig,
				...value,
				[ax1]: value[ax1] / s1,
				[ax2]: value[ax2] / s2,
			}),
		);

	const lens3dRotateBuilder = (ax1, ax2) => (angle) =>
		L.lens(
			(value) => ({
				...value,
				[ax1]:
					value[ax1] * Math.cos(angle) - value[ax2] * Math.sin(angle),
				[ax2]:
					value[ax1] * Math.sin(angle) + value[ax2] * Math.cos(angle),
			}),
			(value, orig) => ({
				...orig,
				...value,
				[ax1]:
					value[ax1] * Math.cos(angle) - value[ax2] * Math.sin(angle),
				[ax2]:
					value[ax1] * Math.sin(angle) + value[ax2] * Math.cos(angle),
			}),
		);

	const lens3dTranslate = lens3dTranslateBuilder("x", "y", "z");
	const lens2dTranslate = lens2dTranslateBuilder("x", "y", "z");
	const lens3dScale = lens3dScaleBuilder("x", "y", "z");
	const lens2dScale = lens2dScaleBuilder("x", "y");
	const lens3dRotateX = lens3dRotateBuilder("y", "z");
	const lens3dRotateY = lens3dRotateBuilder("x", "z");
	const lens3dRotateZ = lens3dRotateBuilder("x", "y");
	const lens2dRotate = lens3dRotateBuilder("x", "y");

	const coordString = L.iso(
		(points) => points.map(({ x, y }) => `${x},${y}`).join(" "),
		(str) =>
			str
				.trim()
				.split(/\s+/)
				.map((s) => {
					const [x, y] = s.split(",").map(Number);
					return { x, y };
				}),
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
				x: ["x", L.subtract(5), L.divide(2), L.negate],
				y: ["y", L.subtract(5), L.divide(2), L.negate],
				width: ["x", L.subtract(5)],
				height: ["y", L.subtract(5)],
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
			L.pick({
				points: ["points", coordString],

				stroke: R.always("cyan"),
				fill: R.always("white"),
				"fill-opacity": R.always("0.1"),
			}),
		],
		debugBounds,
	);

	const lensRadToPi = [L.multiply(180), L.divide(Math.PI)];

	const offset = atom({
		x: 0,
		y: 0,
	});
	const rotation = atom(0);
	const scale = atom({ x: 1, y: 1 });
	const rotationAngle = view(lensRadToPi, rotation);

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
			{ x: -100, y: 300 },
			{ x: 300, y: -300 },
			{ x: 600, y: 100 },
		],
	});

	const mapIso = (iso) => L.iso(R.map(L.get(iso)), R.zipWith(L.set(iso)));

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
			L.pickIn({
				points: transformChain({ offset, scale, rotation }),
			}),
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
		L.pick({
			stroke: R.always("blue"),
			"stroke-dasharray": R.always("10 10"),
			points: ["points", coordString],
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
					L.pickIn({
						bounds: [
							offsetRect(inset),
							lensRectEdges,
							L.inverse(L.prop("points")),
						],
						poly: [],
					}),
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
</script>

<input type="range" {...rangeX.value} bind:value={offsetX.value} />
<input type="range" {...rangeY.value} bind:value={offsetY.value} />
<input type="range" min="-360" max="360" bind:value={rotationAngle.value} />
<input type="range" min="-4" max="4" step="0.1" bind:value={scaleX.value} />
<input type="range" min="-4" max="4" step="0.1" bind:value={scaleY.value} />
<input type="range" min="-10" max="50" step="1" bind:value={inset.value} />

<div class="resize">
	<svg
		bind:clientWidth={clientWidth.value}
		bind:clientHeight={clientHeight.value}
		class="viewport"
		viewBox={viewBox.value}
		preserveAspectRatio={aspectRatio.value}
	>
		<circle {...debugCircle.value}>
			<title>Debug Center</title>
		</circle>
		<rect {...debugRect.value}>
			<title>Debug Rect</title>
		</rect>
		<polygon {...debugPolygon.value} />
		<polygon {...debugBoundsSvg.value} />
		<polygon {...debugPolygonClipped.value} />
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
</style>
