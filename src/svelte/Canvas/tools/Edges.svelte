<script>
	const { nodes, edges, rotationTransform, cameraScale } = $props();
</script>

<g transform={rotationTransform.value} pointer-events="none">
	{#each edges.value as e, i (i)}
		
		<path class="edge" stroke="black" d="M{nodes.value[e.source].x} {nodes.value[e.source].y} L{nodes.value[e.target].x} {nodes.value[e.target].y}" />
	{/each}
</g>

<style>
	.edge {

		vector-effect: non-scaling-stroke;

		stroke-width: 2px;
		stroke: black;
		stroke-linecap: round;
	}
</style>
