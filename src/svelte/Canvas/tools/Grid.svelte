<script>
    import * as L from "partial.lenses";
    import { view, combine, atom } from "../../svatom.svelte.js";

    const {
        frameBoxPath,
        clientToCanvas,
        rotationTransform,
        frameBoxObject,
        cameraScale,
        gridDistance = atom(128),
    } = $props();

    const gridBuilder =
        (offset) =>
        ({ cellSize, scale }) => {
            if (cellSize < 5) {
                return { x: 0, y: 0 };
            }

            const logRoundedScale = Math.pow(
                2,
                Math.round(Math.log(scale) / Math.log(2) - offset),
            );

            const scaledDistance = cellSize * logRoundedScale;

            return { x: scaledDistance, y: scaledDistance };
        };
    const gridSizeGeneral = $derived(
        view(
            [
                L.pick({
                    scale: "cameraScale",
                    cellSize: "gridDistance",
                }),
            ],
            combine({ gridDistance, cameraScale }),
        ),
    );

    const gridSizePrimary = $derived(
        view(L.reread(gridBuilder(0)), gridSizeGeneral),
    );

    const sizePrimary = $derived(gridSizePrimary.value);
    let id = `grid-${Math.random().toString(36).slice(2)}`;
</script>

<defs>
    <pattern
        id="{id}-sec"
        width={sizePrimary.x}
        height={sizePrimary.y}
        patternTransform={rotationTransform.value}
        patternUnits="userSpaceOnUse"
    >
        <g vector-effect="non-scaling-stroke">
            <path
                d="M {sizePrimary.x} 0 L 0 0 0 {sizePrimary.y}"
                fill="none"
                vector-effect="non-scaling-stroke"
                stroke="none"
                class="grid-lines-primary"
                stroke-width="1"
            />
            <path
                d="M 0 0 L {sizePrimary.x} 0 M 0 0 L 0 {sizePrimary.y}"
                fill="none"
                vector-effect="non-scaling-stroke"
                stroke="none"
                class="grid-lines-primary"
                stroke-width="1"
            />
        </g>
    </pattern>
    <pattern
        id="{id}-prim"
        width={sizePrimary.x}
        height={sizePrimary.y}
        patternTransform="{rotationTransform.value} translate({sizePrimary.x /
            2} {sizePrimary.y / 2}) "
        patternUnits="userSpaceOnUse"
    >
        <g vector-effect="non-scaling-stroke">
            <path
                d="M {sizePrimary.x} 0 L 0 0 0 {sizePrimary.y}"
                fill="none"
                vector-effect="non-scaling-stroke"
                stroke="none"
                class="grid-lines-secondary"
                stroke-width="1"
            />
            <path
                d="M 0 0 L {sizePrimary.x} 0 M 0 0 L 0 {sizePrimary.y}"
                fill="none"
                vector-effect="non-scaling-stroke"
                stroke="none"
                class="grid-lines-secondary"
                stroke-width="1"
            />
        </g>
    </pattern>
</defs>

{#if sizePrimary.x && sizePrimary.y}
    <path
        stroke-width="0"
        fill="url(#{id}-prim)"
        stroke="none"
        pointer-events="none"
        d={frameBoxPath.value}
    />
    <path
        stroke-width="0"
        fill="url(#{id}-sec)"
        stroke="none"
        pointer-events="none"
        d={frameBoxPath.value}
    />
{/if}

<style>
    .grid-lines-secondary {
        stroke-width: 1px;
        vector-effect: non-scaling-stroke;
        shape-rendering: optimizeSpeed;
        stroke: #f0f0f0;
        fill: none;
    }
    .grid-lines-primary {
        stroke-width: 1px;
        vector-effect: non-scaling-stroke;
        shape-rendering: optimizeSpeed;
        stroke: #e0f5ff;
        fill: none;
    }
</style>
