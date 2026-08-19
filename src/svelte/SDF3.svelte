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
        pos: [0.0, 2.0, 5.0],
        target: [0.0, 1.0, 0.0],
        background: [0.6, 0.7568627450980392, 0.9450980392156862, 1],
        root: {
            type: "transform",
            translate: [0, 2, -2],
            rotate: [0, 0, 0],
            scale: [1, 1, 1],
            child: {
                type: "union",
                children: [
                    {
                        type: "transform",
                        translate: [-1, 0, 0],
                        rotate: [0, 0, 0],
                        scale: [1, 1, 1],
                        child: {
                            type: "sphere",
                            radius: 1,
                            color: [1, 0, 0, 1],
                            roughness: 0.3,
                            metallic: 0.4,
                        },
                    },
                    {
                        type: "transform",
                        translate: [0, 0, 0],
                        rotate: [0, 0, 0],
                        scale: [0.5, 0.5, 0.5],
                        child: {
                            type: "sphere",
                            radius: 1,
                            color: [0.5, 0.5, 0.5, 1],
                            roughness: 0.0,
                            metallic: 0.1,
                        },
                    },
                    {
                        type: "transform",
                        translate: [1, 0, 0],
                        rotate: [0, 0, 0],
                        scale: [1, 1, 1],
                        child: {
                            type: "sphere",
                            radius: 1,
                            color: [0, 0, 1, 1],
                            roughness: 0.5,
                            metallic: 0.5,
                        },
                    },
                    {
                        type: "plane",
                        normal: [0, 1, 0],
                        offset: -1,
                        color: [0.2, 0.7, 0.1, 1],
                        roughness: 0.5,
                        metallic: 0.5,
                    },
                ],
            },
        },
    });
    function collectSceneUniforms(root) {
        let id = 0;
        const uniforms = {};

        function collect(node) {
            const name = `sdf${id++}`;

            switch (node.type) {
                case "sphere": {
                    uniforms[`${name}_radius`] = node.radius;
                    uniforms[`${name}_color`] = node.color;
                    uniforms[`${name}_roughness`] = node.roughness;
                    uniforms[`${name}_metallic`] = node.metallic;
                    break;
                }

                case "box": {
                    uniforms[`${name}_size`] = node.size;
                    uniforms[`${name}_color`] = node.color;
                    uniforms[`${name}_roughness`] = node.roughness;
                    uniforms[`${name}_metallic`] = node.metallic;
                    break;
                }
                case "plane": {
                    uniforms[`${name}_normal`] = node.normal;
                    uniforms[`${name}_offset`] = node.offset;
                    uniforms[`${name}_color`] = node.color;
                    uniforms[`${name}_roughness`] = node.roughness;
                    uniforms[`${name}_metallic`] = node.metallic;
                    break;
                }

                case "union": {
                    node.children.forEach(collect);
                    break;
                }

                case "difference": {
                    collect(node.a);
                    collect(node.b);
                    break;
                }

                case "intersection": {
                    collect(node.a);
                    collect(node.b);
                    break;
                }

                case "transform": {
                    uniforms[`${name}_translate`] = node.translate;
                    uniforms[`${name}_rotate`] = node.rotate;
                    uniforms[`${name}_scale`] = node.scale;

                    collect(node.child);
                    break;
                }

                case "offset": {
                    collect(node.child);
                    uniforms[`${name}_offset`] = node.offset;
                    break;
                }

                default:
                    throw new Error(`Unknown node type: ${node.type}`);
            }
        }

        collect(root);

        return uniforms;
    }
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
                case "sphere": {
                    const radius = addUniform("float", `${name}_radius`);

                    const color = addUniform("vec4", `${name}_color`);

                    const roughness = addUniform("float", `${name}_roughness`);

                    const metallic = addUniform("float", `${name}_metallic`);

                    functions.push(`
                        SDFResult ${name}(vec3 p) {
                            return SDFResult(
                                length(p) - ${radius},
                                ${color},
                                ${roughness},
                                ${metallic}
                            );
                        }
                    `);

                    return name;
                }

                case "box": {
                    const size = addUniform("vec3", `${name}_size`);

                    const color = addUniform("vec4", `${name}_color`);

                    const roughness = addUniform("float", `${name}_roughness`);

                    const metallic = addUniform("float", `${name}_metallic`);

                    functions.push(`
                        SDFResult ${name}(vec3 p) {
                            vec3 b = 0.5 * ${size};
                            vec3 q = abs(p) - b;

                            return SDFResult(
                                length(max(q, 0.0))
                                    + min(
                                        max(q.x, max(q.y, q.z)),
                                        0.0
                                    ),
                                ${color},
                                ${roughness},
                                ${metallic}
                            );
                        }
                    `);

                    return name;
                }
                case "plane": {
                    const normal = addUniform("vec3", `${name}_normal`);
                    const offset = addUniform("float", `${name}_offset`);

                    const color = addUniform("vec4", `${name}_color`);

                    const roughness = addUniform("float", `${name}_roughness`);

                    const metallic = addUniform("float", `${name}_metallic`);

                    functions.push(`
                                        SDFResult ${name}(vec3 p) {

                                            return SDFResult(dot(p, normalize(${normal})) - ${offset},
                                                ${color},
                                                ${roughness},
                                                ${metallic}
                                            );
                                        }
                                    `);

                    return name;
                }

                case "union": {
                    const children = node.children.map(compile);

                    if (!children.length) {
                        throw new Error("Union must have at least one child");
                    }

                    functions.push(`
                        SDFResult ${name}(vec3 p) {
                            SDFResult d = ${children[0]}(p);

                            ${children
                                .slice(1)
                                .map(
                                    (child) => `
                                        d = sdf_union(
                                            d,
                                            ${child}(p)
                                        );
                                    `,
                                )
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
                        SDFResult ${name}(vec3 p) {
                            SDFResult a = ${a}(p);
                            SDFResult b = ${b}(p);

                            return SDFResult(
                                max(a.d, -b.d),
                                a.color,
                                a.roughness,
                                a.metallic
                            );
                        }
                    `);

                    return name;
                }

                case "intersection": {
                    const a = compile(node.a);
                    const b = compile(node.b);

                    functions.push(`
                        SDFResult ${name}(vec3 p) {
                            SDFResult a = ${a}(p);
                            SDFResult b = ${b}(p);

                            return SDFResult(
                                max(a.d, b.d),
                                a.color,
                                a.roughness,
                                a.metallic
                            );
                        }
                    `);

                    return name;
                }

                case "transform": {
                    const translate = addUniform("vec3", `${name}_translate`);

                    const rotate = addUniform("vec3", `${name}_rotate`);

                    const scale = addUniform("vec3", `${name}_scale`);

                    const child = compile(node.child);

                    functions.push(`
                        SDFResult ${name}(vec3 p) {
                            vec3 q = p;

                            q -= ${translate};

                            q = rotateXYZ(q, -${rotate});

                            q /= ${scale};

                            SDFResult r =${child}(q);
                            r.d = r.d ;
                            return r;
                        }
                    `);

                    return name;
                }

                case "offset": {
                    const child = compile(node.child);

                    const offset = addUniform("float", `${name}_offset`);

                    functions.push(`
                        SDFResult ${name}(vec3 p) {
                            SDFResult c = ${child}(p);

                            return SDFResult(
                                c.d - ${offset},
                                c.color,
                                c.roughness,
                                c.metallic
                            );
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

    const compiledScene = view(["root", compileScene], scene);

    const sceneCode = view("code", compiledScene);
    const sceneCodeRoot = view("root", compiledScene);
    const sceneUniforms = view("uniforms", compiledScene);
    const sceneUniformsDelc = view("declarations", compiledScene);

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
        const makeScene = (root, sceneCode, decls, uniformTypes) => {
            const fs = `
             precision mediump float;
             uniform vec2 screen;
             uniform vec3 pos;
             uniform vec3 target;
             uniform float time;
             uniform vec4 foreground;
             uniform vec4 background;

             ${decls}

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
             vec3 rotateXYZ(vec3 p, vec3 r) {
                 // X
                 float cx = cos(r.x);
                 float sx = sin(r.x);

                 p = vec3(
                     p.x,
                     cx * p.y - sx * p.z,
                     sx * p.y + cx * p.z
                 );

                 // Y
                 float cy = cos(r.y);
                 float sy = sin(r.y);

                 p = vec3(
                     cy * p.x + sy * p.z,
                     p.y,
                     -sy * p.x + cy * p.z
                 );

                 // Z
                 float cz = cos(r.z);
                 float sz = sin(r.z);

                 p = vec3(
                     cz * p.x - sz * p.y,
                     sz * p.x + cz * p.y,
                     p.z
                 );

                 return p;
             }


             float sdfSphere(vec3 p, float rad) {
                  return length(p) - rad;
              }
              float sdfBox(vec3 p, vec3 b) {
                  vec3 q = abs(p) - b;

                  return length(max(q, 0.0))
                       + min(max(q.x, max(q.y, q.z)), 0.0);

              }

              float sdfPlane(vec3 p, vec3 n, float d) {
                  return dot(p, n) - d;
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
             //
             vec3 rgb2hsv(vec3 c) {
                 float maxC = max(c.r, max(c.g, c.b));
                 float minC = min(c.r, min(c.g, c.b));
                 float d = maxC - minC;

                 float h = 0.0;

                 if (d > 0.00001) {
                     if (maxC == c.r) {
                         h = mod((c.g - c.b) / d, 6.0);
                     } else if (maxC == c.g) {
                         h = (c.b - c.r) / d + 2.0;
                     } else {
                         h = (c.r - c.g) / d + 4.0;
                     }

                     h /= 6.0;

                     if (h < 0.0)
                         h += 1.0;
                 }

                 float s = maxC > 0.0 ? d / maxC : 0.0;

                 return vec3(h, s, maxC);
             }
             vec3 hsv2rgb(vec3 c) {
                 float h = c.x * 6.0;
                 float s = c.y;
                 float v = c.z;

                 float i = floor(h);
                 float f = h - i;

                 float p = v * (1.0 - s);
                 float q = v * (1.0 - s * f);
                 float t = v * (1.0 - s * (1.0 - f));

                 if (i < 1.0)
                     return vec3(v, t, p);

                 if (i < 2.0)
                     return vec3(q, v, p);

                 if (i < 3.0)
                     return vec3(p, v, t);

                 if (i < 4.0)
                     return vec3(p, q, v);

                 if (i < 5.0)
                     return vec3(t, p, v);

                 return vec3(v, p, q);
             }

             vec3 mixHSV(vec3 a, vec3 b, float t) {
                 vec3 ah = rgb2hsv(a);
                 vec3 bh = rgb2hsv(b);

                 float dh = bh.x - ah.x;

                 if (dh > 0.5) {
                     dh -= 1.0;
                 }

                 if (dh < -0.5) {
                     dh += 1.0;
                 }

                 return hsv2rgb(vec3(
                     fract(ah.x + t * dh),
                     mix(ah.y, bh.y, t),
                     mix(ah.z, bh.z, t)
                 ));
             }
             SDFResult smoothUnion(
                 SDFResult a,
                 SDFResult b,
                 float k
             ) {
                 float h = clamp(
                                  0.5 + 0.5 * (b.d - a.d) / k,
                                  0.0,
                                  1.0
                              );

                 SDFResult result;

                 result.d =
                     mix(b.d, a.d, h)
                     - k * h * (1.0 - h);

                 result.color = vec4(
                     mixHSV(b.color.rgb, a.color.rgb, h),
                     mix(b.color.a, a.color.a, h)
                 );

                 result.roughness =
                     mix(b.roughness, a.roughness, h);

                 result.metallic =
                     mix(b.metallic, a.metallic, h);

                 return result;
             }
             SDFResult sdf_union(
                            SDFResult a,
                            SDFResult b
                        ) {
                           if(a.d < b.d) {
                            return a;
                           } else {
                           return b;
                           }
                        }

             ${sceneCode}

             SDFResult sceneSDF(vec3 p) {
              ${root ? `return ${root}(p);` : "SDFResult r = SDFResult(100.0, vec4(0.0), 0.0, 0.0); return r;"}
             }

             RayHit rayMarch(vec3 ro, vec3 rd) {
                 float t = 0.0;

                 for (int i = 0; i < 500; i++) {
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
             vec4 shade(
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

                 return vec4(color, material.color.a);
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


             void main() {
             vec2 uv =
                 (gl_FragCoord.xy - 0.5 * screen)
                 / min(screen.x, screen.y);

                 vec3 upHint = vec3(0.0, 1.0, 0.0);

                 vec3 forward = normalize(target - pos);
                 vec3 side    = normalize(cross(forward, upHint));
                 vec3 up      = cross(side, forward);

                 vec3 ro = pos;

                 vec3 rd = normalize(
                     uv.x * side +
                     uv.y * up +
                     1.5 * forward
                 );

             RayHit hit = rayMarch(ro, rd);

             if (hit.t < 0.0) {
                 gl_FragColor = background + 0.1 * (gl_FragCoord.y / screen.y);
                 return;
             }

             vec3 p = ro + rd * hit.t;
             vec3 n = sceneNormal(p);

             vec4 color = shade(
                 p,
                 n,
                 rd,
                 hit.material
             );

             gl_FragColor = mix(
                 background,
                 color,
                 color.a
             );
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
                    time: regl.context("time"),
                    pos: ({ pos = [0.0, 2.0, 5.0] }) => scene.value.pos || pos,
                    target: ({ pos = [1.0, 0.0, 1.0] }) =>
                        scene.value.target || target,
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
        let drawScene = makeScene(
            "",
            sceneCode.value,
            sceneUniformsDelc.value,
            sceneUniforms.value,
        );
        $effect(() => {
            drawScene = makeScene(
                sceneCodeRoot.value,
                sceneCode.value,
                untrack(() => sceneUniformsDelc.value),
                sceneUniforms.value,
            );
            return () => {
                drawScene.destroy();
            };
        });

        const tick = regl.frame(() => {
            const width = Math.round(reglCanvas.clientWidth);
            const height = Math.round(reglCanvas.clientHeight);

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
    const background = $derived(
        failableView(["background", L.valueOr([0, 0, 0, 1])], scene),
    );
    const backgroundHex = $derived(failableView([rgbaHex], background));

    const posX = $derived(view(["pos", 0], scene));
    const posY = $derived(view(["pos", 1], scene));
    const posZ = $derived(view(["pos", 2], scene));
    const targetX = $derived(view(["target", 0], scene));
    const targetY = $derived(view(["target", 1], scene));
    const targetZ = $derived(view(["target", 2], scene));

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

<label class={{ error: backgroundHex.hasError, "color-picker": true }}
    ><span class="label">Background</span>
    <span class="ctrl">
        <input type="text" bind:value={backgroundHex.value} />
        <input type="color" bind:value={backgroundHex.value} />
    </span>
</label>
<fieldset>
    <legend>Cam</legend>
    <label style="display: flex; gap: 1ex">
        Pos X
        <input
            type="range"
            style="flex-grow: 1;"
            bind:value={posX.value}
            min="-2"
            max="2"
            step="0.01"
        />
        <input type="text" bind:value={posX.value} />
    </label>
    <label style="display: flex; gap: 1ex">
        Pos Y
        <input
            type="range"
            style="flex-grow: 1;"
            bind:value={posY.value}
            min="1.5"
            max="3"
            step="0.01"
        />
        <input type="text" bind:value={posY.value} />
    </label>
    <label style="display: flex; gap: 1ex">
        Pos Z
        <input
            type="range"
            style="flex-grow: 1;"
            bind:value={posZ.value}
            min="-10"
            max="10"
            step="0.01"
        />
        <input type="text" bind:value={posZ.value} />
    </label>
    <label style="display: flex; gap: 1ex">
        target X
        <input
            type="range"
            style="flex-grow: 1;"
            bind:value={targetX.value}
            min="-2"
            max="2"
            step="0.01"
        />
        <input type="text" bind:value={targetX.value} />
    </label>
    <label style="display: flex; gap: 1ex">
        target Y
        <input
            type="range"
            style="flex-grow: 1;"
            bind:value={targetY.value}
            min="-3"
            max="3"
            step="0.01"
        />
        <input type="text" bind:value={targetY.value} />
    </label>
    <label style="display: flex; gap: 1ex">
        target Z
        <input
            type="range"
            style="flex-grow: 1;"
            bind:value={targetZ.value}
            min="-10"
            max="10"
            step="0.01"
        />
        <input type="text" bind:value={targetZ.value} />
    </label>
</fieldset>

{#snippet sceneTreeObject(scene, path)}
    {@const ov = view(path, scene)}
    {@const ot = view("type", ov)}
    {@const o = ov.value}

    {#if o.type == "sphere"}
        {@const radius = view(["radius"], ov)}
        {@const roughness = view(["roughness"], ov)}
        {@const metallic = view(["metallic"], ov)}
        {@const color = failableView(["color"], ov)}
        {@const colorHex = failableView([rgbaHex], color)}
        <fieldset>
            <legend>Sphere</legend>

            <div style="display: flex; gap: 1ex">
                <label>
                    Radius<input
                        type="range"
                        bind:value={radius.value}
                        step="0.01"
                        max="2"
                        min="0"
                    /></label
                >
                <label>
                    metallic<input
                        type="range"
                        bind:value={metallic.value}
                        step="0.01"
                        max="2"
                        min="0"
                    /></label
                >

                <label>
                    roughness<input
                        type="range"
                        bind:value={roughness.value}
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
        {@const transx = view(["translate", 0], ov)}
        {@const transy = view(["translate", 1], ov)}
        {@const transz = view(["translate", 2], ov)}
        {@const scalex = view(["scale", 0], ov)}
        {@const scaley = view(["scale", 1], ov)}
        {@const scalez = view(["scale", 2], ov)}
        {@const rotx = view(["rotate", 0], ov)}
        {@const roty = view(["rotate", 1], ov)}
        {@const rotz = view(["rotate", 2], ov)}
        <fieldset>
            <legend>Transform</legend>

            <div
                style="display: grid; gap: 1ex; grid-template-rows: 1fr 1fr 1fr; grid-auto-flow: column;"
            >
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
                    Transalte Z<input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.01"
                        bind:value={transz.value}
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
                    Scale Z<input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.01"
                        bind:value={scalez.value}
                    /></label
                >
                <label>
                    Rotation X<input
                        type="range"
                        min="-2"
                        max="0.5"
                        step="0.01"
                        bind:value={rotx.value}
                    /></label
                >

                <label>
                    Rotation Y<input
                        type="range"
                        min="-2"
                        max="0.5"
                        step="0.01"
                        bind:value={roty.value}
                    /></label
                >
                <label>
                    Rotation Z<input
                        type="range"
                        min="-2"
                        max="0.5"
                        step="0.01"
                        bind:value={rotz.value}
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
    {:else if o.type == "offset"}
        {@const offset = view(["offset"], ov)}

        <fieldset>
            <legend> Offset </legend>
            <label>
                Offset<input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.01"
                    bind:value={offset.value}
                /></label
            >

            <div>
                {@render sceneTreeObject(scene, [...path, "child"])}
            </div>
        </fieldset>
    {:else if o.child}
        <fieldset>
            <legend> {o.type} </legend>
            <div>
                {@render sceneTreeObject(scene, [...path, "child"])}
            </div>
        </fieldset>
    {:else if o.children}
        <fieldset>
            <legend> {o.type} </legend>
            {#each o.children as c, i}
                <div>
                    {@render sceneTreeObject(scene, [...path, "children", i])}
                </div>
            {/each}
        </fieldset>
    {/if}
{/snippet}
{@render sceneTreeObject(scene, ["root"])}

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
