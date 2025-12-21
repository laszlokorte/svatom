<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import * as U from "../../utils";
    import { atom, view, read, combine } from "../../svatom.svelte.js";

    const { nodes, edges, rotationTransform, cameraScale } = $props();

    const paths = $derived(
        view(
            ({ ns, es }) =>
                R.map(
                    (e) =>
                        U.formattedNumbers`M${ns[e.source].x} ${ns[e.source].y} L${ns[e.target].x} ${ns[e.target].y}`,
                    es,
                ),
            combine({ ns: nodes, es: edges }),
        ),
    );
</script>

<defs>
    {#each paths.value as path, i (i)}
        <path id="edge-{i}" class="edge" stroke="black" d={path} />
    {/each}
</defs>

<style>
    .edge {
        vector-effect: non-scaling-stroke;
        stroke-width: 1px;
        stroke: black;
        stroke-linecap: round;
    }
</style>
