<script>
    import * as R from "ramda";
    import { update } from "../../svatom.svelte.js";
    import * as Geo from "../../geometry.js";

    const {
        children,
        hitAreas,
        selection,
        rotationTransform,
        clientToCanvas,
        cameraScale,
        frameBoxPath,
    } = $props();

    const hitAreasValue = $derived(hitAreas.value);
    const selectionValue = $derived(selection.value);

    let pointerSize = $state(1);

    function toggle(item) {
        return function (list) {
            let index = list.indexOf(item);

            if (index > -1) {
                return [...list.slice(0, index), ...list.slice(index + 1)];
            } else {
                return [...list, item];
            }
        };
    }
    function pointInPolygon(px, py, polygon) {
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const { x: xi, y: yi } = polygon[i];
            const { x: xj, y: yj } = polygon[j];

            const intersect =
                yi > py !== yj > py &&
                px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

            if (intersect) inside = !inside;
        }

        return inside;
    }

    const splitToPath = (p) => {
        if (p.length >= 2) {
            return (
                `M${p[0].point.x} ${p[0].point.y}` +
                R.join(
                    " ",
                    R.map(
                        ([from, to]) => {
                            if (!from.front && !to.back) {
                                return `L ${to.point.x} ${to.point.y}`;
                            } else if (from.front && !to.back) {
                                return `Q ${from.front.x} ${from.front.y} ${to.point.x} ${to.point.y}`;
                            } else if (!from.front && to.back) {
                                return `Q ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`;
                            } else {
                                return `C  ${from.front.x} ${from.front.y}  ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`;
                            }
                        },
                        R.aperture(2, p),
                    ),
                )
            );
        } else if (p.length == 1) {
            return "";
        } else {
            return "";
        }
    };
</script>

<g
    onkeydown={(evt) => {}}
    role="button"
    tabindex="-1"
    onpointerdown={(evt) => {
        pointerSize = Math.hypot(evt.width, evt.height);
    }}
    onclick={(evt) => {
        const pos = clientToCanvas(evt.clientX, evt.clientY);
        const hitIndex = R.findIndex((ha) => {
            switch (ha.type) {
                case "circle":
                    return (
                        Math.hypot(ha.cx - pos.x, ha.cy - pos.y) <
                        ha.r + (pointerSize / 2) * cameraScale.value
                    );
                case "polygon":
                    if (ha.points.length === 4) {
                        return Geo.quadContainsPoint(
                            {
                                a: ha.points[0],
                                b: ha.points[1],
                                c: ha.points[2],
                                d: ha.points[3],
                            },
                            pos,
                        );
                    } else {
                        return pointInPolygon(pos.x, pos.y, ha.points);
                    }
                case "polyline":
                    return R.any(
                        ([from, to]) => {
                            return (
                                Geo.pointToLineDistance(pos, { from, to }) <
                                cameraScale.value * (10 + pointerSize / 2)
                            );
                        },
                        R.aperture(2, ha.points),
                    );
                case "spline":
                    return R.any(
                        ([from, to]) => {
                            return (
                                Geo.pointToLineDistance(pos, { from, to }) <
                                cameraScale.value * (10 + pointerSize / 2)
                            );
                        },
                        R.aperture(
                            2,
                            ha.path.map((p) => p.point),
                        ),
                    );
                default:
                    return false;
            }
        }, hitAreasValue);

        const id = hitIndex < 0 ? null : hitAreasValue[hitIndex].id;

        if (id) {
            if (evt.shiftKey || evt.ctrlKey) {
                update(toggle(id), selection);
            } else if (!evt.defaultPrevented) {
                update(R.always([id]), selection);
            }
            evt.stopPropagation();
        } else {
            if (evt.shiftKey || evt.ctrlKey) {
            } else if (!evt.defaultPrevented) {
                update(R.always([]), selection);
            }
        }
    }}
>
    <path
        stroke-width="0"
        fill="none"
        stroke="none"
        pointer-events="all"
        d={frameBoxPath.value}
    />

    <g>
        {@render children()}
    </g>

    <g transform={rotationTransform.value} pointer-events="none">
        {#each hitAreasValue as ha (ha.id)}
            {#if ha.type === "circle"}
                <circle
                    fill="none"
                    stroke="none"
                    class={[
                        "hit-area",
                        { active: selectionValue.indexOf(ha.id) > -1 },
                    ]}
                    cx={ha.cx}
                    cy={ha.cy}
                    r={ha.r}
                    data-area-id={ha.id}
                />
            {:else if ha.type === "polygon"}
                <polygon
                    fill="none"
                    stroke="none"
                    class={[
                        "hit-area",
                        { active: selectionValue.indexOf(ha.id) > -1 },
                    ]}
                    points={ha.points.map(({ x, y }) => `${x} ${y}`).join(" ")}
                    data-area-id={ha.id}
                />
            {:else if ha.type === "polyline"}
                <polyline
                    fill="none"
                    stroke="none"
                    class={[
                        "hit-path",
                        { active: selectionValue.indexOf(ha.id) > -1 },
                    ]}
                    points={ha.points.map(({ x, y }) => `${x} ${y}`).join(" ")}
                    data-area-id={ha.id}
                />
            {:else if ha.type === "spline"}
                <path
                    fill="none"
                    stroke="none"
                    class={[
                        "hit-path",
                        { active: selectionValue.indexOf(ha.id) > -1 },
                    ]}
                    d={splitToPath(ha.path)}
                    data-area-id={ha.id}
                />
            {/if}
        {/each}
    </g>
</g>

<style>
    .hit-area {
        fill: none;
        stroke: none;
        stroke-width: 2px;
        vector-effect: non-scaling-stroke;
    }

    .hit-area.active {
        fill: #3298fd;
        fill-opacity: 0.3;
        stroke: #3298fd;
    }

    .hit-path {
        fill: none;
        stroke: none;
        stroke-width: 12px;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
    }

    .hit-path.active {
        stroke-opacity: 0.5;
        stroke: #3298fd;
    }
</style>
