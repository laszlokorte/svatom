import * as M from './matrix'

function propOrDefault(propName, defaultValue = null) {
  return (context, props) => {
    return props[propName] ?? defaultValue
  }
}

function instanceProp(instanceName, propName, defaultValue = null) {
  return (context, props) => {
    return props[instanceName]?.[propName] ?? props[propName] ?? defaultValue
  }
}

export function roundCapJoinGeometry(resolution) {
  return (regl) => {
    const instanceRoundRound = [
          [0, -0.5, 0],
          [0, -0.5, 1],
          [0, 0.5, 1],
          [0, -0.5, 0],
          [0, 0.5, 1],
          [0, 0.5, 0]
        ];
        // Add the left cap.
        for (let step = 0; step < resolution; step++) {
          const theta0 = Math.PI / 2 + ((step + 0) * Math.PI) / resolution;
          const theta1 = Math.PI / 2 + ((step + 1) * Math.PI) / resolution;
          instanceRoundRound.push([0, 0, 0]);
          instanceRoundRound.push([
            0.5 * Math.cos(theta0),
            0.5 * Math.sin(theta0),
            0
          ]);
          instanceRoundRound.push([
            0.5 * Math.cos(theta1),
            0.5 * Math.sin(theta1),
            0
          ]);
        }
        // Add the right cap.
        for (let step = 0; step < resolution; step++) {
          const theta0 = (3 * Math.PI) / 2 + ((step + 0) * Math.PI) / resolution;
          const theta1 = (3 * Math.PI) / 2 + ((step + 1) * Math.PI) / resolution;
          instanceRoundRound.push([0, 0, 1]);
          instanceRoundRound.push([
            0.5 * Math.cos(theta0),
            0.5 * Math.sin(theta0),
            1
          ]);
          instanceRoundRound.push([
            0.5 * Math.cos(theta1),
            0.5 * Math.sin(theta1),
            1
          ]);
        }
        return {
          buffer: regl.buffer(instanceRoundRound),
          count: instanceRoundRound.length
        };
  }
      
}

export function arrowGeometry(size) {
  return (regl) => {
    return {
      buffer: regl.buffer([

        [0,0,1],
        [-size*1.25,size*0.5,1],
        [-size,0,1],

        [0,0,1],
        [-size,0,1],
        [-size*1.25,-size*0.5,1],
      ]),
      count: 6
    }
  }
}

export function circleCapGeometry(size, resolution) {
  return (regl) => {
    const instanceRoundRound = [
        ];
        // Add the right cap.
        for (let step = 0; step < resolution*2; step++) {
          const theta0 = (3 * Math.PI) / 2 + ((step + 0) * Math.PI) / resolution;
          const theta1 = (3 * Math.PI) / 2 + ((step + 1) * Math.PI) / resolution;
          instanceRoundRound.push([-size*0.5, 0, 1]);
          instanceRoundRound.push([
            -size*0.5+size*0.5 * Math.cos(theta0),
            size*0.5 * Math.sin(theta0),
            1
          ]);
          instanceRoundRound.push([
            -size*0.5+size*0.5 * Math.cos(theta1),
            size*0.5 * Math.sin(theta1),
            1
          ]);
        }
        return {
          buffer: regl.buffer(instanceRoundRound),
          count: instanceRoundRound.length
        };
  }
      
}

export function interleavedStrip3D(regl, geometry) {
      const geo = geometry(regl);
      return regl({
        vert: `
          precision highp float;
          attribute vec3 position;
          attribute vec2 shortening;
          attribute vec3 pointA, pointB;
          attribute vec3 normalFaceA, normalFaceB;
          uniform float width;
          uniform vec2 resolution;
          uniform vec3 axisFilter;
          uniform vec3 axisShift;
          uniform mat3 viewNormal, modelMatrixNormal;
          uniform mat4 model, view, projection;

          uniform float dashFrequency;
          varying float texCoord;

          void main() {
            vec3 normalClip0 = normalize(viewNormal * modelMatrixNormal * normalFaceA);
            vec3 normalClip1 = normalize(viewNormal * modelMatrixNormal * normalFaceB);
            vec3 normalDir0 = normalize(-(view * model * vec4(axisFilter*pointA + axisShift, 1.0)).xyz);
            vec3 normalDir1 = normalize(-(view * model * vec4(axisFilter*pointB + axisShift, 1.0)).xyz);
            vec4 clip0 = projection * view * model * vec4(axisFilter*pointA + axisShift, 1.0);
            vec4 clip1 = projection * view * model * vec4(axisFilter*pointB + axisShift, 1.0);
            float normalDir = length(normalFaceA) == 0.0 || dot(normalClip0, normalDir0) > 0.0 || dot(normalClip1, normalDir1) > 0.0 ? 1.0 : -1.0;
            vec2 screen0 = resolution * (0.5 * clip0.xy/clip0.w + 0.5);
            vec2 screen1 = resolution * (0.5 * clip1.xy/clip1.w + 0.5);

          float exceedingShort = sign(max(length(screen1 - screen0), 1.0) - (shortening.x + shortening.y) * width);
          normalDir *= exceedingShort;

            vec2 xBasis = normalize(screen1 - screen0);
            if(pointA==pointB) {
              xBasis = vec2(1.0,0.0);
            }

            vec3 shortenedPosition = vec3(
          (position.x
          -shortening.x*min(sign(position.z - 0.5), 0.0) + 
          -shortening.y*max(sign(position.z - 0.5), 0.0)) * sign(1.0 + exceedingShort)
            ,position.y,
            position.z * sign(1.0 + exceedingShort));

            float adjustedZ = position.z + width * clamp(shortenedPosition.x / max(length(screen1 - screen0), 2.0), -1.0, 1.0);

            vec2 yBasis = vec2(-xBasis.y * normalDir, xBasis.x * normalDir);
            vec2 pt0 = screen0 + width * (shortenedPosition.x * xBasis + shortenedPosition.y * yBasis);
            vec2 pt1 = screen1 + width * (shortenedPosition.x * xBasis + shortenedPosition.y * yBasis);
            vec2 pt = mix(pt0, pt1, shortenedPosition.z);
            vec4 clipOrig = mix(clip0, clip1, position.z);
            vec4 clip = mix(clip0, clip1, adjustedZ);
          float tCo = (adjustedZ - 0.5) * length(screen1 - screen0) / log(resolution.x);
          texCoord = tCo / width;

            gl_Position = vec4(clip.w * (2.0 * pt/resolution - 1.0), clip.z, clip.w);
          }`,

        frag: `
          precision highp float;
          uniform vec4 color;
          uniform float dashFrequency;
          uniform float dashRatio;
          uniform float width;
          varying float texCoord;
          void main() {
            gl_FragColor = vec4(color.rgb, sign(cos(3.141*texCoord*dashFrequency) - 1.0 + 2.0 * dashRatio));
          }`,

        attributes: {
          position: {
            buffer: geo.buffer,
            divisor: 0
          },
          pointA: {
            buffer: instanceProp("segments", "points"),
            divisor: 1,
            offset: (_, props) => ((props.segmentOffset??0) * 6 * Float32Array.BYTES_PER_ELEMENT) + Float32Array.BYTES_PER_ELEMENT * 0,
            stride: Float32Array.BYTES_PER_ELEMENT * 6
          },
          pointB: {
            buffer: instanceProp("segments", "points"),
            divisor: 1,
            offset: (_, props) => ((props.segmentOffset??0) * 6 * Float32Array.BYTES_PER_ELEMENT) + Float32Array.BYTES_PER_ELEMENT * 3,
            stride: Float32Array.BYTES_PER_ELEMENT * 6
          },

          normalFaceA: {
            buffer: instanceProp("segments", "normals"),
            divisor: 1,
            offset: (_, props) => ((props.segmentOffset??0) * 6 * Float32Array.BYTES_PER_ELEMENT) + Float32Array.BYTES_PER_ELEMENT * 0,
            stride: Float32Array.BYTES_PER_ELEMENT * 6
          },
          normalFaceB: {
            buffer: instanceProp("segments", "normals"),
            divisor: 1,
            offset: (_, props) => ((props.segmentOffset??0) * 6 * Float32Array.BYTES_PER_ELEMENT) + Float32Array.BYTES_PER_ELEMENT * 3,
            stride: Float32Array.BYTES_PER_ELEMENT * 6
          },
          shortening: {
            buffer: instanceProp("segments", "shortenings"),
            divisor: 1,
            offset: (_, props) => ((props.segmentOffset??0) * 4 * Float32Array.BYTES_PER_ELEMENT) + Float32Array.BYTES_PER_ELEMENT * 0,
            stride: Float32Array.BYTES_PER_ELEMENT * 2
          },
        },

        uniforms: {
          width: propOrDefault("width", 1),
          axisFilter: propOrDefault("axisFilter", [1,1,1]),
          axisShift: propOrDefault("axisShift", [0,0,0]),
          color: propOrDefault("color", [0,0,0,1]),
          model: propOrDefault("model", M.makeIdentity()),
          resolution: (context, prop) => {
            return prop.resolution ?? [context.viewport.width, context.viewport.height]
          },
          modelMatrixNormal: propOrDefault("modelMatrixNormal", M.makeIdentity()),
          dashFrequency: propOrDefault("dashFrequency", 0),
          dashRatio: propOrDefault("dashRatio", 1),
        },

        depth: {
          enable: propOrDefault("depth", false),
          func: propOrDefault("depthFunc", "always"),
        },

        polygonOffset: {
          enable: propOrDefault("polygonOffsetEnabled", true),
          offset: {
            factor: propOrDefault("depthOffsetFactor", 0),
            units: propOrDefault("depthOffsetUnits", 0)
          }
        },

        cull: {
          enable: propOrDefault("cullEnabled", true),
          face: propOrDefault("cullFace", 'back')
        },

        blend: {
          enable: true,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 'one minus src alpha',
            dstAlpha: 1
          },
          equation: {
            rgb: 'add',
            alpha: 'add'
          },
          color: [0, 0, 0, 0]
        },

        stencil: {
          enable: propOrDefault('stencil', false),
          func: {
            cmp: 'equal',
            ref: 0xff,
            mask: (_, props) => 1 << props.stencilId,
          },
          op: {
            fail: 'keep',
            zfail: 'keep',
            zpass: 'keep'
          },
        },

        count: geo.count,
        instances: (_,props) => props["segments"]?.["count"] ?? props["segments"]
      });
    }

export function makeColorShader(regl) {
  return regl({
        frag: `
        precision mediump float;
        uniform vec4 color;
        varying vec4 faceColor;
        void main () {
          vec3 base = color.rgb * color.a;
    vec3 accent = faceColor.rgb * faceColor.a;

    vec3 outColor = base + accent; // optionally clamp or tone-map
    float outAlpha = max(color.a, faceColor.a);

    gl_FragColor = vec4(outColor, outAlpha);
        }`,
    vert: `
        precision mediump float;
        attribute vec3 position;
        attribute vec4 vertexColor;
        varying vec4 faceColor;
        uniform vec4 color;
        uniform mat4 model, projection, view;
        void main() {
          gl_Position = projection * view * model * vec4(position, 1);
          faceColor = vertexColor;
        }`,
        attributes: {
          position: propOrDefault('positions'),
          vertexColor: propOrDefault('colors'),
        },
        cull: {
          enable: propOrDefault("cullEnabled", true),
          face: propOrDefault("cullFace", 'back')
        },

        uniforms: {
          color: propOrDefault("color", [0.5,0.6,0.5,1]),
          model: propOrDefault("model", M.makeIdentity()),
        },
        depth: {
          enable: propOrDefault("depth", false),
          func: propOrDefault("depthFunc", "always"),
        },
        polygonOffset: {
          enable: propOrDefault("polygonOffsetEnabled", true),
          offset: {
            factor: propOrDefault("depthOffsetFactor", 0),
            units: propOrDefault("depthOffsetUnits", 0)
          }
        },

        blend: {
          enable: propOrDefault('blend'),
          func: {
            srcRGB: 'one',
            dstRGB: 'one minus src alpha',
            srcAlpha: 'one',
            dstAlpha: 'one minus src alpha'
          },
          equation: {
            rgb: 'add',
            alpha: 'add'
          },
          color: [0, 0, 0, 0]
        },

        elements: propOrDefault("elements"),
      })
}


export function makeCubeBuffers(regl, w2, h2, d2) {
  return {
    vertices: regl.buffer([
      [-w2, +h2, +d2],
      [+w2, +h2, +d2],
      [+w2, -h2, +d2],
      [-w2, -h2, +d2], // positive z face.
      [+w2, +h2, +d2],
      [+w2, +h2, -d2],
      [+w2, -h2, -d2],
      [+w2, -h2, +d2], // positive x face
      [+w2, +h2, -d2],
      [-w2, +h2, -d2],
      [-w2, -h2, -d2],
      [+w2, -h2, -d2], // negative z face
      [-w2, +h2, -d2],
      [-w2, +h2, +d2],
      [-w2, -h2, +d2],
      [-w2, -h2, -d2], // negative x face.
      [-w2, +h2, -d2],
      [+w2, +h2, -d2],
      [+w2, +h2, +d2],
      [-w2, +h2, +d2], // top face
      [-w2, -h2, -d2],
      [+w2, -h2, -d2],
      [+w2, -h2, +d2],
      [-w2, -h2, +d2]  // bottom face
    ]),
    faceColors: regl.buffer([
      [1,0,0],
      [1,0,0],
      [1,0,0],
      [1,0,0], // positive z face.
      [0,1,0],
      [0,1,0],
      [0,1,0],
      [0,1,0], // positive x face
      [0,1,1],
      [0,1,1],
      [0,1,1],
      [0,1,1], // negative z face
      [1,0,1],
      [1,0,1],
      [1,0,1],
      [1,0,1], // negative x face.
      [1,1,0],
      [1,1,0],
      [1,1,0],
      [1,1,0], // top face
      [0,0,1],
      [0,0,1],
      [0,0,1],
      [0,0,1]
    ]),
    faceNormals: regl.buffer([
      [0,0,1],
      [0,0,1],
      [0,0,1],
      [0,0,1], // positive z face.
      [1,0,0],
      [1,0,0],
      [1,0,0],
      [1,0,0], // positive x face
      [0,0,-1],
      [0,0,-1],
      [0,0,-1],
      [0,0,-1], // negative z face
      [-1,0,0],
      [-1,0,0],
      [-1,0,0],
      [-1,0,0], // negative x face.
      [0,1,0],
      [0,1,0],
      [0,1,0],
      [0,1,0], // top face
      [0,-1,0],
      [0,-1,0],
      [0,-1,0],
      [0,-1,0]  // bottom face
    ]),
    uvCoords: regl.buffer([
      [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // positive z face.
      [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // positive x face.
      [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // negative z face.
      [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // negative x face.
      [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // top face
      [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]  // bottom face
    ]),
    elements: regl.elements([
      [2, 1, 0], [2, 0, 3],       // positive z face.
      [6, 5, 4], [6, 4, 7],       // positive x face.
      [10, 9, 8], [10, 8, 11],    // negative z face.
      [14, 13, 12], [14, 12, 15], // negative x face.
      [18, 17, 16], [18, 16, 19], // top face.
      [20, 21, 22], [23, 20, 22]  // bottom face
    ]),
    outline: regl.buffer([
      w2,h2,d2,
      -w2,h2,d2,
      -w2,h2,d2,
      -w2,-h2,d2,
      -w2,-h2,d2,
      w2,-h2,d2,
      w2,-h2,d2,
      w2,h2,d2,

      w2,h2,-d2,
      -w2,h2,-d2,
      -w2,h2,-d2,
      -w2,-h2,-d2,
      -w2,-h2,-d2,
      w2,-h2,-d2,
      w2,-h2,-d2,
      w2,h2,-d2,


      w2,h2,d2,
      w2,h2,-d2,
      -w2,h2,d2,
      -w2,h2,-d2,
      -w2,-h2,d2,
      -w2,-h2,-d2,
      w2,-h2,d2,
      w2,-h2,-d2
    ])
  }
}
