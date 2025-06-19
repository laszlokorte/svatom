<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as G from "@svatom/basic/generators";
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

	const plotLines = view(
		({ plots, worldQuad, cameraScale }) => {
			const quad = worldQuad;
			const longestDist = Math.hypot(
				quad.a.x - quad.c.x,
				quad.a.y - quad.c.y,
			);

			const lines = [];

			for (let pi = 0; pi < plots.length; pi++) {
				const p = plots[pi];

				const fn = Function(
					...p.fn.slice(0, p.fn.length - 1),
					"return " + p.fn[p.fn.length - 1],
				);

				const cos = Math.cos((-p.angle / 180) * Math.PI);
				const sin = Math.sin((-p.angle / 180) * Math.PI);
				const sizeAbs = Math.hypot(p.size.x, p.size.y);
				const dx1 = cos * p.size.x;
				const dy1 = -sin * p.size.x;

				const dx2 = sin * p.size.y;
				const dy2 = cos * p.size.y;

				const corners = R.props(["a", "b", "c", "d"], quad);
				const maxRight = R.transduce(
					R.map((v) =>
						Geo.dot2d(Geo.diff2d(v, p.start), { x: cos, y: -sin }),
					),
					R.max,
					-Infinity,
					corners,
				);

				const minRight = R.transduce(
					R.map((v) =>
						Geo.dot2d(Geo.diff2d(v, p.start), { x: cos, y: -sin }),
					),
					R.min,
					Infinity,
					corners,
				);

				const toX = p.start.x + (dx1 / p.size.x) * maxRight;
				const toY = p.start.y + (dy1 / p.size.x) * maxRight;
				const fromX = p.start.x + (dx1 / p.size.x) * minRight;
				const fromY = p.start.y + (dy1 / p.size.x) * minRight;
				const stepSize = 1;
				const sampleCount = Math.ceil(
					(maxRight - minRight) / stepSize / cameraScale,
				);
				// const samplePoints = G.map(
				// 	(i) => ({
				// 		x: U.lerp(toX, fromX, i / sampleCount),
				// 		y: U.lerp(toY, fromY, i / sampleCount),
				// 	}),
				// 	G.range(0, sampleCount),
				// );
				// const points = [
				// 	...G.reject(
				// 		R.isNil,
				// 		G.map(({ x, y }) => {
				// 			const fx =
				// 				((x - p.start.x) * cos +
				// 					(y - p.start.y) * sin) /
				// 				p.size.x;
				// 			const fVal = fn(fx);
				// 			if (isNaN(fVal)) {
				// 				return null;
				// 			}
				// 			if (!isFinite(fVal)) {
				// 				console.log(fVal);
				// 			}
				// 			const clamped = R.clamp(
				// 				-longestDist,
				// 				longestDist,
				// 				fVal,
				// 			);

				// 			return {
				// 				x: x + dx2 * clamped,
				// 				y: y + dy2 * clamped,
				// 				segment: p.poles
				// 					? p.poles.findIndex((v) => v < fx)
				// 					: -Infinity,
				// 			};
				// 		}, samplePoints),
				// 	),
				// ];

				// const segments = G.reject(
				// 	R.isEmpty,
				// 	R.groupWith((a, b) => a.segment == b.segment, points),
				// );

				const segments = [];
				let prevSegment = null;
				for (let i = 0; i < sampleCount; i++) {
					let x = U.lerp(toX, fromX, i / sampleCount);
					let y = U.lerp(toY, fromY, i / sampleCount);

					const fx =
						((x - p.start.x) * cos + (y - p.start.y) * sin) /
						p.size.x;

					const fVal = fn(fx);

					if (isNaN(fVal)) {
						continue;
					}

					const clamped = Math.max(
						-longestDist,
						Math.min(longestDist, fVal),
					);

					let newSegment = -Infinity;
					for (let pl = 0; pl < p.poles.length; pl++) {
						if (p.poles[pl] < fx) {
							newSegment = pl;
							break;
						}
					}

					if (newSegment !== prevSegment) {
						segments.push([]);
						prevSegment = newSegment;
					}

					const px = x + dx2 * clamped;
					const py = y + dy2 * clamped;

					segments[segments.length - 1].push(`${px} ${py}`);
				}

				lines.push({
					segments,
					color: p.color,
				});
			}
			return lines;
		},
		combine({
			plots,
			worldQuad,
			cameraScale,
		}),
	);
</script>

<g color="gray" pointer-events="none" transform={rotationTransform.value}>
	{#each plotLines.value as p, i (i)}
		{#each p.segments as seg, s (s)}
			<polyline
				class="plot-line"
				points={seg.join(" ")}
				fill="none"
				color={p.color}
				stroke-width="3"
			/>
		{/each}
	{/each}
</g>

<style>
	.plot-line {
		fill: none;
		stroke-width: 1.5px;
		stroke: currentColor;
		vector-effect: non-scaling-stroke;
	}
</style>
