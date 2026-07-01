<script>
    const { nodes, cameraScale } = $props();

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
