<script>
	import * as R from "ramda";
	import * as U from "../../utils";
	const { guides, rotationTransform, cameraScale, frameBoxObject } = $props();
</script>

<g transform={rotationTransform.value} pointer-events="none">
	{#each guides.value as d, i (i)}
		<path
			fill="none"
			stroke="black"
			d={`M${Math.cos(d.angle + Math.PI / 2) * d.distance}, ${Math.sin(d.angle + Math.PI / 2) * d.distance} m ${Math.cos(d.angle) * 2500}, ${Math.sin(d.angle) * 2500} l ${Math.cos(d.angle) * -5000}, ${Math.sin(d.angle) * -5000}`}
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
