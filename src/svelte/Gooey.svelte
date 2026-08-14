<script>
    import { untrack } from "svelte";
    import createREGL from "regl";
    import * as L from "partial.lenses";
    import * as G from "@svatom/basic/generators";
    import * as R from "ramda";
    import * as M from "@svatom/threedee/matrix";
    import * as S from "@svatom/threedee/shader";
    import {
        atom,
        view,
        read,
        update,
        combine,
        failableView,
        bindValue,
        autofocusIf,
    } from "./svatom.svelte.js";
    import clamp from "ramda/src/clamp";
    const clientSize = atom({
        clientWidth: 0,
        clientHeight: 0,
    });
    const clientWidth = view("clientWidth", clientSize);
    const clientHeight = view("clientHeight", clientSize);
    const clientAspect = read(
        ({ clientWidth, clientHeight }) => clientWidth / clientHeight,
        clientSize,
    );

    const scene = atom({
        foreground: [
            0.14901960784313725, 0.6352941176470588, 0.4117647058823529, 1,
        ],
        background: [
            0.9333333333333333, 0.9333333333333333, 0.9333333333333333, 1,
        ],
        goo: 100,
        items: [
            {
                type: "circle",
                cx: -0.016666666915019373,
                cy: -0.11875000176951289,
                r: 0.1,
                ox: 0.006250060473879178,
                oy: -0.2447916315868497,
            },
            {
                cx: -0.10745552674953998,
                cy: -0.5055472684247442,
                r: 0.06785042195204033,
                ox: -0.10624994120250145,
                oy: -0.5510416361503303,
            },
            {
                cx: -0.2501138609551374,
                cy: -0.38314285923488745,
                r: 0.08870503811397856,
                ox: -0.24583327661578852,
                oy: -0.31083345133811235,
            },
            {
                cx: 0.13626531555930177,
                cy: 0.0924318676898448,
                r: 0.1043432165684296,
                ox: 0.11875006215025981,
                oy: 0.02041655359789729,
            },
            {
                cx: -0.3664188931537776,
                cy: -0.5295525504866427,
                r: 0.04880536216678138,
                ox: -0.39791661221534014,
                oy: -0.5420834547840059,
            },
            {
                cx: 0.1707747615333018,
                cy: 0.40905011308757977,
                r: 0.020410364049853285,
                ox: 0.1708333962596953,
                oy: 0.45166656002402306,
            },
            {
                cx: 0.20212513719494518,
                cy: -0.23724080165768835,
                r: 0.030248342165585036,
            },
            {
                cx: -0.19583327587073046,
                cy: 0.2739583761431277,
                r: 0.10031399709807697,
                ox: -0.19583327587073046,
                oy: 0.2739583761431277,
            },
            {
                cx: -0.11874994138876596,
                cy: 0.5427083801478148,
                r: 0.04526311670931689,
            },
            {
                cx: -0.04166660690680146,
                cy: 0.41145837819203734,
                r: 0.07346450672454884,
            },
            {
                cx: 0.15833339607343078,
                cy: -0.19479163084179163,
                r: 0.10027144152468646,
                ox: 0.19583339663222432,
                oy: -0.18229163065552711,
            },
            {
                cx: 0.03333339421078563,
                cy: -0.9447916420176625,
                r: 0.08197377369616898,
            },
            {
                cx: -0.4583332797822853,
                cy: 0.07395837316289544,
                r: 0.1041902718759346,
            },
            {
                cx: -0.6666666162200272,
                cy: 0.03020837251096964,
                r: 0.05687325806240862,
            },
            {
                cx: -0.7020832834144433,
                cy: -0.4510416346602142,
                r: 0.08156261578642879,
            },
            {
                cx: -0.5520832811792691,
                cy: -0.7760416395030916,
                r: 0.02150128003704154,
            },
            {
                cx: -0.3729166118428111,
                cy: -0.8072916399687529,
                r: 0.09399530944104029,
            },
            {
                cx: -0.2541666100732982,
                cy: -0.8197916401550174,
                r: 0.05870602358990981,
            },
            {
                cx: -0.3437499447415272,
                cy: 0.011458372231572866,
                r: 0.04909557260133504,
            },
            {
                cx: -0.3854166120290756,
                cy: 0.8739583850838244,
                r: 0.05213975341004809,
            },
            {
                cx: 0.3895833995193243,
                cy: 0.36770837754011154,
                r: 0.052052693446654905,
            },
            {
                cx: 0.4562500671794017,
                cy: 0.06770837306976318,
                r: 0.0883700892806129,
            },
            {
                cx: 0.37916673269743717,
                cy: -0.4760416350327432,
                r: 0.030449069336246685,
            },
            {
                cx: 0.31041673167298234,
                cy: -0.6072916369885206,
                r: 0.041089866215471386,
            },
            {
                cx: 0.08333339495584369,
                cy: 0.0802083732560277,
                r: 0.056419585033615445,
            },
            {
                cx: 0.1062500619639953,
                cy: -0.1260416298173368,
                r: 0.02495048155524621,
            },
        ],
    });

    const renderGL = (canvasRoot) => {
        const reglCanvas = document.createElement("canvas");
        canvasRoot.appendChild(reglCanvas);
        reglCanvas.classList.add("viewport");

        const regl = createREGL({
            canvas: reglCanvas,
            extensions: ["ANGLE_instanced_arrays"],
            attributes: {
                antialias: true,
                stencil: false,
                premultipliedAlpha: false,
            },
        });

        var reglCamera = regl({
            context: {
                view: ({ tick }) => {
                    return M.makeIdentity();
                },
                projection: ({ viewportWidth, viewportHeight }) => {
                    return M.makeIdentity();
                },

                viewport: () => ({
                    x: 0,
                    y: 0,
                    width: reglCanvas.width,
                    height: reglCanvas.height,
                }),

                viewNormal: () => {
                    return M.makeIdentity();
                },
            },

            uniforms: {
                view: regl.context("view"),
                projection: regl.context("projection"),
                viewport: regl.context("viewport"),
                viewNormal: regl.context("viewNormal"),
            },
        });
        const makeScene = (circleCode, circleDecl, uniformTypes) => {
            const fs = `
             precision mediump float;
             uniform vec2 screen;
             uniform vec4 foreground;
             uniform vec4 background;
             uniform float goo;

             ${circleDecl}
             float smin(float a, float b, float k) {
                 float h = max(k - abs(a - b), 0.0) / k;
                 return min(a, b) - h * h * k * 0.25;
             }

             void main() {
               vec2 p = gl_FragCoord.xy;

               float d = 1e20;

               ${circleCode}

               float alpha = 1.0 - smoothstep(-1.0, 0.0, d);

               gl_FragColor =  mix(background, foreground, alpha);
             }
           `;
            console.log(fs);

            return regl({
                attributes: {
                    position: [
                        [-1, -1],
                        [1, -1],
                        [-1, 1],
                        [1, 1],
                    ],
                },
                elements: [
                    [0, 1, 2],
                    [2, 1, 3],
                ],
                vert: `
                precision mediump float;
                attribute vec2 position;

                void main() {
                  gl_Position = vec4(position, 0.0, 1.0);
                }
              `,

                frag: fs,
                uniforms: {
                    goo: regl.prop("goo"),
                    foreground: ({
                        foreground = [238 / 255, 63 / 255, 16 / 255, 1],
                    }) => scene.value.foreground || foreground,
                    background: ({ background = [1, 1, 1, 1] }) =>
                        scene.value.background || background,
                    view: regl.context("view"),
                    projection: regl.context("projection"),
                    viewport: regl.context("viewport"),
                    viewNormal: regl.context("viewNormal"),
                    screen: ({ viewport }) => [viewport.width, viewport.height],
                    ...Object.fromEntries(
                        uniformTypes.map(([k, v]) => [k, regl.prop(v)]),
                    ),
                },
            });
        };
        let drawScene = makeScene("", "", []);
        const sceneCode = view(
            ({ items }) =>
                items
                    .map(
                        (_, i) => `
                          float di${i} =
                            length(
                              p - (circles[${i}].xy * 0.5 + 0.5) * screen
                            ) - circles[${i}].z * min(screen.x, screen.y);

                          d = smin(d, di${i}, goo);
                        `,
                    )
                    .join("\n"),
            scene,
        );
        const sceneUniforms = view(
            ({ items }) =>
                items.length ? ` uniform vec3 circles[${items.length}];` : "",
            scene,
        );
        const sceneUniformsDelc = view(
            ({ items }) =>
                items.map((_, i) => [`circles[${i}]`, `circles[${i}]`]),
            scene,
        );
        $effect(() => {
            drawScene = makeScene(
                sceneCode.value,
                sceneUniforms.value,
                untrack(() => sceneUniformsDelc.value),
            );
            return () => {
                drawScene.destroy();
            };
        });

        const tick = regl.frame(() => {
            const width = Math.round(
                reglCanvas.clientWidth * window.devicePixelRatio * 2,
            );
            const height = Math.round(
                reglCanvas.clientHeight * window.devicePixelRatio * 2,
            );

            if (reglCanvas.width !== width || reglCanvas.height !== height) {
                reglCanvas.width = width;
                reglCanvas.height = height;
                regl.poll();
            }

            regl.clear({
                color: [0.4, 0.4, 0.4, 1],
                stencil: 1,
                depth: 1.0,
            });
            try {
                reglCamera(() => {
                    drawScene({
                        goo: scene.value.goo,
                        circles: scene.value.items.map(({ cx, cy, r }, i) => [
                            cx,
                            cy,
                            r,
                        ]),
                    });
                });
            } catch (e) {
                console.error(e);
                tick.cancel();
            }
        });

        return () => {
            tick.cancel();
            regl.destroy();
            canvasRoot.removeChild(reglCanvas);
        };
    };
    function svgPoint(svg, event, scale) {
        const sx = scale.x || 1;
        const sy = scale.y || 1;
        const p = new DOMPoint(event.clientX, event.clientY);
        const pp = p.matrixTransform(svg.getScreenCTM().inverse());
        return {
            x: pp.x * sx,
            y: pp.y * sy,
        };
    }
    const items = view(["items", "length"], scene);
    const goo = view(["goo"], scene);
    const newCircle = view(["items", L.appendTo], scene);

    const rgbaHex = L.lens(
        ([r, g, b, a]) => {
            return (
                "#" +
                [r, g, b, a]
                    .map((x) => {
                        const n = Math.round(x * 255);
                        return n.toString(16).padStart(2, "0");
                    })
                    .join("")
            );
        },
        (hex) => {
            try {
                if (hex[0] !== "#") {
                    throw new SyntaxError("invalid hex");
                }
                hex = hex.replace(/^#/, "");

                if (hex.length === 6) hex += "ff";
                else if (hex.length === 3 || hex.length == 8) {
                } else throw new SyntaxError("invalid hex");

                const cs = [
                    parseInt(hex.slice(0, 2), 16) / 255,
                    parseInt(hex.slice(2, 4), 16) / 255,
                    parseInt(hex.slice(4, 6), 16) / 255,
                    parseInt(hex.slice(6, 8), 16) / 255,
                ];
                if (cs.some(isNaN)) {
                    throw new SyntaxError("invalid hex");
                }
                return cs;
            } catch (e) {
                return e;
            }
        },
    );
    const foreground = $derived(
        failableView(["foreground", L.valueOr([0, 0, 0, 1])], scene),
    );
    const background = $derived(
        failableView(["background", L.valueOr([0, 0, 0, 1])], scene),
    );
    const foregroundHex = $derived(failableView([rgbaHex], foreground));
    const backgroundHex = $derived(failableView([rgbaHex], background));

    const sceneJson = $derived(view(L.inverse(L.json({ space: "  " })), scene));
</script>

<h2>Gooey</h2>

<div
    bind:clientWidth={clientWidth.value}
    bind:clientHeight={clientHeight.value}
    class="viewportContainer"
    {@attach renderGL}
>
    <svg
        viewBox="-1 -1 2 2"
        preserveAspectRatio="xMidYMid meet"
        role="button"
        tabindex="-1"
        onpointerup={(evt) => {
            if (evt.isPrimary && evt.pointerType == "mouse") {
                evt.stopPropagation();
                evt.preventDefault();
                evt.currentTarget.setPointerCapture(evt.pointerId);
                newCircle.value = L.get(
                    L.pick({
                        cx: "x",
                        cy: "y",
                        r: "r",
                    }),
                    {
                        ...svgPoint(evt.currentTarget, evt, {
                            x: 1 / clientAspect.value,
                            y: -1,
                        }),
                        r: 0.01 + Math.random() * 0.1,
                    },
                );
            }
        }}
    >
        {#each scene.value.items as { cx, cy, r }, i}
            {@const circle = view(["items", i], scene)}
            {@const circlePos = view(
                [
                    L.pick({
                        cx: ["cx", L.rewrite(clamp(-1, 1))],
                        cy: ["cy", L.rewrite(clamp(-1, 1))],
                        ox: ["ox", L.rewrite(clamp(-1, 1))],
                        oy: ["oy", L.rewrite(clamp(-1, 1))],
                    }),
                    L.setter(({ x, y }, old) => ({
                        ...old,
                        cx: x - (old.ox - old.cx ?? 0),
                        cy: y - (old.oy - old.cy ?? 0),
                        ox: x,
                        oy: y,
                    })),
                ],
                circle,
            )}
            {@const circleRad = view(
                [
                    L.pick({
                        r: ["r", L.rewrite(clamp(0.0, 1))],
                        cx: "cx",
                        cy: "cy",
                        ox: ["ox", L.rewrite(clamp(-1, 1))],
                        oy: ["oy", L.rewrite(clamp(-1, 1))],
                    }),
                    L.setter(({ x, y }, old) => ({
                        ...old,
                        r:
                            old.r +
                            Math.hypot(x - old.cx, y - old.cy) -
                            Math.hypot(old.oy - old.cy, old.ox - old.cx),
                        ox: x,
                        oy: y,
                    })),
                ],
                circle,
            )}
            {@const circleOffset = view(L.pick({ x: "ox", y: "oy" }), circle)}
            <circle
                vector-effect="non-scaling-stroke"
                cx={cx * clientAspect.value}
                cy={-cy}
                r={r * 2}
                fill="transparent"
                stroke-width="2"
                stroke="white"
                opacity="0.08"
                role="button"
                tabindex="-1"
                ondblclick={(evt) => {
                    evt.preventDefault();
                    update(
                        (s) => ({
                            ...s,
                            items: [
                                ...s.items.slice(0, i),
                                ...s.items.slice(i + 1),
                            ],
                        }),
                        scene,
                    );
                }}
                onkeypress={() => {}}
                onpointerdown={(evt) => {
                    if (evt.isPrimary && evt.pointerType == "mouse") {
                        evt.stopPropagation();
                        evt.preventDefault();
                        evt.currentTarget.setPointerCapture(evt.pointerId);
                        circleOffset.value = svgPoint(
                            evt.currentTarget.ownerSVGElement,
                            evt,
                            { x: 1 / clientAspect.value, y: -1 },
                        );
                    }
                }}
                onpointermove={(evt) => {
                    if (evt.currentTarget.hasPointerCapture(evt.pointerId)) {
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (evt.ctrlKey) {
                            circleRad.value = svgPoint(
                                evt.currentTarget.ownerSVGElement,
                                evt,
                                { x: 1 / clientAspect.value, y: -1 },
                            );
                        } else {
                            circlePos.value = svgPoint(
                                evt.currentTarget.ownerSVGElement,
                                evt,
                                { x: 1 / clientAspect.value, y: -1 },
                            );
                        }
                    }
                }}
                onpointerup={(evt) => {
                    if (evt.currentTarget.hasPointerCapture(evt.pointerId)) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    }
                }}
            ></circle>
        {/each}
    </svg>
</div>

<textarea bind:value={sceneJson.value}></textarea>
<label style="display: flex; align-items: center; gap: 1ex"
    >Goo<input
        style="flex-grow: 1;"
        type="range"
        bind:value={goo.value}
        min="1"
        max="100"
        step="1"
    />
    <output style="flex-basis: 4em; text-align: center;">{goo.value}</output>
</label>
<label style="" class={{ error: foregroundHex.hasError, "color-picker": true }}
    ><span class="label">Foreground</span>
    <span class="ctrl">
        <input type="text" bind:value={foregroundHex.value} /><input
            type="color"
            bind:value={foregroundHex.value}
        />
    </span>
</label>
<label style="" class={{ error: backgroundHex.hasError, "color-picker": true }}
    ><span class="label">Background</span>
    <span class="ctrl">
        <input type="text" bind:value={backgroundHex.value} />
        <input type="color" bind:value={backgroundHex.value} />
    </span>
</label>

<button
    style="align-self: center;"
    onclick={() => {
        newCircle.value = {
            cx: Math.random() - 0.5,
            cy: Math.random() - 0.5,
            r: Math.random() / 10 + 0.02,
        };
    }}>Add</button
>

<div
    style="display: flex; padding: 1ex; flex-direction: column; gap: 1ex; flex-wrap: none; max-height: 20em; overflow: auto;"
>
    {#each { length: items.value } as _, i}
        {@const cx = view(["items", i, "cx"], scene)}
        {@const cy = view(["items", i, "cy"], scene)}
        {@const r = view(["items", i, "r"], scene)}
        <fieldset
            style="display: flex; gap: 1em; flex-grow: 1; align-items: center; flex-shrink: 0;"
        >
            <legend
                style="background-color: #111; color: #fff; padding: 0.1ex 1ex 0.1ex 0.1ex"
            >
                <button
                    onclick={() => {
                        update(
                            (s) => ({
                                ...s,
                                items: [
                                    ...s.items.slice(0, i),
                                    ...s.items.slice(i + 1),
                                ],
                            }),
                            scene,
                        );
                    }}>🞭</button
                >
                Circle #{i + 1}
            </legend>
            <label
                style="display: flex; flex-grow: 1; align-items: center; gap: 1ex;"
                >CX<input
                    type="range"
                    bind:value={cx.value}
                    min="-1"
                    max="1"
                    step="0.01"
                />
            </label>
            <label
                style="display: flex; flex-grow: 1; align-items: center; gap: 1ex;"
                >CY<input
                    type="range"
                    bind:value={cy.value}
                    min="-1"
                    max="1"
                    step="0.01"
                />
            </label>
            <label
                style="display: flex; flex-grow: 1; align-items: center; gap: 1ex;"
                >R<input
                    type="range"
                    bind:value={r.value}
                    min="0"
                    max="1"
                    step="0.01"
                />
            </label>
        </fieldset>
    {/each}
</div>

<style>
    .viewportContainer {
        position: relative;
        width: 100%;
        height: auto;
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: 100%;
        height: 20em;
    }
    .viewportContainer > :global(*) {
        grid-area: 1 / 1 / -1 / -1;
        display: block;
        width: 100%;
        height: 100%;
    }
    svg {
        z-index: 10;
    }
    input[type="color"] {
        border: none;
        aspect-ratio: 1 / 1;
        height: 2.5em;
        width: 2.5em;
        padding: 0;
        outline: none;
        margin: 1px;
        flex-grow: 1;
        align-self: stretch;
        background-color: transparent;
    }
    input[type="color"]::-moz-color-swatch {
        border: none;
    }
    .color-picker.error .ctrl {
        outline: 4px solid #ff3333;
    }
    .color-picker {
        display: inline-flex;
        align-items: stretch;
        gap: 0;
        margin: 1ex;
    }
    .color-picker .ctrl {
        border: 1px solid gray;
        padding: 0;
        display: flex;
        align-items: stretch;
    }
    .color-picker .ctrl:focus-within {
        outline: 3px solid royalblue;
    }
    .color-picker input[type="text"] {
        border: none;
        font-family: monospace, monospace;
        outline: none;
        margin: 0;
        padding: 1ex;
    }
    .color-picker .label {
        align-self: center;
        margin-right: 1em;
    }
</style>
