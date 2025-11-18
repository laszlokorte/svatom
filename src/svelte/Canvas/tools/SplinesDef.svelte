<script>
    import * as R from "ramda";
    import * as L from "partial.lenses";
    import { read } from "../../svatom.svelte.js";

    const { splines, rotationTransform } = $props();

    const beziers = read(
        L.reread(
            R.map(({ path: p }) => {
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
            }),
        ),
        splines,
    );
</script>

<defs>
    {#each beziers.value as path, i (i)}
        <path
            fill="none"
            stroke="black"
            d={path}
            class="spline-line"
            pointer-events="none"
            id="spline-{i}"
        />
    {/each}
</defs>

<style>
    .spline-line {
        fill: none;
        stroke: black;
        fill-opacity: 0.2;
        fill-rule: evenodd;
        stroke-width: 2px;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
    }
</style>
