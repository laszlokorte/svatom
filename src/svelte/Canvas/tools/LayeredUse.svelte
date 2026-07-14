<script>
    const { rotationTransform = atom(""), zLayers } = $props();
</script>

<g pointer-events="none" transform={rotationTransform.value}>
    {#each zLayers.value as l (l.id)}
        <use href="#{l.id}" />
    {/each}
</g>
