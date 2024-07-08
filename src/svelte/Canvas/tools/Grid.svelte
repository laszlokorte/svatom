<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import { view, read, combine } from "../../svatom.svelte.js";

	const minDragDistance = 25;
	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const {
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		frameBoxObject,
		cameraScale,
	} = $props();

	const crossPath = read(
		[
			"worldSpace",
			L.reread(({ a, b, c, d }) => {
				return `M${a.x},${a.y}L${c.x},${c.y}M${b.x},${b.y}L${d.x},${d.y}`;
			}),
		],
		frameBoxObject,
	);

	const gridPathPrimary = view(
		[
			L.pick({
				rect: ["frameBoxObject", "worldSpace"],
				screen: ["frameBoxObject", "screenSpaceAligned"],
				scale: "cameraScale",
			}),
			L.reread(
				({ rect, scale, screen: { minX, minY, width, height } }) => {
					const size = Math.hypot(width, height);

					const logRoundedScale = Math.pow(
						2,
						Math.round(Math.log(scale) / Math.log(2)),
					);

					const camCenterX = (rect.a.x + rect.c.x) / 2;
					const camCenterY = (rect.a.y + rect.d.y) / 2;
					const gridDistance = 128 * logRoundedScale;

					const range = Math.floor(size / gridDistance);
					const baseDistanceX =
						Math.floor(camCenterX / gridDistance) * gridDistance;
					const baseDistanceY =
						Math.floor(camCenterY / gridDistance) * gridDistance;

					return (
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									0,
									baseDistanceY + i * gridDistance,
									rect,
								),
							),
						)(R.range(0, range)) +
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									0,
									baseDistanceY - i * gridDistance,
									rect,
								),
							),
						)(R.range(1, range)) +
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									Math.PI / 2,
									-baseDistanceX - i * gridDistance,
									rect,
								),
							),
						)(R.range(0, range)) +
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									Math.PI / 2,
									-baseDistanceX + i * gridDistance,
									rect,
								),
							),
						)(R.range(1, range))
					);
				},
			),
		],
		combine({ frameBoxObject, cameraScale }),
	);

	const gridPathSecondary = view(
		[
			L.pick({
				rect: ["frameBoxObject", "worldSpace"],
				screen: ["frameBoxObject", "screenSpaceAligned"],
				scale: "cameraScale",
			}),
			L.reread(
				({ rect, scale, screen: { minX, minY, width, height } }) => {
					const size = Math.hypot(width, height);

					const logRoundedScale = Math.pow(
						2,
						Math.round(Math.log(scale) / Math.log(2) - 1),
					);

					const camCenterX = (rect.a.x + rect.c.x) / 2;
					const camCenterY = (rect.a.y + rect.d.y) / 2;
					const gridDistance = 128 * logRoundedScale;

					const range = Math.floor(size / gridDistance);
					const baseDistanceX =
						Math.floor(camCenterX / gridDistance) * gridDistance;
					const baseDistanceY =
						Math.floor(camCenterY / gridDistance) * gridDistance;

					return (
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									0,
									baseDistanceY + i * gridDistance,
									rect,
								),
							),
						)(R.range(0, range)) +
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									0,
									baseDistanceY - i * gridDistance,
									rect,
								),
							),
						)(R.range(1, range)) +
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									Math.PI / 2,
									-baseDistanceX - i * gridDistance,
									rect,
								),
							),
						)(R.range(0, range)) +
						R.compose(
							R.join(""),
							R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
							R.reject(R.isNil),
							R.map((i) =>
								Geo.rayInsideQuad(
									Math.PI / 2,
									-baseDistanceX + i * gridDistance,
									rect,
								),
							),
						)(R.range(1, range))
					);
				},
			),
		],
		combine({ frameBoxObject, cameraScale }),
	);
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
