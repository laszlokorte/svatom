<script>
    const { rotationTransform, shapes } = $props();
</script>

<g pointer-events="none" transform={rotationTransform.value}>
    {#each shapes.value as _, s (s)}
        <use href="#shape-{s}" />
    {/each}
</g>
