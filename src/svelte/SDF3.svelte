<script>
    import { untrack } from "svelte";
    import createREGL from "regl";
    import * as L from "partial.lenses";
    import * as G from "@svatom/basic/generators";
    import * as R from "ramda";
    import * as M from "@svatom/threedee/matrix";
    import * as S from "@svatom/threedee/shader";
    import { atom, view, read, update, failableView } from "./svatom.svelte.js";
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
            0.14901960784313725, 0.6352941176470588, 0.4117647058823529, 0.1,
        ],
        background: [
            0.9333333333333333, 0.9333333333333333, 0.9333333333333333, 1,
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

             struct SDFResult {
                 float d;
                 vec4 color;
                 float roughness;
                 float metallic;
             };
             struct RayHit {
                 float t;
                 SDFResult material;
             };


             float sdfSphere(vec3 p, float rad) {
                  return length(p) - rad;
              }

              float smin(float a, float b, float k) {
                  float h = max(k - abs(a - b), 0.0) / k;
                  return min(a, b) - h * h * k * 0.25;
              }
              float smax(float a, float b, float k) {
                             float h = max(k - abs(a - b), 0.0) / k;
                             return max(a, b) - h * h * k * 0.25;
                         }
             // ─────────────────────────────────────────────
             // Scene
             // ─────────────────────────────────────────────

             SDFResult sceneSDF(vec3 p) {
                SDFResult result;
                float s1 = sdfSphere(p - vec3(0.9,0.2,0.1), 0.7);
                float s2 = sdfSphere(p + vec3(0.8,0.2,0.3), 0.7);
                float s3 = sdfSphere(p + vec3(1.0,0.2,-0.5), 0.3);
                float s4 = sdfSphere(p + vec3(-0.9,-0.2,-1.5), 0.9);
                result.d = smin(smax(s2,-s3, 0.0),smax(s1, -s4, 0.0), 1.0);
                result.color = foreground;
                result.roughness = 0.2;
                result.metallic = 0.3;

                return result;
             }


             // ─────────────────────────────────────────────
             // Ray marching
             // ─────────────────────────────────────────────


             RayHit rayMarch(vec3 ro, vec3 rd) {
                 float t = 0.0;

                 for (int i = 0; i < 100; i++) {
                     vec3 p = ro + rd * t;
                     SDFResult result = sceneSDF(p);

                     if (result.d < 0.001) {
                         RayHit hit;
                         hit.t = t;
                         hit.material = result;
                         return hit;
                     }

                     t += result.d;

                     if (t > 100.0) {
                         break;
                     }
                 }

                 RayHit miss;
                 miss.t = -1.0;
                 return miss;
             }
             vec3 shade(
                 vec3 p,
                 vec3 n,
                 vec3 rd,
                 SDFResult material
             ) {
                 vec3 baseColor = material.color.rgb;

                 vec3 lightPos = vec3(2.0, 3.0, 4.0);
                 vec3 lightDir = normalize(lightPos - p);

                 float diffuse = max(dot(n, lightDir), 0.0);

                 // View direction points from surface toward camera.
                 vec3 viewDir = normalize(-rd);

                 // Simple specular highlight.
                 vec3 halfDir = normalize(lightDir + viewDir);

                 float specular = pow(
                     max(dot(n, halfDir), 0.0),
                     mix(128.0, 4.0, material.roughness)
                 );

                 // Metals use their base color for the specular response.
                 vec3 specularColor = mix(
                     vec3(1.0),
                     baseColor,
                     material.metallic
                 );

                 vec3 diffuseColor =
                     baseColor * (1.0 - material.metallic);


                     float ambient = 0.1;
                 vec3 color =
                     diffuseColor * (ambient + diffuse)
                     + specularColor * specular;

                 // Small ambient term.
                 color += baseColor * 0.5;

                 return color;
             }

             // ─────────────────────────────────────────────
             // Normal
             // ─────────────────────────────────────────────


             vec3 sceneNormal(vec3 p) {
                 float e = 0.001;

                 return normalize(
                     vec3(
                         sceneSDF(p + vec3(e, -e, -e)).d -
                         sceneSDF(p + vec3(-e, -e, -e)).d,

                         sceneSDF(p + vec3(-e, e, -e)).d -
                         sceneSDF(p + vec3(-e, -e, -e)).d,

                         sceneSDF(p + vec3(-e, -e, e)).d -
                         sceneSDF(p + vec3(-e, -e, -e)).d
                     )
                 );
             }

             // ─────────────────────────────────────────────
             // Main
             // ─────────────────────────────────────────────

             void main() {
             vec2 uv =
                 (gl_FragCoord.xy - 0.5 * screen)
                 / min(screen.x, screen.y);

             vec3 ro = vec3(0.0, 0.0, 3.0);
             vec3 rd = normalize(vec3(uv, -1.5));

             RayHit hit = rayMarch(ro, rd);

             if (hit.t < 0.0) {
                 gl_FragColor = background;
                 return;
             }

             vec3 p = ro + rd * hit.t;
             vec3 n = sceneNormal(p);

             vec3 color = shade(
                 p,
                 n,
                 rd,
                 hit.material
             );

             gl_FragColor = vec4(color, 1.0);
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
        let drawScene = makeScene("", "", []);
        const sceneCode = view(({ items }) => "", scene);
        const sceneUniforms = view(({ items }) => "", scene);
        const sceneUniformsDelc = view(({ items }) => [], scene);
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
                    drawScene();
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

<h2>Raytracer</h2>

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
    </svg>
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
</style>
