<script>
	const { nodes, rotationTransform, cameraScale } = $props();
</script>

<g transform={rotationTransform.value} pointer-events="none">
	{#each nodes.value as v, i (i)}
		<circle
			class="node"
			cx={v.x}
			cy={v.y}
			r={Math.min(cameraScale.value * 20, 20)}
		></circle>
	{/each}
</g>

<style>
	.node {
		fill: #dd4e40;
		stroke: #aa0b10;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}
</style>
