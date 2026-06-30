<script>
    import * as L from "partial.lenses";
    import renewShapes from "../shapes";
    import forceArg from "@petristation/renew-icon-set/args";

    import * as Geo from "../../geometry";
    import { view } from "../../svatom.svelte.js";
    const { editableShapeBox, rotationTransform, clientToCanvas, cameraScale } =
        $props();
    const shape = $derived(
        view(["shape", L.reread((s) => renewShapes[s])], editableShapeBox),
    );
    const deco = $derived(shape.value);
    const b = $derived(editableShapeBox.value);
</script>

<g transform={rotationTransform.value}>
    {#if deco}
        <g fill="white" transform="rotate({b.angle} {b.x} {b.y})">
            {#if deco.args}
                {#each deco.args as arg}
                    {@const pos = forceArg(
                        b.argValues?.[arg.name] ?? arg.default,
                        arg.force,
                    )}
                    {@const argV = view(
                        ["argValues", arg.name],
                        editableShapeBox,
                    )}
                    <g
                        tabindex="-1"
                        role="button"
                        class="arg-handle"
                        pointer-events="all"
                        onpointerdown={(evt) => {
                            if (evt.isPrimary) {
                                evt.currentTarget.setPointerCapture(
                                    evt.pointerId,
                                );
                            }
                        }}
                        onpointermove={(evt) => {
                            if (
                                evt.currentTarget.hasPointerCapture(
                                    evt.pointerId,
                                )
                            ) {
                                const svgGlobal = clientToCanvas(
                                    evt.clientX,
                                    evt.clientY,
                                );
                                const rot = Geo.rotatePivotDegree(
                                    b,
                                    -b.angle,
                                    svgGlobal,
                                );
                                const adjusted = forceArg(
                                    {
                                        x:
                                            ((rot.x -
                                                arg.origin.x * b.width -
                                                b.x +
                                                b.width / 2) /
                                                b.width) *
                                                2 -
                                            2,
                                        y: +(
                                            ((rot.y -
                                                arg.origin.y * b.height -
                                                b.y +
                                                b.height / 2) /
                                                b.height) *
                                                2 -
                                            2
                                        ),
                                    },
                                    arg.force,
                                );
                                argV.value = adjusted;
                            }
                        }}
                    >
                        <circle
                            cx={b.x +
                                b.width / 2 +
                                (pos.x * b.width) / 2 +
                                arg.origin.x * b.width}
                            cy={b.y +
                                b.height / 2 +
                                (pos.y * b.height) / 2 +
                                arg.origin.y * b.height}
                            stroke="none"
                            r={cameraScale.value * 10}
                            fill="transparent"
                            cursor="move"
                        />
                        <circle
                            cx={b.x +
                                b.width / 2 +
                                (pos.x * b.width) / 2 +
                                arg.origin.x * b.width}
                            cy={b.y +
                                b.height / 2 +
                                (pos.y * b.height) / 2 +
                                arg.origin.y * b.height}
                            stroke="gold"
                            r={cameraScale.value * 5}
                            vector-effect="non-scaling-stroke"
                            fill="yellow"
                            cursor="move"
                            class="indicator"
                        />
                    </g>
                {/each}
            {/if}
        </g>
    {:else}
        <text>{b.shape}</text>
    {/if}
</g>

<style>
    .arg-handle:hover > .indicator {
        fill: yellow;
        transform: scale(1.5);
        transform-origin: 50% 50%;
        transform-box: fill-box;
    }

    .arg-handle:active > .indicator {
        fill: gold;
        stroke: none;
        transform: scale(1);
        transform-origin: 50% 50%;
        transform-box: fill-box;
    }
</style>
