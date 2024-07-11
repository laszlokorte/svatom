<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as G from "../../generators";
	import * as Geo from "../../geometry";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const {
		clientToCanvas,
		frameBoxObject,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		plots = atom([
			{
				start: {
					x: 80,
					y: 60,
				},
				size: {
					x: 100,
					y: -100,
				},
				angle: 0,
				fn: Math.cos,
				color: "red",
			},
			{
				start: {
					x: 80,
					y: 60,
				},
				size: {
					x: 50,
					y: -50,
				},
				angle: 30,
				fn: Math.sin,
				color: "blue",
			},
			{
				start: {
					x: 80,
					y: 60,
				},
				size: {
					x: 50,
					y: -50,
				},
				angle: 10,
				fn: (x) => 1 / x,
				color: "magenta",
				poles: [0],
			},
			// {
			//   "start": {
			//     "x": 80,
			//     "y": 60
			//   },
			//   "size": {
			//     "x": 50,
			//     "y": -50
			//   },
			//   "angle": 10,
			//   "fn" : Math.exp,
			//   "color": "orange"
			// },
			{
				start: {
					x: -180,
					y: 60,
				},
				size: {
					x: 50,
					y: -50,
				},
				angle: 10,
				fn: Math.log,
				color: "orange",
				poles: [0],
			},
		]),
	} = $props();

	const worldQuad = read("worldSpace", frameBoxObject);
</script>

<g color="gray" pointer-events="none" transform={rotationTransform.value}>
	{#each plots.value as p, i (i)}
		{@const quad = worldQuad.value}

		{@const cos = Math.cos((-p.angle / 180) * Math.PI)}
		{@const sin = Math.sin((-p.angle / 180) * Math.PI)}
		{@const sizeAbs = Math.hypot(p.size.x, p.size.y)}
		{@const dx1 = cos * p.size.x}
		{@const dy1 = -sin * p.size.x}

		{@const dx2 = sin * p.size.y}
		{@const dy2 = cos * p.size.y}

		{@const maxRight = R.compose(
			R.reduce(R.max, -Infinity),
			R.map((v) =>
				Geo.dot2d(Geo.diff2d(v, p.start), { x: cos, y: -sin }),
			),
			R.props(["a", "b", "c", "d"]),
		)(quad)}
		{@const minRight = R.compose(
			R.reduce(R.min, Infinity),
			R.map((v) =>
				Geo.dot2d(Geo.diff2d(v, p.start), { x: cos, y: -sin }),
			),
			R.props(["a", "b", "c", "d"]),
		)(quad)}
		<!-- 
		{@const xRay = Geo.rayInsideQuad(
			(p.angle / 180) * Math.PI,
			cos * p.start.y + sin * p.start.x,
			quad,
		)}
		{@const yRay = Geo.rayInsideQuad(
			(p.angle / 180) * Math.PI - Math.PI / 2,
			cos * p.start.x - sin * p.start.y,
			quad,
		)}

		{#if xRay}
			<line
				class="plot-axis"
				x1={xRay.a.x}
				x2={xRay.b.x}
				y1={xRay.a.y}
				y2={xRay.b.y}
				color="#e0e0e0"
			/>
		{/if}
		{#if yRay}
			<line
				class="plot-axis"
				x1={yRay.a.x}
				x2={yRay.b.x}
				y1={yRay.a.y}
				y2={yRay.b.y}
				color="#e0e0e0"
			/>
		{/if} -->

		<!-- <path
			class="plot-axis-handle"
			d="M{p.start.x} {p.start
				.y} m {dx1} {dy1} l {-dx1} {-dy1} l{dx2} {dy2}"
			stroke="black"
			stroke-width="3"
			fill="none"
		/> -->

		{@const toX = p.start.x + (dx1 / p.size.x) * maxRight}
		{@const toY = p.start.y + (dy1 / p.size.x) * maxRight}
		{@const fromX = p.start.x + (dx1 / p.size.x) * minRight}
		{@const fromY = p.start.y + (dy1 / p.size.x) * minRight}
		{@const stepSize = 1}
		{@const sampleCount = Math.ceil(
			(maxRight - minRight) / stepSize / cameraScale.value,
		)}
		{@const samplePoints = R.map(
			(i) => ({
				x: U.lerp(toX, fromX, i / sampleCount),
				y: U.lerp(toY, fromY, i / sampleCount),
			}),
			R.range(0, sampleCount),
		)}
		{@const points = [
			...G.reject(
				R.isNil,
				G.map(({ x, y }) => {
					const fx =
						((x - p.start.x) * cos + (y - p.start.y) * sin) /
						p.size.x;
					const fVal = p.fn(fx) * 1;
					return isFinite(fVal) && !isNaN(fVal)
						? {
								x: x + dx2 * fVal,
								y: y + dy2 * fVal,
								segment: p.poles
									? R.findIndex(R.lt(fx), p.poles)
									: -Infinity,
							}
						: null;
				}, samplePoints),
			),
		]}

		{@const segments = R.reject(
			R.isEmpty,
			R.groupWith((a, b) => a.segment == b.segment, points),
		)}

		{#each segments as seg, s (s)}
			<polyline
				class="plot-line"
				points={R.join(
					" ",
					R.map(({ x, y }) => `${x} ${y}`, seg),
				)}
				fill="none"
				color={p.color}
				stroke-width="3"
			/>
		{/each}
	{/each}
</g>

<style>
	.plot-axis {
		fill: none;
		stroke-width: 1px;
		stroke: currentColor;
		shape-rendering: crispEdges;
		vector-effect: non-scaling-stroke;
	}

	.plot-axis-handle {
		fill: none;
		stroke-width: 4px;
		stroke: currentColor;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.plot-line {
		fill: none;
		stroke-width: 1.5px;
		stroke: currentColor;
		vector-effect: non-scaling-stroke;
	}
</style>
