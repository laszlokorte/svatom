<script>
    const { nodes, rotationTransform } = $props();
</script>

<g transform={rotationTransform.value} pointer-events="none">
    {#each nodes.value as v, i (i)}
        <use href="#node-{i}" />
    {/each}
</g>
