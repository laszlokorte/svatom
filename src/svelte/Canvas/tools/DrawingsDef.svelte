<script>
	import * as R from "ramda";

	import { atom, view, read } from "../../svatom.svelte.js";
	const { drawings, rotationTransform } = $props();

	const paths = view(
		R.map(
			R.compose(
				R.concat("M"),
				R.join("L"),
				R.map(({ x, y }) => `${x},${y}`),
				R.prop("path"),
			),
		),
		drawings,
	);

	const pathsValue = $derived(paths.value);
</script>

<defs>
	{#each pathsValue as d, i (i)}
		<path
			fill="none"
			stroke="black"
			{d}
			id="drawing-{i}"
			class="drawing-line"
			pointer-events="none"
		/>
	{/each}
</defs>

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
