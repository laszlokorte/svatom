<script>
	import * as R from "ramda";
	import * as L from "partial.lenses";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import { read, combine } from "../../svatom.svelte.js";
	const { guides, rotationTransform, cameraScale, frameBoxObject } = $props();

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

	<polygon
		fill="none"
		stroke="magenta"
		stroke-width="2"
		points="{worldQuad.value.a.x} {worldQuad.value.a.y} {worldQuad.value.b
			.x} {worldQuad.value.b.y} {worldQuad.value.c.x} {worldQuad.value.c
			.y} {worldQuad.value.d.x} {worldQuad.value.d.y}"
	/>
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
