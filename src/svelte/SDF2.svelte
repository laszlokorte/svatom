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
        root: {
            type: "transform",
            transform: {
                translate: [0.0, -0.15],
                rotate: 0,
                scale: [1, 1],
            },
            child: {
                type: "union",
                children: [
                    {
                        type: "difference",
                        a: {
                            type: "union",
                            children: [
                                // House body
                                {
                                    type: "transform",
                                    transform: {
                                        translate: [0.0, -0.15],
                                        rotate: 0,
                                        scale: [1, 1],
                                    },
                                    child: {
                                        type: "rect",
                                        size: [0.75, 0.55],
                                        color: [0.75, 0.45, 0.25, 1],
                                    },
                                },

                                // Roof
                                {
                                    type: "transform",
                                    transform: {
                                        translate: [0.0, 0.65],
                                        rotate: 0,
                                        scale: [1, 1],
                                    },
                                    child: {
                                        type: "triangle",
                                        size: [0.9, 0.25],
                                        color: [0.7, 0.15, 0.1, 1],
                                    },
                                },
                                {
                                    type: "transform",
                                    transform: {
                                        translate: [0.0, -0.72],
                                        rotate: 0,
                                        scale: [1, 1],
                                    },
                                    child: {
                                        type: "rect",
                                        size: [1.9, 0.02],
                                        color: [0.1, 0.75, 0.1, 1],
                                    },
                                },
                            ],
                        },
                        b: {
                            type: "transform",
                            transform: {
                                translate: [0.0, -0.4],
                                rotate: 0,
                                scale: [1, 1],
                            },
                            child: {
                                type: "rect",
                                size: [0.18, 0.3],
                                color: [0.25, 0.12, 0.05, 1],
                            },
                        },
                    },

                    // Door knob
                    {
                        type: "transform",
                        transform: {
                            translate: [-0.1, -0.4],
                            rotate: 0,
                            scale: [1, 1],
                        },
                        child: {
                            type: "circle",
                            radius: 0.02,
                            color: [1.0, 0.8, 0.2, 1],
                        },
                    },

                    // Sun
                    {
                        type: "transform",
                        transform: {
                            translate: [1.1, 0.9],
                            rotate: 0,
                            scale: [1, 1],
                        },
                        child: {
                            type: "circle",
                            radius: 0.12,
                            color: [1.0, 0.8, 0.1, 1],
                        },
                    },
                ],
            },
        },
    });
    function compileScene(root) {
        let id = 0;
        const functions = [];
        const uniforms = [];
        const declarations = [];

        function addUniform(type, name) {
            declarations.push(`uniform ${type} ${name};`);
            uniforms.push([name, name]);
            return name;
        }

        function compile(node) {
            const name = `sdf${id++}`;

            switch (node.type) {
                case "circle": {
                    const radius = addUniform("float", `${name}_radius`);
                    const color = addUniform("vec4", `${name}_color`);

                    functions.push(`
                      SDFResult ${name}(vec2 p) {
                          return SDFResult(
                              length(p) - ${radius} * min(screen.x, screen.y),
                              ${color}
                          );
                      }
                  `);

                    return name;
                }

                case "rect": {
                    const size = addUniform("vec2", `${name}_size`);
                    const color = addUniform("vec4", `${name}_color`);

                    functions.push(`
                      SDFResult  ${name}(vec2 p) {
                                 vec2 b = 0.5 * ${size} * min(screen.x, screen.y);

                                 vec2 d = abs(p) - b;

                                 return SDFResult(
                                    length(max(d, 0.0))
                                      + min(max(d.x, d.y), 0.0),
                                    ${color}
                                );
                             }
                     `);

                    return name;
                }
                case "triangle": {
                    const size = addUniform("vec2", `${name}_size`);
                    const color = addUniform("vec4", `${name}_color`);

                    functions.push(`
                         SDFResult  ${name}(vec2 p) {
                             vec2 s = ${size} * min(screen.x, screen.y);

                             vec2 a = vec2(-s.x * 0.5, -s.y * 0.5);
                             vec2 b = vec2( s.x * 0.5, -s.y * 0.5);
                             vec2 c = vec2(0.0, s.y * 0.5);

                             return SDFResult(sdTriangle(p, a, b, c),
                                                             ${color}
                                                         );
                         }
                     `);

                    return name;
                }

                case "union": {
                    const children = node.children.map(compile);

                    functions.push(`
              SDFResult  ${name}(vec2 p) {
                SDFResult d = SDFResult(1e20, vec4(0.0));

                ${children
                    .map((child) => `d = sdf_union(d, ${child}(p));`)
                    .join("\n")}

                return d;
              }
            `);

                    return name;
                }

                case "difference": {
                    const a = compile(node.a);
                    const b = compile(node.b);

                    functions.push(`
              SDFResult  ${name}(vec2 p) {

                SDFResult a = ${a}(p);
                SDFResult b = ${b}(p);
                return SDFResult(max(
                  a.d,
                  -b.d
                ), a.color);
              }
            `);

                    return name;
                }

                case "transform": {
                    const translate = addUniform("vec2", `${name}_translate`);

                    const rotate = addUniform("float", `${name}_rotate`);

                    const scale = addUniform("vec2", `${name}_scale`);

                    const child = compile(node.child);

                    functions.push(`
                         SDFResult ${name}(vec2 p) {
                             vec2 q = p;

                             q -= ${translate} * 0.5 * min(screen.x, screen.y);
                             q = rotate(q, -${rotate});
                             q /= ${scale};

                             return ${child}(q);
                         }
                     `);

                    return name;
                }

                default:
                    throw new Error(`Unknown node type: ${node.type}`);
            }
        }

        const rootFn = compile(root);

        return {
            root: rootFn,
            code: functions.join("\n"),
            declarations: declarations.join("\n"),
            uniforms,
        };
    }
    function collectSceneUniforms(root) {
        let id = 0;
        const uniforms = {};

        function walk(node) {
            const name = `sdf${id++}`;

            switch (node.type) {
                case "circle":
                    uniforms[`${name}_radius`] = node.radius;
                    uniforms[`${name}_color`] = node.color;
                    break;
                case "rect":
                    uniforms[`${name}_size`] = node.size;
                    uniforms[`${name}_color`] = node.color;
                    break;
                case "triangle":
                    uniforms[`${name}_size`] = node.size;
                    uniforms[`${name}_color`] = node.color;
                    break;

                case "transform": {
                    uniforms[`${name}_translate`] = node.transform
                        .translate ?? [0, 0];

                    uniforms[`${name}_rotate`] = node.transform.rotate ?? 0;

                    uniforms[`${name}_scale`] = node.transform.scale ?? [1, 1];

                    walk(node.child);
                    break;
                }

                case "union":
                    node.children.forEach(walk);
                    break;

                case "difference":
                    walk(node.a);
                    walk(node.b);
                    break;
            }
        }

        walk(root);

        return uniforms;
    }

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
        const makeScene = (main, funs, uniformDecle, uniformTypes) => {
            const fs = `
             precision mediump float;
             uniform vec2 screen;
             uniform vec4 foreground;
             uniform vec4 background;
             struct SDFResult {
                 float d;
                 vec4 color;
             };
             SDFResult sdf_union(SDFResult a, SDFResult b) {
             SDFResult result;

             result.d = min(a.d, b.d);

             if (a.d < 0.0 && b.d < 0.0) {
                 result.color = b.color;
             } else if (b.d < a.d) {
                 result.color = b.color;
             } else {
                 result.color = a.color;
             }

             return result;
             }

             ${uniformDecle}

             float sdTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
                 vec2 e0 = b - a;
                 vec2 e1 = c - b;
                 vec2 e2 = a - c;

                 vec2 v0 = p - a;
                 vec2 v1 = p - b;
                 vec2 v2 = p - c;

                 vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
                 vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
                 vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);

                 float s = sign(
                     e0.x * e2.y - e0.y * e2.x
                 );

                 vec2 d0 = vec2(
                     dot(pq0, pq0),
                     s * (v0.x * e0.y - v0.y * e0.x)
                 );

                 vec2 d1 = vec2(
                     dot(pq1, pq1),
                     s * (v1.x * e1.y - v1.y * e1.x)
                 );

                 vec2 d2 = vec2(
                     dot(pq2, pq2),
                     s * (v2.x * e2.y - v2.y * e2.x)
                 );

                 vec2 d = min(min(d0, d1), d2);

                 return -sqrt(d.x) * sign(d.y);
             }
             float smin(float a, float b, float k) {
                 float h = max(k - abs(a - b), 0.0) / k;
                 return min(a, b) - h * h * k * 0.25;
             }
             vec2 rotate(vec2 p, float a) {
                 float c = cos(a);
                 float s = sin(a);

                 return vec2(
                     c * p.x - s * p.y,
                     s * p.x + c * p.y
                 );
             }

             ${funs}

             void main() {
             vec2 p =
                     (gl_FragCoord.xy - 0.5 * screen);

               SDFResult result = SDFResult(1e20, background);

               ${main ? ` result = ${main}(p);` : ""}

               float alpha = 1.0 - smoothstep(-1.0, 0.0, result.d);

               gl_FragColor =  mix(background, result.color, alpha);
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
        let drawScene = makeScene("", "", "", []);
        const compiledScene = view(["root", compileScene], scene);
        const sceneCode = view("code", compiledScene);
        const sceneCodeRoot = view("root", compiledScene);
        const sceneUniforms = view("uniforms", compiledScene);
        const sceneUniformsDelc = view("declarations", compiledScene);
        $effect(() => {
            drawScene = makeScene(
                sceneCodeRoot.value,
                sceneCode.value,
                sceneUniformsDelc.value,
                untrack(() => sceneUniforms.value),
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
                color: [0.4, 0.4, 0.4, 1, 1],
                stencil: 1,
                depth: 1.0,
            });
            try {
                reglCamera(() => {
                    drawScene({
                        ...collectSceneUniforms(scene.value.root),
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

<h2>Solid Contructive Geometry</h2>

{#snippet sceneObject(o)}
    {#if o.type == "circle"}
        <circle cx={0} cy={0} r={o.radius * 2} class="dashed" />
    {:else if o.type == "rect"}
        <rect
            x={-o.size[0]}
            y={-o.size[1]}
            width={o.size[0] * 2}
            height={o.size[1] * 2}
            class="dashed"
        />
    {:else if o.type == "triangle"}
        <polygon
            points="{-o.size[0]} {o.size[1]} {o.size[0]}  {o.size[1]}  0 {-o
                .size[1]}"
            class="dashed"
        />
    {:else if o.type == "transform"}
        <g
            transform="translate({o.transform.translate[0]}, {-o.transform
                .translate[1]}) rotate({(-o.transform.rotate / Math.PI) *
                180}) scale({o.transform.scale[0]}, {o.transform.scale[1]})"
        >
            {@render sceneObject(o.child)}
        </g>
    {:else if o.type == "difference"}
        <g>
            {@render sceneObject(o.a)}
            <g fill="red">
                {@render sceneObject(o.b)}
            </g>
        </g>
    {:else if o.type == "union"}
        <g fill="green">
            {#each o.children as c}
                {@render sceneObject(c)}
            {/each}
        </g>
    {/if}
{/snippet}
{#snippet sceneTreeObject(scene, path)}
    {@const ov = view(path, scene)}
    {@const ot = view("type", ov)}
    {@const o = ov.value}
    {#if o.type == "circle"}
        {@const r = view("radius", ov)}
        {@const color = failableView(["color"], ov)}
        {@const colorHex = failableView([rgbaHex], color)}
        <fieldset>
            <legend>circle</legend>
            <div style="display: flex; gap: 1ex">
                <label>
                    Radius<input
                        type="range"
                        bind:value={r.value}
                        min="0"
                        max="0.5"
                        step="0.01"
                    /></label
                >
                <label
                    style=""
                    class={{
                        error: colorHex.hasError,
                        "color-picker": true,
                    }}
                    ><span class="label">Color</span>
                    <span class="ctrl">
                        <input type="text" bind:value={colorHex.value} /><input
                            type="color"
                            bind:value={colorHex.value}
                        />
                    </span>
                </label>
            </div>
        </fieldset>
    {:else if o.type == "rect"}
        {@const width = view(["size", 0], ov)}
        {@const height = view(["size", 1], ov)}
        {@const color = failableView(["color"], ov)}
        {@const colorHex = failableView([rgbaHex], color)}
        <fieldset>
            <legend>rect</legend>

            <div style="display: flex; gap: 1ex">
                <label>
                    Width<input
                        type="range"
                        bind:value={width.value}
                        step="0.01"
                        max="2"
                        min="0"
                    /></label
                >
                <label>
                    Height<input
                        type="range"
                        bind:value={height.value}
                        step="0.01"
                        max="2"
                        min="0"
                    /></label
                >

                <label
                    style=""
                    class={{
                        error: colorHex.hasError,
                        "color-picker": true,
                    }}
                    ><span class="label">Color</span>
                    <span class="ctrl">
                        <input type="text" bind:value={colorHex.value} /><input
                            type="color"
                            bind:value={colorHex.value}
                        />
                    </span>
                </label>
            </div>
        </fieldset>
    {:else if o.type == "triangle"}
        {@const width = view(["size", 0], ov)}
        {@const height = view(["size", 1], ov)}
        {@const color = failableView(["color"], ov)}
        {@const colorHex = failableView([rgbaHex], color)}
        <fieldset>
            <legend>triangle</legend>

            <div style="display: flex; gap: 1ex">
                <label>
                    Width<input
                        type="range"
                        bind:value={width.value}
                        step="0.01"
                        max="2"
                        min="0"
                    /></label
                >
                <label>
                    Height<input
                        type="range"
                        bind:value={height.value}
                        step="0.01"
                        max="2"
                        min="0"
                    /></label
                >

                <label
                    style=""
                    class={{
                        error: colorHex.hasError,
                        "color-picker": true,
                    }}
                    ><span class="label">Color</span>
                    <span class="ctrl">
                        <input type="text" bind:value={colorHex.value} /><input
                            type="color"
                            bind:value={colorHex.value}
                        />
                    </span>
                </label>
            </div>
        </fieldset>
    {:else if o.type == "transform"}
        {@const transx = view(["transform", "translate", 0], ov)}
        {@const transy = view(["transform", "translate", 1], ov)}
        {@const scalex = view(["transform", "scale", 0], ov)}
        {@const scaley = view(["transform", "scale", 1], ov)}
        {@const rot = view(["transform", "rotate"], ov)}
        <fieldset>
            <legend>Transform</legend>

            <div style="display: flex; gap: 1ex;">
                <label>
                    Translate X<input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.01"
                        bind:value={transx.value}
                    /></label
                >
                <label>
                    Transalte Y<input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.01"
                        bind:value={transy.value}
                    /></label
                >
                <label>
                    Scale X<input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.01"
                        bind:value={scalex.value}
                    /></label
                >
                <label>
                    Scale Y<input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.01"
                        bind:value={scaley.value}
                    /></label
                >
                <label>
                    Rotation<input
                        type="range"
                        min="-2"
                        max="0.5"
                        step="0.01"
                        bind:value={rot.value}
                    /></label
                >
            </div>
            <div>
                {@render sceneTreeObject(scene, [...path, "child"])}
            </div>
        </fieldset>
    {:else if o.type == "difference"}
        <fieldset>
            <legend> Difference </legend>
            <div>
                {@render sceneTreeObject(scene, [...path, "a"])}
            </div>
            <div>
                {@render sceneTreeObject(scene, [...path, "b"])}
            </div>
        </fieldset>
    {:else if o.type == "union"}
        <fieldset>
            <legend> Union </legend>
            {#each o.children as c, i}
                <div>
                    {@render sceneTreeObject(scene, [...path, "children", i])}
                </div>
            {/each}
        </fieldset>
    {/if}
{/snippet}

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
    >
        {@render sceneObject(scene.value.root)}
    </svg>
</div>

<div style="max-height: 10em; overflow: auto;">
    {@render sceneTreeObject(scene, ["root"])}
</div>

<textarea bind:value={sceneJson.value}></textarea>

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
    .dashed {
        fill-opacity: 0.2;
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        stroke-dasharray: 4 4;
        stroke-width: 2;
        stroke: none;
        stroke-opacity: 0.2;
    }
    .dashed:hover {
        stroke: black;
    }
</style>
