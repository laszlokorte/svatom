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
        failableView,
        bindValue,
        autofocusIf,
        activeTouchMove,
    } from "./svatom.svelte.js";
    import ThreeDeeModel from "./ThreeDeeModel.svelte";
    import { cubeA } from "@svatom/threedee/exampleMesh";

    const numf = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });

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

    const viewTransform = (np, fp, w, h) =>
        L.reread(({ x, y, z }) => {
            const s = (z - np) / (fp - np);
            return {
                x: x / w,
                y: -y / h,
                z: s,
                s,
            };
        });

    const project = (scale) =>
        L.reread(({ x, y, z, s }) => {
            return {
                x: (x * scale) / 2 / s,
                y: (y * scale) / 2 / s,
                z: z / 2 / s,
                s,
            };
        });

    const svgCircle = (r) =>
        L.reread(({ x, y, s }) => {
            return { cx: x, cy: y, r: r + r / s };
        });

    const svgText = L.reread(({ x, y, s }) => {
        return { x: x, y: y };
    });

    const svgLine = ({ width, color }) =>
        L.reread(
            ({
                from: { x: x1, y: y1, s: s1 },
                to: { x: x2, y: y2, s: s2 },
            }) => {
                if (s1 < 0 || s2 < 0) {
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

                return {
                    x1,
                    y1,
                    x2,
                    y2,
                    stroke: color ?? "black",
                    "stroke-width": width ?? 1,
                };
            },
        );

    function clockwise(x1, y1, x2, y2, x3, y3) {
        return (y2 - y1) * (x3 - x2) - (y3 - y2) * (x2 - x1) >= 0;
    }

    const svgTriangle = ({ width, color, opacity }) =>
        L.reread(
            ({
                a: { x: x1, y: y1, s: s1 },
                b: { x: x2, y: y2, s: s2 },
                c: { x: x3, y: y3, s: s3 },
            }) => {
                if (s1 < 0 || s2 < 0 || s3 < 0) {
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
                    points: `${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`,
                    fill: color ?? "black",
                    opacity: opacity ?? "1",
                    clockwise: clockwise(x1, y1, x2, y2, x3, y3),
                    behind: false,
                };
            },
        );

    const svgTriangleTip = ({ r = 10, width, color, opacity }) =>
        L.reread(
            ({
                a: { x: x1, y: y1, s: s1 },
                b: { x: x2, y: y2, s: s2 },
                c: { x: x3, y: y3, s: s3 },
            }) => {
                if (s2 < 0) {
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
                    r: r + r / s2,
                    fill: color ?? "black",
                    opacity: opacity ?? "1",
                    clockwise: clockwise(x1, y1, x2, y2, x3, y3),
                    behind: false,
                };
            },
        );

    const transform = L.reread(({ p, mat }) => {
        const p0 = {
            x: p.x * mat.sx,
            y: p.y * mat.sy,
            z: p.z * mat.sz,
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

    const transformAll = L.reread(({ ps, mat }) => {
        return ps.map((p) => L.get(transform, { p, mat }));
    });
    const projectAll = L.reread(({ camera, ps }) => {
        return ps.map((p) =>
            L.get(
                [
                    viewTransform(camera.np, camera.fp, camera.w, camera.h),
                    project(camera.scale),
                ],
                p,
            ),
        );
    });

    const trans = atom({
        rx: 0,
        ry: 0,
        rz: 0,
        tx: 0,
        ty: 0,
        tz: 60,
        sx: 1,
        sy: 1,
        sz: 1,
    });

    const trans2 = atom({
        rx: -Math.PI / 15,
        ry: (3.1 * Math.PI) / 2,
        rz: Math.PI / 15,
        tx: 0,
        ty: 0,
        tz: 60,
        sx: 0.4,
        sy: 0.4,
        sz: 0.4,
    });

    const geo2 = atom(cubeA);

    const camera = atom({
        w: 50,
        h: 50,
        np: 10,
        fp: 100,
        cp: 50,
        scale: 1400,
        aspect: 1,
        fov: (2 * Math.PI) / 6,
        orthogonality: 0,
        orientation: {
            tx: 0,
            ty: 0,
            tz: 0,
            rx: 0,
            ry: 0,
            rz: 0,
        },
    });
    const selected = atom();
    const debug = atom(false);

    const radToDeg = [L.multiply(180), L.divide(Math.PI)];
    const rx = $derived(view(["rx", radToDeg], trans));
    const ry = $derived(view(["ry", radToDeg], trans));
    const rz = $derived(view(["rz", radToDeg], trans));
    const rx2 = $derived(view(["rx", radToDeg], trans2));
    const ry2 = $derived(view(["ry", radToDeg], trans2));
    const rz2 = $derived(view(["rz", radToDeg], trans2));
    const tx = $derived(view(["tx"], trans));
    const ty = $derived(view(["ty"], trans));
    const tz = $derived(view(["tz"], trans));
    const sx = $derived(view(["sx"], trans));
    const sy = $derived(view(["sy"], trans));
    const sz = $derived(view(["sz"], trans));
    const np = $derived(
        view(
            L.lens(
                ({ np, fp }) => np,
                (n, { fp, np, ...rest }) => ({
                    ...rest,
                    fp: n + (fp - np),
                    np: n,
                }),
            ),
            camera,
        ),
    );
    const fp = $derived(
        view(
            L.lens(
                ({ np, fp }) => fp - np,
                (n, { np, ...rest }) => ({
                    ...rest,
                    np,
                    fp: np + n,
                    cp: Math.min(n, rest.cp),
                }),
            ),
            camera,
        ),
    );
    const cp = $derived(
        view(
            L.lens(
                ({ cp }) => cp,
                (n, rest) => ({
                    ...rest,
                    cp: Math.min(n, rest.fp - rest.np),
                }),
            ),
            camera,
        ),
    );

    const crx = $derived(view(["orientation", "rx", radToDeg], camera));
    const cry = $derived(view(["orientation", "ry", radToDeg], camera));
    const crz = $derived(view(["orientation", "rz", radToDeg], camera));
    const ctx = $derived(view(["orientation", "tx"], camera));
    const cty = $derived(view(["orientation", "ty"], camera));
    const ctz = $derived(view(["orientation", "tz"], camera));

    const clamp = (min, max) => L.normalize(R.clamp(min, max));
    const scale = $derived(view(["scale"], camera));
    const fov = $derived(view(["fov", radToDeg, clamp(0.01, 160)], camera));
    const orthogonality = $derived(
        view(["orthogonality", clamp(0, 1)], camera),
    );
    const aspect = $derived(view(["aspect", clamp(0.1, 10)], camera));
    const samples = 64;
    const curve = atom({ freq: 5, amp: 1, phase: 0, damp: 0 });
    const freq = $derived(view("freq", curve));
    const amp = $derived(view("amp", curve));
    const phase = $derived(view("phase", curve));
    const damp = $derived(view("damp", curve));
    const curveGeo = $derived(
        view(
            ({ freq, amp, phase, damp }) => ({
                vertices: Array(samples)
                    .fill(null)
                    .map((_, i) => ({
                        x: -10 + (20 * i) / samples,
                        y:
                            Math.exp(
                                (-damp / Math.max(1, amp)) *
                                    (i / samples - 0.5),
                            ) *
                            amp *
                            Math.cos(
                                freq * (i / samples - 0.5 + phase) * Math.PI,
                            ),
                        z:
                            Math.exp(
                                (-damp / Math.max(1, amp)) *
                                    (i / samples - 0.5),
                            ) *
                            amp *
                            Math.sin(
                                freq * (i / samples - 0.5 + phase) * Math.PI,
                            ),
                    })),
                edges: Array(samples)
                    .fill(null)
                    .slice(1)
                    .map((_, i) => ({ from: i, to: i + 1 })),
            }),
            curve,
        ),
    );

    const pointer = atom({ x: 0, y: 0, dx: 0, dy: 0 });
    const pointerPos = $derived(
        view(
            L.lens(
                ({ x, y }) => ({ clientX: x, clientY: y }),
                ({ clientX: x, clientY: y }, o) => ({
                    x,
                    y,
                    dx: x - o.x,
                    dy: y - o.y,
                }),
            ),
            pointer,
        ),
    );
    const pointerDelta = $derived(view(L.props("dx", "dy"), pointer));
</script>

<p>
    The Scene below is rendered as SVG graphic. The faces of the cube house can
    be selected by clicking / tapping. The hause can be rotated by dragging with
    your mouse or your finger.
</p>

<svg
    tabindex="-1"
    preserveAspectRatio="xMidYMid meet"
    viewBox="-500 -500 1000 1000"
    class="viewport"
    stroke="red"
    role="button"
    onclick={(evt) => {
        selected.value = undefined;
    }}
    onkeypress={(evt) => {
        if (evt.key == "Escape") {
            selected.value = undefined;
        }
    }}
    use:activeTouchMove={(evt) => {
        evt.preventDefault();
    }}
    onpointerdown={(evt) => {
        if (evt.isPrimary) {
            evt.preventDefault();
            evt.currentTarget.setPointerCapture(evt.pointerId);
            pointerPos.value = evt;
        }
    }}
    onpointermove={(evt) => {
        if (
            evt.isPrimary &&
            evt.currentTarget.hasPointerCapture(evt.pointerId)
        ) {
            pointerPos.value = evt;
            if (evt.shiftKey) {
                if (evt.ctrlKey) {
                    crx.value -= pointerDelta.value.dy / 10;
                    cry.value += pointerDelta.value.dx / 10;
                } else {
                    ctx.value -= pointerDelta.value.dx / 10;
                    cty.value += pointerDelta.value.dy / 10;
                }
            } else {
                if (evt.ctrlKey) {
                    ctz.value -= pointerDelta.value.dy / 10;
                } else {
                    ry.value =
                        ((((ry.value + 720) % 720) +
                            pointerDelta.value.dx / 2 +
                            360) %
                            720) -
                        360;
                    rx.value =
                        ((((rx.value + 720) % 720) -
                            pointerDelta.value.dy / 2 +
                            360) %
                            720) -
                        360;

                    ry2.value =
                        ((((ry2.value + 720) % 720) -
                            pointerDelta.value.dx / 4 +
                            360) %
                            720) -
                        360;
                    rx2.value =
                        ((((rx2.value + 720) % 720) +
                            pointerDelta.value.dy / 4 +
                            360) %
                            720) -
                        360;
                }
            }
            evt.preventDefault();
        }
    }}
    onwheel={(evt) => {
        evt.preventDefault();

        if (evt.ctrlKey) {
            cp.value -= evt.deltaY / 20;
        }
        if (evt.shiftKey) {
            orthogonality.value += evt.deltaY / 2000;
        }

        if (!evt.ctrlKey && !evt.shiftKey) {
            //fov.value *= Math.exp(evt.deltaY / 800);
            fov.value += evt.deltaY / 20;
        }
    }}
>
    <rect
        x="-500"
        y="-500"
        width="1000"
        height="1000"
        fill="none"
        stroke="black"
        stroke-dasharray="10 10"
        opacity="0.2"
    />
    <ThreeDeeModel
        id="model-a"
        corners={true}
        {trans}
        {camera}
        {selected}
        debug={debug.value}
    />

    <g clip-path="url(#model-a-quad-0)" pointer-events="none">
        <ThreeDeeModel id="model-b" selected={false} trans={trans2} {camera} />
    </g>
    <g pointer-events="none">
        <ThreeDeeModel
            trans={view(
                L.iso(
                    (c) => ({
                        ...c,
                        tx: c.tx + 30,
                        ty: c.ty + 8,
                        sx: 0.4,
                        sy: 0.4,
                        sz: 0.4,
                    }),
                    (c, o) => ({
                        ...c,
                        tx: c.tx - 20,
                        ty: c.ty - 8,
                        sx: o.sx,
                        sy: o.sy,
                        sz: o.sz,
                    }),
                ),
                trans,
            )}
            geo={geo2}
            selected={false}
            debug={debug.value}
            {camera}
        />

        <g clip-path="url(#model-a-quad-0)">
            <circle
                stroke="white"
                stroke-opacity="0.3"
                stroke-width="10"
                stroke-linejoin="round"
                cx="0"
                cy="0"
                r="60"
                fill="red"
                clip-path="url(#model-b-quad-0)"
            />
        </g>

        <polygon
            stroke="white"
            stroke-opacity="0.3"
            stroke-width="10"
            stroke-linejoin="round"
            points="-80 -90 80 -90 0 100"
            fill="blue"
            clip-path="url(#model-a-quad-1)"
        />

        <g clip-path="url(#model-a-quad-2)" stroke-width="3">
            <text text-anchor="middle" y="70" x="0" font-size="40" stroke="none"
                >y = e<tspan dy="-20" font-size="smaller">jt</tspan></text
            >
            <g stroke="gray">
                <ThreeDeeModel
                    geo={view(
                        L.reread((geo) => ({
                            ...geo,
                            vertices: geo.vertices.map((v) => ({
                                ...v,
                                z: 10,
                            })),
                        })),
                        curveGeo,
                    )}
                    {camera}
                    {trans}
                    {selected}
                />

                <ThreeDeeModel
                    geo={view(
                        L.reread((geo) => ({
                            ...geo,
                            vertices: geo.vertices.map((v) => ({
                                ...v,
                                y: -10,
                            })),
                        })),
                        curveGeo,
                    )}
                    {camera}
                    {trans}
                    {selected}
                />
            </g>
            <ThreeDeeModel geo={curveGeo} {camera} {trans} {selected} />
        </g>

        <polygon
            stroke="white"
            stroke-opacity="0.3"
            stroke-width="10"
            stroke-linejoin="round"
            points="-80 90 80 90 0 -100"
            fill="purple"
            clip-path="url(#model-a-quad-3)"
        />

        <rect
            stroke="white"
            stroke-opacity="0.3"
            stroke-width="10"
            stroke-linejoin="round"
            x="-50"
            y="-50"
            width="200"
            height="200"
            rx="40"
            ry="40"
            fill="orange"
            clip-path="url(#model-a-quad-4)"
        />

        <rect
            stroke="white"
            stroke-opacity="0.3"
            stroke-width="10"
            stroke-linejoin="round"
            x="-75"
            y="-75"
            width="150"
            height="150"
            rx="40"
            ry="40"
            fill="darkred"
            clip-path="url(#model-a-quad-5)"
        />
    </g>
</svg>

<div>
    <h3>Controls</h3>
    <div>
        <label><input type="checkbox" bind:checked={debug.value} /> Debug</label
        >
    </div>
</div>
<div style="display: flex; gap: 1em; flex-wrap: wrap;">
    <div style="flex-grow: 1; flex-shrink: 1; flex-basis: 15em;">
        <fieldset>
            <legend>Camera</legend>
            <div style="display: flex; flex-wrap: wrap-reverse;gap: 1em">
                <div style="flex-basis: 16em; flex-grow: 1">
                    <label
                        >Near Plane: <output>{numf.format(np.value)}</output>
                        <input
                            type="range"
                            bind:value={np.value}
                            min="0.1"
                            step="0.1"
                            max="200"
                        /></label
                    >
                    <label
                        >Far Plane: <output>{numf.format(fp.value)}</output>
                        <input
                            type="range"
                            bind:value={fp.value}
                            min="0.2"
                            max="200"
                        /></label
                    >
                    <label
                        >Click Plane: <output>{numf.format(cp.value)}</output>
                        <input
                            type="range"
                            bind:value={cp.value}
                            min="1"
                            max="200"
                        /></label
                    >
                    <label
                        >Scale: <output>{numf.format(scale.value)}</output>
                        <input
                            type="range"
                            bind:value={scale.value}
                            min="0"
                            max="2000"
                        /></label
                    >
                    <label
                        >orthogonality: <output
                            >{numf.format(orthogonality.value)}</output
                        >
                        <input
                            type="range"
                            bind:value={orthogonality.value}
                            min="0"
                            max="1"
                            step="0.001"
                        /></label
                    >
                    <label
                        >Field of View: <output>{numf.format(fov.value)}</output
                        >
                        <input
                            type="range"
                            bind:value={fov.value}
                            min="0.001"
                            max="160"
                            step="0.01"
                        /></label
                    >
                    <!-- 	<label
						>Aspect Ratio: <output
							>{numf.format(aspect.value)}</output
						>
						<input
							type="range"
							bind:value={aspect.value}
							min="0"
							step="0.01"
							max="10"
						/></label
					> -->
                </div>
                <svg
                    style:justify-self="center"
                    style:align-self="center"
                    style="flex-basis: 10em; flex-grow: 1;"
                    viewBox="-4
						{-(3 * 4000) / scale.value}
						{np.value + fp.value + 10}
						{(2 * (3 * 4000)) / scale.value}"
                    width="200"
                    height="200"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <polygon
                        fill="#0001"
                        points="0 0 {np.value + fp.value} {(3 * 4000) /
                            (-1 * scale.value)} {np.value + fp.value} {(3 *
                            4000) /
                            (1 * scale.value)}"
                    />

                    <line
                        x1="0"
                        y1="0"
                        x2={np.value}
                        y2="0"
                        stroke="gray"
                        stroke-dasharray="2 2"
                        vector-effect="non-scaling-stroke"
                        stroke-width="1"
                    />

                    <line
                        x2={np.value}
                        y2="0"
                        x1={np.value + fp.value}
                        y1="0"
                        stroke="gray"
                        stroke-dasharray="2 2"
                        vector-effect="non-scaling-stroke"
                        stroke-width="1"
                    />
                    <line
                        x1={np.value}
                        y1={(((3 * 4000) / (-1 * scale.value)) * np.value) /
                            (np.value + fp.value)}
                        x2={np.value}
                        y2={(((3 * 4000) / (1 * scale.value)) * np.value) /
                            (np.value + fp.value)}
                        stroke="lightblue"
                        vector-effect="non-scaling-stroke"
                        stroke-width="1"
                    />
                    <line
                        x1={np.value + cp.value}
                        y1={(((3 * 4000) / (-1 * scale.value)) *
                            (np.value + cp.value)) /
                            (np.value + fp.value)}
                        x2={np.value + cp.value}
                        y2={(((3 * 4000) / (1 * scale.value)) *
                            (np.value + cp.value)) /
                            (np.value + fp.value)}
                        stroke="orange"
                        vector-effect="non-scaling-stroke"
                        stroke-width="1"
                    />
                    <line
                        x1={np.value + fp.value}
                        y1={(3 * 4000) / (-1 * scale.value)}
                        x2={np.value + fp.value}
                        y2={(3 * 4000) / (1 * scale.value)}
                        stroke="lightblue"
                        vector-effect="non-scaling-stroke"
                        stroke-width="1"
                    />
                    <circle cx="0" cy="0" r="1"></circle>
                    <circle cx={np.value + fp.value} cy="0" r="1"></circle>
                </svg>
            </div>
            <div style="display: flex; gap: 1ex">
                <div>
                    <label
                        >X-Translation: <output>{numf.format(ctx.value)}</output
                        >
                        <input
                            type="range"
                            bind:value={ctx.value}
                            min="-50"
                            max="50"
                        /></label
                    ><label
                        >Y-Translation: <output>{numf.format(cty.value)}</output
                        >
                        <input
                            type="range"
                            bind:value={cty.value}
                            min="-50"
                            max="50"
                        /></label
                    ><label
                        >Z-Translation: <output>{numf.format(ctz.value)}</output
                        >
                        <input
                            type="range"
                            bind:value={ctz.value}
                            min="-50"
                            max="50"
                        /></label
                    >
                </div>

                <div>
                    <label
                        >X-Rotation: <output>{numf.format(crx.value)}</output>
                        <input
                            type="range"
                            bind:value={crx.value}
                            min="-360"
                            max="360"
                        /></label
                    ><label
                        >Y-Rotation: <output>{numf.format(cry.value)}</output>
                        <input
                            type="range"
                            bind:value={cry.value}
                            min="-360"
                            max="360"
                        /></label
                    ><label
                        >Z-Rotation: <output>{numf.format(crz.value)}</output>
                        <input
                            type="range"
                            bind:value={crz.value}
                            min="-360"
                            max="360"
                        /></label
                    >
                </div>
            </div>
        </fieldset>
    </div>

    <div style="flex-grow: 1; flex-shrink: 1; flex-basis: 15em;">
        <fieldset>
            <legend>Frequency</legend>

            <label
                >Frequency: <output>{numf.format(freq.value)}</output>
                <input
                    type="range"
                    bind:value={freq.value}
                    step="0.1"
                    min="-7"
                    max="7"
                /></label
            >
            <label
                >Amplitude: <output>{numf.format(amp.value)}</output>
                <input
                    type="range"
                    bind:value={amp.value}
                    step="0.1"
                    min="0"
                    max="9"
                /></label
            >
            <label
                >Phase: <output>{numf.format(phase.value)}</output>
                <input
                    type="range"
                    bind:value={phase.value}
                    step="0.01"
                    min="-2"
                    max="2"
                /></label
            >
            <label
                >Damping: <output>{numf.format(damp.value)}</output>
                <input
                    type="range"
                    bind:value={damp.value}
                    step="0.01"
                    min="-6"
                    max="6"
                /></label
            >
        </fieldset>
    </div>
</div>

<fieldset>
    <legend>Model Transform</legend>
    <div style="display: flex; gap: 1em; flex-wrap: wrap;">
        <div style="flex-grow: 1; flex-shrink: 1; flex-basis: 15em;">
            <label
                >X-Rotation: <output>{numf.format(rx.value)}</output>
                <input
                    type="range"
                    bind:value={rx.value}
                    min="-360"
                    max="360"
                /></label
            >
            <label
                >Y-Rotation: <output>{numf.format(ry.value)}</output>
                <input
                    type="range"
                    bind:value={ry.value}
                    min="-360"
                    max="360"
                /></label
            >
            <label
                >Z-Rotation: <output>{numf.format(rz.value)}</output>
                <input
                    type="range"
                    bind:value={rz.value}
                    min="-360"
                    max="360"
                /></label
            >
        </div>

        <div style="flex-grow: 1; flex-shrink: 1; flex-basis: 15em;">
            <label
                >X-Scale: <output>{numf.format(sx.value)}</output>
                <input
                    type="range"
                    bind:value={sx.value}
                    step="0.01"
                    min="0"
                    max="10"
                /></label
            >
            <label
                >Y-Scale: <output>{numf.format(sy.value)}</output>
                <input
                    type="range"
                    bind:value={sy.value}
                    step="0.01"
                    min="0"
                    max="10"
                /></label
            >
            <label
                >Z-Scale: <output>{numf.format(sz.value)}</output>
                <input
                    type="range"
                    bind:value={sz.value}
                    step="0.01"
                    min="0"
                    max="10"
                /></label
            >
        </div>

        <div style="flex-grow: 1; flex-shrink: 1; flex-basis: 15em;">
            <label
                >X-Translation: <output>{numf.format(tx.value)}</output>
                <input
                    type="range"
                    bind:value={tx.value}
                    min="-100"
                    max="100"
                /></label
            >
            <label
                >Y-Translation: <output>{numf.format(ty.value)}</output>
                <input
                    type="range"
                    bind:value={ty.value}
                    min="-100"
                    max="100"
                /></label
            >
            <label
                >Z-Translation: <output>{numf.format(tz.value)}</output>
                <input
                    type="range"
                    bind:value={tz.value}
                    min="-900"
                    max="900"
                />
            </label>
        </div>
    </div>
</fieldset>

<style>
    svg {
        user-select: none;
        font-family: inherit;
    }

    .viewport {
        width: 100%;
        height: 50vh;
        cursor: move;
        touch-action: none;
    }
</style>
