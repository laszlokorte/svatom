<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import * as U from "../../utils";
    import {
        atom,
        view,
        string,
        read,
        autofocusIf,
        bindBoundingBox,
    } from "../../svatom.svelte.js";

    const {
        rotationTransform,
        cameraScale,
        cameraOrientation,
        frameBoxPath,
        clientToCanvas,
        measureKey,
        measures,
        textes = atom([]),
    } = $props();
</script>

<defs>
    {#each textes.value as t, i (i)}
        <g
            id="textline-{i}"
            transform="rotate({-cameraOrientation.value}, {t.x}, {t.y})"
        >
            <circle
                cx={t.x}
                cy={t.y + t.fontSize}
                r={t.fontSize}
                fill="#55aaee"
                pointer-events="none"
            />
            <text
                x={t.x}
                y={t.y}
                stroke="white"
                fill="white"
                pointer-events="none"
                paint-order="stroke"
                stroke-width="1px"
                font-size="{t.fontSize}em"
                text-anchor="middle"
                role="presentation">{t.content}</text
            >
            <text
                x={t.x}
                y={t.y}
                stroke="none"
                fill="black"
                font-size="{t.fontSize}em"
                text-anchor="middle">{t.content}</text
            >
        </g>
    {/each}
</defs>
{#if measureKey && measures}
    <g pointer-events="none" opacity="0">
        {#each textes.value as t, i (i)}
            {@const m = view([i, measureKey, L.required({})], measures)}
            {#key [t.content, i]}
                <text
                    use:bindBoundingBox={m}
                    stroke="none"
                    fill="black"
                    font-size="{t.fontSize}em"
                    text-anchor="middle">{t.content}</text
                >
            {/key}
        {/each}
    </g>
{/if}

<style>
    text {
        -webkit-text-size-adjust: none;
        font-family: monospace;
        line-height: 1;
    }
</style>
