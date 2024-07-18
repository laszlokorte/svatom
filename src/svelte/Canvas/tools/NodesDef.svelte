<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const { nodes, cameraScale } = $props();

	// const paths = view(
	// 	({ ns }) => {
	// 		const radius = Math.min(cameraScale.value * 20, 20);
	// 		return R.join(
	// 			" ",
	// 			R.map(
	// 				(n) =>
	// 					U.formattedNumbers`M${n.x} ${n.y}m${-radius},0a ${radius} ${radius} 0 0 0 ${2 * radius} 0 a ${radius} ${radius} 0 0 0 ${-2 * radius} 0`,
	// 				ns,
	// 			),
	// 		);
	// 	},
	// 	combine({ ns: nodes, scale: cameraScale }),
	// );

	const cameraScaleValue = $derived(cameraScale.value);
</script>

<defs>
	{#each nodes.value as v, i (i)}
		<circle
			class="node"
			id="node-{i}"
			cx={v.x}
			cy={v.y}
			r={Math.min(cameraScaleValue * 20, 20)}
		></circle>
	{/each}
</defs>

<style>
	.node {
		fill: #dd4e40;
		stroke: #aa0b10;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}
</style>
