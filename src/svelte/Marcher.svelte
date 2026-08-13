<script>
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
        goo: 30,
        items: [{ type: "circle", cx: 0, cy: 0, r: 0.1 }],
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
        const makeScene = (items) => {
            const circleCode = items
                .map(
                    (_, i) => `
                  float di${i} =
                    length(
                      p - (circles[${i}].xy * 0.5 + 0.5) * screen
                    ) - circles[${i}].z * min(screen.x, screen.y);

                  d = smin(d, di${i}, goo);
                `,
                )
                .join("\n");
            const circleDecl = items.length
                ? ` uniform vec3 circles[${items.length}];`
                : "";

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
                    }) => foreground,
                    background: ({ background = [1, 1, 1, 1] }) => background,
                    view: regl.context("view"),
                    projection: regl.context("projection"),
                    viewport: regl.context("viewport"),
                    viewNormal: regl.context("viewNormal"),
                    screen: ({ viewport }) => [viewport.width, viewport.height],
                    ...Object.fromEntries(
                        items.map((_, i) => [
                            `circles[${i}]`,
                            regl.prop(`circles[${i}]`),
                        ]),
                    ),
                },
            });
        };
        let drawScene = makeScene([]);
        $effect(() => {
            drawScene = makeScene(scene.value.items);
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
</script>

<h2>Raytracer</h2>

<div
    bind:clientWidth={clientWidth.value}
    bind:clientHeight={clientHeight.value}
    class="viewportContainer"
    {@attach renderGL}
>
    <svg viewBox="-1 -1 2 2" preserveAspectRatio="xMidYMid meet">
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
            {@const circleOffset = view(L.pick({ x: "ox", y: "oy" }), circle)}
            <circle
                vector-effect="non-scaling-stroke"
                stroke-width="1px"
                cx={cx * clientAspect.value}
                cy={-cy}
                r={r * 2}
                fill="transparent"
                stroke="none"
                role="button"
                tabindex="-1"
                onkeypress={() => {}}
                onpointerdown={(evt) => {
                    if (evt.isPrimary && evt.pointerType == "mouse") {
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
                        circlePos.value = svgPoint(
                            evt.currentTarget.ownerSVGElement,
                            evt,
                            { x: 1 / clientAspect.value, y: -1 },
                        );
                    }
                }}
            ></circle>
        {/each}
    </svg>
</div>
<label
    >Goo<input type="range" bind:value={goo.value} min="1" max="100" step="1" />
    <output>{goo.value}</output>
</label>
<div
    style="display: flex; padding: 1ex; flex-direction: row; gap: 1ex; flex-wrap: wrap;"
>
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
    {#each { length: items.value } as _, i}
        {@const cx = view(["items", i, "cx"], scene)}
        {@const cy = view(["items", i, "cy"], scene)}
        {@const r = view(["items", i, "r"], scene)}
        <fieldset style="flex-basis: 10em;">
            <legend>Circle #{i + 1}</legend>
            <label
                >CX<input
                    type="range"
                    bind:value={cx.value}
                    min="-1"
                    max="1"
                    step="0.01"
                />
            </label>
            <label
                >CY<input
                    type="range"
                    bind:value={cy.value}
                    min="-1"
                    max="1"
                    step="0.01"
                />
            </label>
            <label
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
</style>
