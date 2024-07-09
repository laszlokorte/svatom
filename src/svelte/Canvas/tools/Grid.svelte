<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as G from "../../generators";
	import * as Geo from "../../geometry";
	import { view, read, combine, atom } from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		frameBoxObject,
		cameraScale,
		gridDistance = atom(128),
	} = $props();

	const gridBuilder =
		(offset) =>
		({ cellSize, rect, scale, screen: { minX, minY, width, height } }) => {
			if (cellSize < 5) {
				return "";
			}

			const size = Math.hypot(width, height);

			const logRoundedScale = Math.pow(
				2,
				Math.round(Math.log(scale) / Math.log(2) - offset),
			);

			const camCenterX = (rect.a.x + rect.c.x) / 2;
			const camCenterY = (rect.a.y + rect.d.y) / 2;
			const scaledDistance = cellSize * logRoundedScale;

			const range = Math.floor(size / scaledDistance);
			const baseDistanceX =
				Math.floor(camCenterX / scaledDistance) * scaledDistance;
			const baseDistanceY =
				Math.floor(camCenterY / scaledDistance) * scaledDistance;

			const rays = G.reject(
				R.isNil,
				G.concat(
					G.map(
						(dist) => Geo.rayInsideQuad(Math.PI, dist, rect),
						G.map(
							(i) => -baseDistanceY + i * scaledDistance,
							G.range(-range, range, 1, true),
						),
					),
					G.map(
						(dist) => Geo.rayInsideQuad(Math.PI / 2, dist, rect),
						G.map(
							(i) => -baseDistanceX + i * scaledDistance,
							G.range(-range, range, 1, true),
						),
					),
				),
			);

			const path = G.reduce(
				(acc, { a, b }) =>
					U.formattedNumbers`${acc}M${a.x},${a.y}L${b.x},${b.y}`,
				"",
				rays,
			);

			return path;
		};

	const gridPathGeneral = view(
		[
			L.pick({
				rect: ["frameBoxObject", "worldSpace"],
				screen: ["frameBoxObject", "screenSpaceAligned"],
				scale: "cameraScale",
				cellSize: "gridDistance",
			}),
		],
		combine({ gridDistance, frameBoxObject, cameraScale }),
	);

	const gridPathPrimary = view(L.reread(gridBuilder(0)), gridPathGeneral);
	const gridPathSecondary = view(L.reread(gridBuilder(1)), gridPathGeneral);
</script>

<g transform={rotationTransform.value} pointer-events="none">
	<path
		class="grid-lines-secondary"
		d={gridPathSecondary.value}
		stroke="#eee"
		stroke-width="1px"
		fill="none"
		vector-effect="non-scaling-stroke"
	/>
	<path
		class="grid-lines-primary"
		d={gridPathPrimary.value}
		stroke="#eee"
		stroke-width="1px"
		fill="none"
		vector-effect="non-scaling-stroke"
	/>
</g>

<style>
	.grid-lines-secondary {
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke: #f0f0f0;
		stroke-dasharray: 3 3;
		fill: none;
	}
	.grid-lines-primary {
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke: #e0f5ff;
		fill: none;
	}
</style>
