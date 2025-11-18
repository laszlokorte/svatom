<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import * as U from "../../utils";
    import { atom, view, combine, read } from "../../svatom.svelte.js";
    const {
        nodes,
        rotationTransform,
        cameraScale,
        frameBoxPath,
        clientToCanvas,
        cameraTow,
        createEdge,
        createEdgeNode,
    } = $props();

    const snapRadius = 30;
    const snapRadiusScaled = view(
        R.compose(R.multiply(snapRadius), R.min(1)),
        cameraScale,
    );
    const draft = atom({});

    const draftSourceId = view(
        [
            L.removable("source"),
            "source",
            L.rewrite((v, old) => (isNaN(v) ? old : v)),
            L.rewrite((v) => parseInt(v, 10)),
        ],
        draft,
    );
    const draftSourcePosition = view(
        L.lens(
            ({ n, s }) => {
                return s !== undefined ? n[s] : undefined;
            },
            (newPos, { n, s }) => {
                return { n, s };
            },
        ),
        combine({ n: nodes, s: draftSourceId }),
    );
    const draftTarget = view([L.removable("target"), "target"], draft);
    const draftTargetPosition = view(
        [L.removable("position"), "position"],
        draftTarget,
    );
    const draftTargetIds = view(
        L.lens(R.prop("ids"), (newIds, old) =>
            old.ids && newIds && old.ids.length !== newIds.length
                ? { ...old, ids: newIds, cycle: 0 }
                : { ...old, ids: newIds },
        ),
        draftTarget,
    );
    const draftTargetSnapCycle = view(["cycle", L.defaults(0)], draftTarget);
    const draftTargetId = view(
        L.reread(({ ids, cycle }) =>
            ids ? ids[(cycle || 0) % ids.length] : undefined,
        ),
        draftTarget,
    );
    const isActive = view(
        [L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined))],
        draftSourceId,
    );

    const connection = combine({
        source: draftSourceId,
        target: draftTargetId,
    });
    const validConnection = view(
        R.both(
            R.compose(R.not, R.isNil, R.prop("source")),
            R.compose(R.not, R.isNil, R.prop("target")),
        ),
        connection,
    );

    const draftTargetSnappedPosition = view(
        [
            L.lens(
                ({ n, t }) => {
                    const snapId = t.ids
                        ? t.ids[(t.cycle || 0) % t.ids.length]
                        : undefined;
                    return t !== undefined
                        ? snapId !== undefined
                            ? n[snapId]
                            : t.position
                        : undefined;
                },
                (newPos, { n, s }) => {
                    return { n, s };
                },
            ),
        ],
        combine({ n: nodes, t: draftTarget }),
    );

    export const canCancel = read(R.identity, isActive);

    export function cancel() {
        isActive.value = false;
    }

    let preventNextClick = $state(false);
</script>

<g
    class={["edge-container", { active: isActive.value }]}
    role="button"
    tabindex="-1"
    onclick={(evt) => {
        if (preventNextClick) {
            evt.stopPropagation();
            preventNextClick = false;
        }
    }}
    oncontextmenu={(evt) => {
        evt.preventDefault();
        isActive.value = false;
    }}
    onkeydown={(evt) => {
        evt.preventDefault();
        if (evt.key === "Escape" || evt.key === "Esc") {
            isActive.value = false;
        }
        if (evt.key === "Tab") {
            draftTargetSnapCycle.value += 1;
        }
    }}
    onpointerdown={(evt) => {
        if (!evt.isPrimary || !U.isLeftButton(evt)) {
            isActive.value = false;

            return;
        }
        const nodeId = evt.target.getAttribute("data-idx");
        evt.currentTarget.setPointerCapture(evt.pointerId);
        if (nodeId !== null) {
            draftSourceId.value = nodeId;
            draftTargetPosition.value = clientToCanvas(
                evt.clientX,
                evt.clientY,
            );
        }
    }}
    onpointermove={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        if (!isActive.value) {
            return;
        }

        const worldPos = clientToCanvas(evt.clientX, evt.clientY);
        draftTargetPosition.value = worldPos;
        cameraTow.value = worldPos;

        const closeTargets = R.reject(R.isNil)(
            R.addIndex(R.map)((node, ni) => {
                if (
                    ni !== draftSourceId.value &&
                    Math.hypot(node.x - worldPos.x, node.y - worldPos.y) <
                        snapRadiusScaled.value
                ) {
                    return ni;
                } else {
                    return null;
                }
            }, nodes.value),
        );

        if (closeTargets.length > 0) {
            draftTargetIds.value = closeTargets;
        } else {
            draftTargetIds.value = undefined;
        }
    }}
    onpointerup={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        if (!isActive.value) {
            return;
        }
        cameraTow.value = undefined;

        if (validConnection.value && createEdge) {
            createEdge(connection.value);
            preventNextClick = true;
        } else if (createEdgeNode) {
            createEdgeNode({
                source: draftSourceId.value,
                newTarget: draftTargetPosition.value,
            });
            preventNextClick = true;
        }

        isActive.value = false;
    }}
    onpointercancel={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        isActive.value = false;
        cameraTow.value = undefined;
    }}
    onlostpointercapture={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        isActive.value = false;
        cameraTow.value = undefined;
    }}
>
    <path
        d={frameBoxPath.value}
        pointer-events="all"
        fill="none"
        class={["edge-surface", { active: isActive.value }]}
    />

    <g transform={rotationTransform.value} pointer-events="none">
        {#each nodes.value as v, i (i)}
            <circle
                data-idx={i}
                class={[
                    "socket",
                    {
                        "active-source": draftSourceId.value === i,
                        "active-target": draftTargetId.value === i,
                    },
                ]}
                cx={v.x}
                cy={v.y}
                pointer-events="all"
                r={snapRadiusScaled.value}
            ></circle>
        {/each}

        {#if draftSourcePosition.value && draftTargetSnappedPosition.value}
            <path
                class={["edge", { valid: validConnection.value }]}
                stroke="black"
                pointer-events="none"
                d="M{draftSourcePosition.value.x} {draftSourcePosition.value
                    .y} L {draftTargetSnappedPosition.value
                    .x} {draftTargetSnappedPosition.value.y}"
            />
        {/if}
    </g>
</g>

<style>
    .edge-surface {
        stroke-width: 0;
        outline: none;
        stroke: none;
    }

    .edge-surface.active {
        cursor: alias;
    }

    .edge-container.active {
        cursor: alias;
    }

    .socket {
        fill: lightblue;
        opacity: 0.5;
        stroke: none;
        cursor: alias;
    }

    .socket.active-source {
        opacity: 0.8;
        stroke: lightblue;
        stroke-width: 10px;
        vector-effect: non-scaling-stroke;
    }
    .socket.active-target {
        opacity: 0.8;
        stroke: lightblue;
        stroke-width: 10px;
        vector-effect: non-scaling-stroke;
    }

    .edge {
        vector-effect: non-scaling-stroke;
        stroke-width: 3px;
        stroke: black;
        stroke-linecap: round;
        stroke-opacity: 0.5;
        pointer-events: none;
    }

    .edge.valid {
        stroke: green;
        stroke-width: 5px;
        stroke-opacity: 1;
    }
</style>
