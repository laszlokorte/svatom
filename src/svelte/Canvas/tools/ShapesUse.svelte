<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import * as U from "../../utils";
    import { atom, view, read, combine } from "../../svatom.svelte.js";

    const numberSvgFormat = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 5,
        maximumFractionDigits: 5,
        useGrouping: false,
    });

    const { rotationTransform, shapes } = $props();
</script>

<g pointer-events="none" transform={rotationTransform.value}>
    {#each shapes.value as _, s (s)}
        <use href="#shape-{s}" />
    {/each}
</g>
