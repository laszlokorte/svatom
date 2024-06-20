<script>
	import * as R from "ramda";
	import * as L from "partial.lenses";
	import * as Geo from "../../geometry";
	import { read, combine } from "../../svatom.svelte.js";
	const { guides, rotationTransform, frameBoxObject } = $props();

	const worldQuad = read("worldSpace", frameBoxObject);
	const segmentPaths = read(
		L.reread(({ gs, quad }) => {
			return R.compose(
				R.map(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
				R.reject(R.isNil),
				R.map(({ distance, angle }) =>
					Geo.rayInsideQuad(angle, distance, quad),
				),
			)(gs);
		}),
		combine({
			gs: guides,
			quad: worldQuad,
		}),
	);
</script>

<g transform={rotationTransform.value} pointer-events="none">
	{#each segmentPaths.value as d, i (i)}
		<path
			fill="none"
			stroke="black"
			{d}
			class="drawing-line"
			pointer-events="none"
		/>
	{/each}
</g>

<style>
	.drawing-line {
		fill: none;
		stroke: cyan;
		fill-opacity: 0.2;
		stroke-opacity: 0.6;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
