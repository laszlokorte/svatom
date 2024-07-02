<script>
	import * as R from "ramda";

	const { drawings, rotationTransform } = $props();
</script>

<g transform={rotationTransform.value} pointer-events="none">
	{#each drawings.value as d}
		<path
			fill="none"
			stroke="black"
			d={R.compose(
				R.concat("M"),
				R.join("L"),
				R.map(({ x, y }) => `${x},${y}`),
			)(d)}
			class="drawing-line"
			pointer-events="none"
		/>
	{/each}
</g>

<style>
	.drawing-line {
		fill: none;
		stroke: black;
		fill-opacity: 0.2;
		fill-rule: evenodd;
		stroke-width: 2px;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
</style>
