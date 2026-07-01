<script>
    import renewShapes from "../shapes";
    import { buildPath } from "@petristation/renew-icon-set";

    const { shapeBoxes, cameraScale } = $props();
</script>

<defs>
    {#each shapeBoxes.value as b, bi}
        <g
            id="shapebox-{bi}"
            fill="white"
            transform="rotate({b.angle} {b.x} {b.y})"
        >
            {#each renewShapes[b.shape].paths as path}
                <path
                    d={buildPath(
                        {
                            x: b.x,
                            y: b.y,
                            width: b.width,
                            height: b.height,
                        },
                        path,
                        Object.fromEntries(
                            (renewShapes[b.shape].args ?? []).map((a) => [
                                a.name,
                                b.argValues?.[a.name] ?? a.default,
                            ]),
                        ),
                    )}
                    fill={path.fill_color}
                    stroke={path.stroke_color}
                    vector-effect="non-scaling-stroke"
                    stroke-width="0.5"
                    fill-rule="evenodd"
                />
            {/each}</g
        >
    {/each}
</defs>
