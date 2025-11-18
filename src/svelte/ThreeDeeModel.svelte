<script>
    import * as L from "partial.lenses";
    import * as G from "@svatom/basic/generators";
    import * as R from "ramda";
    import * as U from "./utils";
    import {
        atom,
        view,
        read,
        combine,
        update,
        failableView,
        bindValue,
        autofocusIf,
    } from "./svatom.svelte.js";
    import exampleMesh from "@svatom/threedee/exampleMesh";

    const numf = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });

    const {
        id,
        debug = false,
        corners = false,
        camera = atom({
            w: 50,
            h: 50,
            np: 10,
            fp: 100,
            cp: 5,
            scale: 1200,
            aspect: 1,
            fov: Math.PI / 5,
            orthogonality: 0,
            orientation: {
                x: 0,
                y: 0,
                z: 0,
                rx: 0,
                ry: 0,
                rz: 0,
            },
        }),
        selected = atom(),
        geo = atom(exampleMesh),
        trans = atom({
            rx: 0,
            ry: 0,
            rz: 0,
            tx: 0,
            ty: 0,
            tz: 60,
            sx: 1,
            sy: 1,
            sz: 1,
        }),
    } = $props();

    const indices = L.lens(
        (a) => {
            return Array(a.length)
                .fill(0)
                .map((_, i) => i);
        },
        (is, o) => {
            return is.map((i) => o[i]);
        },
    );

    const viewTransform = (near, far, w, h) =>
        L.reread(({ x, y, z }) => {
            const A = (far + near) / (far - near);
            const B = (-2 * far * near) / (far - near);
            return {
                x: x / w,
                y: -y / h,
                z: z * A + B,
                s: z,
                o_x: x,
                o_y: y,
                o_z: z,
            };
        });

    const lerp = (a, b, t) => b * t + (1 - t) * a;

    const project = (orthogonality, cp) =>
        L.reread(({ x, y, z, s, ...rest }) => {
            return {
                ...rest,
                x: x / 2 / lerp(s, cp, orthogonality),
                y: y / 2 / lerp(s, cp, orthogonality),
                z: z / 2 / s,
                s: lerp(s, 1, orthogonality),
            };
        });

    const svgCircle = (r) =>
        L.reread(({ x, y, s, ndc_z: z }) => {
            return { cx: x, cy: y, r: r };
        });

    const svgText = L.reread(({ x, y, s }) => {
        return { x: x, y: y };
    });

    const svgLine = (baseAttrs) =>
        L.reread(
            ({
                from: { x: x1, y: y1, z: z1, s: s1 },
                to: { x: x2, y: y2, z: z2, s: s2 },
                facePoints,
                attrs,
            }) => {
                if (
                    s1 < 0 ||
                    s2 < 0 ||
                    z1 < -1 ||
                    z2 < -1 ||
                    z1 > 1 ||
                    z2 > 1
                ) {
                    return {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 0,
                        fill: "none",
                        stroke: "none",
                        "stroke-width": "0",
                        opacity: "0",
                        behind: true,
                    };
                }

                const { width, color } = { ...baseAttrs, ...attrs };

                return {
                    x1,
                    y1,
                    x2,
                    y2,
                    stroke: color ?? "black",
                    "stroke-width": width ?? "inherit",
                    clockwise: facePoints
                        ? !facePoints.every(
                              ({ a, b, c }) =>
                                  !clockwise(a.x, a.y, b.x, b.y, c.x, c.y),
                          )
                        : null,
                };
            },
        );

    function clockwise(x1, y1, x2, y2, x3, y3) {
        return (y2 - y1) * (x3 - x2) - (y3 - y2) * (x2 - x1) >= 0;
    }

    const cross = (a1, a2, a3, b1, b2, b3) => [
        a2 * b3 - a3 * b2,
        a3 * b1 - a1 * b3,
        a1 * b2 - a2 * b1,
    ];

    const normalize = (x, y, z) => {
        const l = Math.sqrt(x * x + y * y + z * z);
        return [x / l, y / l, z / l];
    };

    const dot = ([x1, y1, z1], [x2, y2, z2]) => {
        return x1 * x2 + y2 * y2 + z1 * z2;
    };

    const svgTriangle = (baseAttrs) =>
        L.reread(
            ({
                a: {
                    x: x1,
                    y: y1,
                    z: z1,
                    s: s1,
                    o_x: o_x1,
                    o_y: o_y1,
                    o_z: o_z1,
                },
                b: {
                    x: x2,
                    y: y2,
                    z: z2,
                    s: s2,
                    o_x: o_x2,
                    o_y: o_y2,
                    o_z: o_z2,
                },
                c: {
                    x: x3,
                    y: y3,
                    z: z3,
                    s: s3,
                    o_x: o_x3,
                    o_y: o_y3,
                    o_z: o_z3,
                },
                attrs,
            }) => {
                if (
                    s1 < 0 ||
                    s2 < 0 ||
                    s3 < 0 ||
                    z1 < -1 ||
                    z2 < -1 ||
                    z3 < -1 ||
                    z1 > 1 ||
                    z2 > 1 ||
                    z3 > 1
                ) {
                    return {
                        points: ``,
                        fill: "none",
                        stroke: "none",
                        "stroke-width": "0",
                        opacity: "0",
                        behind: true,
                    };
                }

                const {
                    width,
                    color,
                    opacity,
                    flip = false,
                } = { ...baseAttrs, ...attrs };

                const light = dot(
                    normalize(
                        ...cross(
                            o_x1 - o_x2,
                            o_y1 - o_y2,
                            o_z1 - o_z2,
                            o_x3 - o_x2,
                            o_y3 - o_y2,
                            o_z3 - o_z2,
                        ),
                    ),
                    normalize(-2, -3, -1),
                );

                return {
                    points: `${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`,
                    fill: color ?? "black",
                    "fill-opacity": opacity ?? 1,
                    opacity: light,
                    clockwise: flip != clockwise(x1, y1, x2, y2, x3, y3),
                    behind: false,
                };
            },
        );

    const svgQuad = () =>
        L.reread(
            ({
                a: { x: x1, y: y1, z: z1, s: s1 },
                b: { x: x2, y: y2, z: z2, s: s2 },
                c: { x: x3, y: y3, z: z3, s: s3 },
                d: { x: x4, y: y4, z: z4, s: s4 },
            }) => {
                if (
                    s1 < 0 ||
                    s2 < 0 ||
                    s3 < 0 ||
                    s4 < 0 ||
                    z1 < -1 ||
                    z2 < -1 ||
                    z3 < -1 ||
                    z4 < -1 ||
                    z1 > 1 ||
                    z2 > 1 ||
                    z3 > 1 ||
                    z4 > 1
                ) {
                    return {
                        points: ``,
                        fill: "none",
                        stroke: "none",
                        "stroke-width": "0",
                        opacity: "0",
                        behind: true,
                    };
                }
                return {
                    points: `${x1} ${y1} ${x2} ${y2} ${x3} ${y3} ${x4} ${y4}`,
                    clockwise:
                        clockwise(x1, y1, x2, y2, x3, y3) &&
                        clockwise(x1, y1, x3, y3, x4, y4),
                    behind: false,
                };
            },
        );

    const svgTriangleTip = ({ r = 10, rd = 0.5, width, color, opacity }) =>
        L.reread(
            ({
                a: { x: x1, y: y1, z: z1, s: s1 },
                b: { x: x2, y: y2, z: z2, s: s2, ndc_z: dnc_z2 },
                c: { x: x3, y: y3, z: z3, s: s3 },
            }) => {
                if (s1 < 0 || s2 < 0 || s3 < 0 || z2 < -1 || z2 > 1) {
                    return {
                        cx: 0,
                        cy: 0,
                        fill: "none",
                        stroke: "none",
                        "stroke-width": "0",
                        opacity: "0",
                        behind: true,
                    };
                }
                return {
                    cx: x2,
                    cy: y2,
                    r: r + (10000 * rd * r) / Math.pow(s2, 2),
                    fill: color ?? "black",
                    "fill-opacity": opacity ?? "1",
                    clockwise: clockwise(x1, y1, x2, y2, x3, y3),
                    behind: false,
                };
            },
        );

    const svgTriangleCenter = ({ r = 10, width, color, opacity }) =>
        L.reread(
            ({
                a: { x: x1, y: y1, z: z1, s: s1 },
                b: { x: x2, y: y2, z: z2, s: s2 },
                c: { x: x3, y: y3, z: z3, s: s3 },
            }) => {
                if (s1 < 0 || s2 < 0 || s3 < 0 || z2 < -1 || z2 > 1) {
                    return {
                        x: 0,
                        y: 0,
                        fill: "none",
                        stroke: "none",
                        "stroke-width": "0",
                        opacity: "0",
                        behind: true,
                    };
                }
                return {
                    x: (x1 + x2 + x3) / 3,
                    y: (y1 + y2 + y3) / 3,
                    fill: color ?? "black",
                    "fill-opacity": opacity ?? "1",
                    clockwise: clockwise(x1, y1, x2, y2, x3, y3),
                    behind: false,
                };
            },
        );

    const transform = L.reread(({ p, mat }) => {
        const p0 = {
            x: p.x * (mat.sx ?? 1),
            y: p.y * (mat.sy ?? 1),
            z: p.z * (mat.sz ?? 1),
        };

        const p1 = {
            x: Math.cos(mat.ry) * p0.x - Math.sin(mat.ry) * p0.z,
            y: p0.y,
            z: Math.sin(mat.ry) * p0.x + Math.cos(mat.ry) * p0.z,
        };

        const p2 = {
            x: p1.x,
            y: Math.cos(mat.rx) * p1.y - Math.sin(mat.rx) * p1.z,
            z: Math.sin(mat.rx) * p1.y + Math.cos(mat.rx) * p1.z,
        };

        const p3 = {
            x: Math.cos(mat.rz) * p2.x - Math.sin(mat.rz) * p2.y,
            y: Math.sin(mat.rz) * p2.x + Math.cos(mat.rz) * p2.y,
            z: p2.z,
        };

        return {
            x: mat.tx + p3.x,
            y: mat.ty + p3.y,
            z: mat.tz + p3.z,
        };
    });

    const inverseTransform = ({ p, mat }) => {
        const p0 = {
            x: p.x - mat.tx,
            y: p.y - mat.ty,
            z: p.z - mat.tz,
        };

        const p1 = {
            x: Math.cos(-mat.rz) * p0.x - Math.sin(-mat.rz) * p0.y,
            y: Math.sin(-mat.rz) * p0.x + Math.cos(-mat.rz) * p0.y,
            z: p0.z,
        };

        const p2 = {
            x: p1.x,
            y: Math.cos(-mat.rx) * p1.y - Math.sin(-mat.rx) * p1.z,
            z: Math.sin(-mat.rx) * p1.y + Math.cos(-mat.rx) * p1.z,
        };

        const p3 = {
            x: Math.cos(-mat.ry) * p2.x - Math.sin(-mat.ry) * p2.z,
            y: p2.y,
            z: Math.sin(-mat.ry) * p2.x + Math.cos(-mat.ry) * p2.z,
        };

        return {
            x: p3.x,
            y: p3.y,
            z: p3.z,
        };
    };

    const transformAll = L.reread(({ ps, mat }) => {
        return ps.map((p) => L.get(transform, { p, mat }));
    });

    const projectAll = L.reread(({ camera, ps }) => {
        return ps.map((p) =>
            L.get(
                [
                    (p) =>
                        L.get(inverseTransform, { p, mat: camera.orientation }),
                    viewTransform(
                        camera.np,
                        camera.fp,
                        camera.aspect * Math.tan(camera.fov / 2),
                        Math.tan(camera.fov / 2),
                    ),
                    project(camera.orthogonality, camera.cp || 1),
                    (p) => ({
                        ...p,
                        x: p.x * camera.scale,
                        y: p.y * camera.scale,
                        ndc_x: p.x,
                        ndc_y: p.y,
                        ndc_z: p.z,
                    }),
                ],
                p,
            ),
        );
    });

    const points3d = view(["vertices", L.defaults([])], geo);
    const edges = view(["edges", L.defaults([])], geo);
    const faces = view(["faces", L.defaults([])], geo);
    const masks = view(["masks", L.defaults([])], geo);
    const quads = view(["quads", L.defaults([])], geo);

    const transformedPoints = view(
        transformAll,
        combine({ ps: points3d, mat: trans }),
    );
    const projectedPoints = view(
        projectAll,
        combine({ ps: transformedPoints, camera }),
    );

    const radToDeg = [L.multiply(180), L.divide(Math.PI)];
    const rx = view(["rx", radToDeg], trans);
    const ry = view(["ry", radToDeg], trans);
    const rz = view(["rz", radToDeg], trans);
    const tx = view(["tx"], trans);
    const ty = view(["ty"], trans);
    const tz = view(["tz"], trans);
    const sx = view(["sx"], trans);
    const sy = view(["sy"], trans);
    const sz = view(["sz"], trans);
    const np = view(
        L.lens(
            ({ np, fp }) => np,
            (n, { fp, np, ...rest }) => ({
                ...rest,
                fp: n + (fp - np),
                np: n,
            }),
        ),
        camera,
    );
    const fp = view(
        L.lens(
            ({ np, fp }) => fp - np,
            (n, { np, ...rest }) => ({ ...rest, np, fp: np + n }),
        ),
        camera,
    );
    const scale = view(["scale"], camera);
    const pointIndices = view(indices, points3d);
    const edgeIndices = view(indices, edges);
    const faceIndices = view(indices, faces);
    const maskIndices = view(indices, masks);

    function getIndices(idx) {
        return idx ? L.reread((arr) => idx.map((i) => arr[i])) : L.zero;
    }
    function getEntries(idxs) {
        return L.reread((obj) =>
            idxs
                ? idxs.map((idx) =>
                      Object.fromEntries(
                          Object.entries(idx).map(([i, v]) => [i, obj[v]]),
                      ),
                  )
                : undefined,
        );
    }
    function getEntry(idx) {
        return L.reread((obj) =>
            idx
                ? Object.fromEntries(
                      Object.entries(idx).map(([i, v]) => [i, obj[v]]),
                  )
                : undefined,
        );
    }
</script>

{#each edgeIndices.value as i (i)}
    {@const e = view(i, edges)}
    {@const attrs = view("attrs", e)}
    {@const pp1 = view([e.value.from], projectedPoints)}
    {@const pp2 = view([e.value.to], projectedPoints)}
    {@const facidx = view([getIndices(e.value.faces)], edgeIndices)}
    {@const facs = view([getIndices(facidx.value)], faces)}
    {@const facePoints = view([getEntries(facs.value)], projectedPoints)}
    {@const line = view(
        svgLine({ color: "inherit" }),
        combine({ from: pp1, to: pp2, facePoints, attrs }),
    )}

    <line {...line.value}></line>
{/each}

{#each faceIndices.value as i (i)}
    {@const e = view(i, faces)}
    {@const ppA = view([e.value.a], projectedPoints)}
    {@const ppB = view([e.value.b], projectedPoints)}
    {@const ppC = view([e.value.c], projectedPoints)}
    {@const attrs = view("attrs", e)}

    {@const triangle = view(
        svgTriangle({ opacity: 0.1 }),
        combine({ a: ppA, b: ppB, c: ppC, attrs }),
    )}
    <polygon
        stroke="none"
        class={{
            clickable: selected,
            selected: selected && selected.value === i,
        }}
        onclick={(evt) => {
            if ((evt.ctrlKey || evt.altKey) && selected) {
                evt.stopPropagation();
                selected.value = i;
            }
        }}
        {...triangle.value}
    ></polygon>

    {#if corners}
        {@const triangleTip1 = view(
            svgTriangleTip({ color: "#aa1010", opacity: 1, r: 3 }),
            combine({ a: ppA, b: ppB, c: ppC }),
        )}
        {@const triangleTip2 = view(
            svgTriangleTip({ color: "#aa1010", opacity: 1, r: 3 }),
            combine({ b: ppA, c: ppB, a: ppC }),
        )}
        {@const triangleTip3 = view(
            svgTriangleTip({ color: "#aa1010", opacity: 1, r: 3 }),
            combine({ c: ppA, a: ppB, b: ppC }),
        )}
        <circle pointer-events="none" {...triangleTip1.value}></circle>
        <circle pointer-events="none" {...triangleTip2.value}></circle>
        <circle pointer-events="none" {...triangleTip3.value}></circle>
    {/if}

    {#if debug}
        {@const triangleCenter = view(
            svgTriangleCenter({ color: "magenta", opacity: 1 }),
            combine({ a: ppA, b: ppB, c: ppC }),
        )}
        <text font-size="20" {...triangleCenter.value}>{i}</text>
    {/if}
{/each}

{#if debug}
    {#each pointIndices.value as i (i)}
        {@const ptr = view([i, "s"], projectedPoints)}
        {@const ptrZ = view([i, "ndc_z"], projectedPoints)}
        {@const ptrX = view([i, "ndc_x"], projectedPoints)}
        {@const ptrY = view([i, "ndc_y"], projectedPoints)}
        {@const inside = view(
            [
                i,
                L.props("ndc_z", "ndc_x", "ndc_y"),
                R.values,
                R.all((a) => a > -1 && a < 1),
            ],
            projectedPoints,
        )}
        {@const inFront = view([i, "s", (s) => s > 0], projectedPoints)}
        {@const pt = view([i], projectedPoints)}
        {@const pp = view([svgCircle(4)], pt)}
        {@const text = view([svgText], pt)}

        {#if inFront.value && inside.value}
            <circle {...pp.value} opacity="0.5"></circle>
            <text
                {...text.value}
                transform="translate(0,{-(30 + pp.value.r)})"
                font-size="20"
                text-anchor="middle"
                dominant-baseline="central">{i}</text
            ><text
                {...text.value}
                transform="translate(0,{30 + pp.value.r})"
                fill="red"
                font-size="20"
                text-anchor="middle"
                dominant-baseline="central"
                >{numf.format(ptrX.value)},{numf.format(
                    ptrY.value,
                )},{numf.format(ptrZ.value)},{numf.format(ptr.value)}</text
            >
        {/if}
    {/each}
{/if}

{#if id}
    <defs>
        {#each maskIndices.value as i (i)}
            {@const fs = view([i, "faces"], masks)}
            {@const qs = view([i, "quads"], masks)}

            <clipPath id={id + "-quad-" + i}>
                {#each fs.value as i (i)}
                    {@const e = view(i, faces)}
                    {@const ppA = view([e.value.a], projectedPoints)}
                    {@const ppB = view([e.value.b], projectedPoints)}
                    {@const ppC = view([e.value.c], projectedPoints)}
                    {@const attrs = view("attrs", e)}

                    {@const triangle = view(
                        svgTriangle({ opacity: 0.1 }),
                        combine({ a: ppA, b: ppB, c: ppC, attrs }),
                    )}
                    <polygon stroke="none" class="clip" {...triangle.value}
                    ></polygon>
                {/each}

                {#each qs.value as i (i)}
                    {@const q = view(i, quads)}
                    {@const corners = view(
                        [getEntry(q.value)],
                        projectedPoints,
                    )}
                    {@const quad = view(svgQuad({}), corners)}
                    <polygon stroke="none" class="clip" {...quad.value}
                    ></polygon>
                {/each}
            </clipPath>
        {/each}
    </defs>
{/if}

<style>
    .viewport {
        width: 100%;
        height: 50vh;
    }

    polygon[clockwise="true"] {
        fill: none;
    }

    polygon.clickable[clockwise="true"] {
        pointer-events: all;
    }

    polygon[clockwise="false"] {
        pointer-events: none;
    }

    polygon.clip[clockwise="false"] {
        display: none;
    }

    polygon.selected {
        stroke: magenta;
        stroke-linejoin: round;
        stroke-linecap: round;
        stroke-width: 4;
        stroke-opacity: 1;
        vector-effect: non-scaling-stroke;
        fill: magenta;
        fill-opacity: 0.2;
        stroke-opacity: 0.4;
    }

    polygon[clockwise="false"].selected {
        stroke: cyan;
        stroke-width: 2;
        fill: cyan;
    }

    circle[clockwise="false"] {
        transform: scale(0.4);
        transform-box: fill-box;
        fill: white;
        fill-opacity: 0.2;
        transform-origin: 50% 50%;
    }
    line[clockwise="false"] {
        stroke-dasharray: 4 4;
        stroke-width: 1;
        stroke: black;
        stroke-opacity: 0.4;
    }

    line {
        vector-effect: non-scaling-stroke;
    }

    text {
        pointer-events: none;
    }
</style>
