<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import {
		atom,
		view,
		read,
		combine,
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

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

	const gridPath = view(
		[
			L.pick({
				rect: ["frameBoxObject", "worldSpace"],
				screen: ["frameBoxObject", "screenSpaceAligned"],
				scale: "cameraScale",
			}),
			L.reread(
				({ rect, scale, screen: { minX, minY, width, height } }) => {
					const size = Math.hypot(width, height);

					const logRoundedScale = Math.exp(
						Math.floor(Math.log(scale)),
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
									-Math.PI / 2,
									baseDistanceX + i * gridDistance,
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
									-Math.PI / 2,
									baseDistanceX - i * gridDistance,
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

<g transform={rotationTransform.value}>
	<path
		class="grid-lines"
		pointer-events="none"
		d={gridPath.value}
		stroke="#eee"
		stroke-width="1px"
		vector-effect="non-scaling-stroke"
	/>
</g>

<style>
	.grid-lines {
		stroke-width: 0;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke: #d5f5ff;
	}
</style>
