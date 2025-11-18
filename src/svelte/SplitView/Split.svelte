<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import { atom, view, read, update } from "../svatom.svelte.js";

    const {
        content = atom([
            { size: 10, content: "x" },
            { size: 30, content: "y" },
            { size: 40, content: "z" },
            { size: 20, content: "w" },
        ]),
        direction = "row",
        children,
    } = $props();

    const dir = {
        row: {
            x: 1,
            y: 0,
        },
        column: {
            x: 0,
            y: 1,
        },
    };

    const percentListLens = L.normalize((l) => {
        const norm = 100 / (R.sum(l) || 1);

        return R.map(R.multiply(norm), l);
    });

    const summingLens = (i, forceSum = null) =>
        L.lens(
            (a) => a[i],
            (n, o) => {
                const delta = Math.min(n - o[i], o[i + 1]);

                return [
                    ...o.slice(0, i),
                    o[i] + delta,
                    o[i + 1] - delta,
                    ...o.slice(i + 2),
                ];
            },
        );

    let offset = $state({ x: 0, y: 0 });
</script>

<div
    class={[
        "split",
        direction === "column" && "dir-column",
        direction === "row" && "dir-row",
    ]}
>
    {#each content.value as c, i (i)}
        {@const size = view(
            [
                L.partsOf([L.elems, "size"]),
                percentListLens,
                summingLens(i),
                L.normalize(R.clamp(0, 100)),
            ],
            content,
        )}
        {@const s = view(
            [
                L.partsOf([L.elems, "size"]),
                percentListLens,
                summingLens(i - 1),
                L.normalize(R.clamp(0, 100)),
            ],
            content,
        )}
        {#if i > 0}
            <div
                class={[
                    "split-divider",
                    direction === "column" && "dir-column",
                    direction === "row" && "dir-row",
                ]}
                onpointerdown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    offset = {
                        x:
                            e.pageX -
                            e.currentTarget.offsetLeft -
                            e.currentTarget.offsetWidth / 2,
                        y:
                            e.pageY -
                            e.currentTarget.offsetTop -
                            e.currentTarget.offsetHeight / 2,
                    };
                }}
                onpointermove={(e) => {
                    e.preventDefault();
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        const delta =
                            (dir[direction].x *
                                (100 *
                                    (e.pageX -
                                        offset.x -
                                        e.currentTarget.offsetLeft -
                                        e.currentTarget.offsetWidth / 2))) /
                                e.currentTarget.parentElement.offsetWidth +
                            (dir[direction].y *
                                (100 *
                                    (e.pageY -
                                        offset.y -
                                        e.currentTarget.offsetTop -
                                        e.currentTarget.offsetHeight / 2))) /
                                e.currentTarget.parentElement.offsetHeight;
                        update(R.add(delta), s);
                    }
                }}
                style:--split-size={s.value}
            ></div>
        {/if}

        <div class={["split-content"]} style:--split-size={size.value}>
            {@render children?.(i, content.content)}
        </div>
    {/each}
</div>

<style>
    .split {
        display: flex;
        justify-items: stretch;
        justify-content: stretch;
        width: 100%;
        height: 100%;
        max-width: 100%;
        overflow: hidden;
        flex-direction: var(--direction, row);
        user-select: none;
        outline: 1px solid #ccc;
    }

    .split.dir-row {
        flex-direction: row;
    }
    .split.dir-column {
        flex-direction: column;
    }

    .split-divider {
        align-self: stretch;
        background: #eee;
        flex-basis: 0.5em;
        flex-shrink: 0;
        flex-grow: 0;
        user-select: none;

        -webkit-touch-callout: none;
        -webkit-user-callout: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-user-modify: none;
        -webkit-highlight: none;
        position: relative;
    }

    .split-divider::after {
        content: " ";
        position: absolute;
        inset: -1em;
    }

    .split-divider.dir-row {
        border-left: 1px solid #ccc;
        border-right: 1px solid #ccc;
        cursor: col-resize;
        touch-action: pan-y;
    }
    .split-divider.dir-column {
        border-top: 1px solid #ccc;
        border-bottom: 1px solid #ccc;
        cursor: row-resize;
        touch-action: pan-x;
    }

    .split-content {
        flex-basis: 1px;
        min-width: 0;
        width: auto;
        flex-grow: var(--split-size, 0);
        flex-shrink: 1;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        display: grid;
        align-content: stretch;
        justify-content: stretch;
        align-items: stretch;
        justify-items: stretch;
        justify-content: stretch;
    }
</style>
