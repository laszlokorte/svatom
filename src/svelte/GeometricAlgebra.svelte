<script>
    import * as L from "partial.lenses";
    import * as G from "@svatom/basic/generators";
    import * as R from "ramda";
    import * as M from "@svatom/threedee/matrix";
    import * as S from "@svatom/threedee/shader";
    import createREGL from "regl";
    import { parseColor } from "./colors";

    import { atom, view, read, combine, bindValue } from "./svatom.svelte.js";

    const makeGeo = (vector) => {
        const e123root = Math.cbrt(vector.e123);
        const e12root = Math.sqrt(Math.abs(vector.e12)) * Math.sign(vector.e12);
        const e13root = Math.sqrt(Math.abs(vector.e13)) * Math.sign(vector.e13);
        const e23root = Math.sqrt(Math.abs(vector.e23)) * Math.sign(vector.e23);

        const e12rootAbs = Math.abs(e12root);
        const e13rootAbs = Math.abs(e13root);
        const e23rootAbs = Math.abs(e23root);
        const cubePadding = 0.1;
        const cubePaddingCompl = 1 - cubePadding;

        return {
            vertices: [
                { x: 0, y: 0, z: 0 },
                { x: 4, y: 0, z: 0 },

                { x: 0, y: 0, z: 0 },
                { x: 0, y: -4, z: 0 },

                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 4 },

                { x: 0, y: 0, z: 0 },
                { x: vector.e1, y: -vector.e2, z: vector.e3 },

                { x: 0, y: -vector.e2, z: vector.e3 },
                { x: vector.e1, y: 0, z: vector.e3 },
                { x: vector.e1, y: -vector.e2, z: 0 },

                { x: 0, y: 0, z: vector.e3 },
                { x: vector.e1, y: 0, z: 0 },
                { x: 0, y: -vector.e2, z: 0 },

                // 14
                { x: 4, y: 0, z: 0 },
                { x: 0, y: -4, z: 0 },
                { x: 0, y: 0, z: 4 },

                { x: 4, y: -4, z: 0 },
                { x: 0, y: -4, z: 4 },
                { x: 4, y: 0, z: 4 },

                // 20
                {
                    x: 0,
                    y: -(e23rootAbs + e23root) / 2,
                    z: (e23rootAbs - e23root) / 2,
                },
                {
                    x: 0,
                    y: -(e23rootAbs - e23root) / 2,
                    z: (e23rootAbs + e23root) / 2,
                },
                { x: 0, y: -e23rootAbs, z: e23rootAbs },

                // 23
                {
                    x: (e13rootAbs - e13root) / 2,
                    y: 0,
                    z: (e13rootAbs + e13root) / 2,
                },
                {
                    x: (e13rootAbs + e13root) / 2,
                    y: 0,
                    z: (e13rootAbs - e13root) / 2,
                },
                {
                    x: e13rootAbs,
                    y: 0,
                    z: e13rootAbs,
                },

                // 26
                {
                    x: (e12rootAbs + e12rootAbs) / 2,
                    y: -(e12rootAbs - e12rootAbs) / 2,
                    z: 0,
                },
                {
                    x: (e12rootAbs - e12rootAbs) / 2,
                    y: -(e12rootAbs + e12rootAbs) / 2,
                    z: 0,
                },
                {
                    x: e12rootAbs,
                    y: -e12rootAbs,
                    z: 0,
                },

                // 29
                ...(() => {
                    const area =
                        Math.hypot(vector.e12, vector.e23, vector.e13) || 1;
                    const size = Math.sqrt(area);
                    const offset = size / 2;
                    const n = {
                        x: -vector.e23 / area,
                        y: vector.e13 / area,
                        z: -vector.e12 / area,
                    };

                    const len = Math.hypot(n.x, n.y, n.z);

                    if (len === 0)
                        return [
                            {
                                x: 0,
                                y: 0,
                                z: 0,
                            },
                            {
                                x: 0,
                                y: 0,
                                z: 0,
                            },
                            {
                                x: 0,
                                y: 0,
                                z: 0,
                            },
                            {
                                x: 0,
                                y: 0,
                                z: 0,
                            },
                        ];

                    // choose something not parallel to n
                    const a =
                        Math.abs(n.x) < 0.001
                            ? { x: 1, y: 0, z: 0 }
                            : { x: 0, y: 1, z: 0 };

                    // u = normalized(a × n)
                    const u = {
                        x: a.y * n.z - a.z * n.y,
                        y: a.z * n.x - a.x * n.z,
                        z: a.x * n.y - a.y * n.x,
                    };

                    const ulen = Math.hypot(u.x, u.y, u.z);

                    u.x = (u.x / ulen) * size;
                    u.y = (u.y / ulen) * size;
                    u.z = (u.z / ulen) * size;

                    // v = n × u (gives correct orientation)
                    const v = {
                        x: n.y * u.z - n.z * u.y,
                        y: n.z * u.x - n.x * u.z,
                        z: n.x * u.y - n.y * u.x,
                    };

                    v.y *= -1;
                    u.y *= -1;

                    return [
                        {
                            x: -v.x / 2 - u.x / 2 + offset,
                            y: -v.y / 2 - u.y / 2 - offset,
                            z: -v.z / 2 - u.z / 2 + offset,
                        },
                        {
                            x: u.x / 2 - v.x / 2 + offset,
                            y: u.y / 2 - v.y / 2 - offset,
                            z: u.z / 2 - v.z / 2 + offset,
                        },
                        {
                            x: v.x / 2 - u.x / 2 + offset,
                            y: v.y / 2 - u.y / 2 - offset,
                            z: v.z / 2 - u.z / 2 + offset,
                        },
                        {
                            x: u.x / 2 + v.x / 2 + offset,
                            y: u.y / 2 + v.y / 2 - offset,
                            z: u.z / 2 + v.z / 2 + offset,
                        },
                    ];
                })(),

                { x: 0, y: -2, z: 2 },
                { x: 2, y: 0, z: 2 },
                { x: 2, y: -2, z: 0 },

                { x: e123root / 2, y: e123root / 2, z: -e123root / 2 },
                { x: -e123root / 2, y: -e123root / 2, z: -e123root / 2 },
                { x: -e123root / 2, y: e123root / 2, z: e123root / 2 },

                { x: e123root / 2, y: -e123root / 2, z: -e123root / 2 },
                { x: -e123root / 2, y: -e123root / 2, z: e123root / 2 },
                { x: e123root / 2, y: e123root / 2, z: e123root / 2 },

                { x: e123root / 2, y: -e123root / 2, z: e123root / 2 },

                {
                    x: -e123root / 2,
                    y: (e123root / 2) * cubePaddingCompl,
                    z: -(cubePaddingCompl * e123root) / 2,
                },
                {
                    x: -e123root / 2,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: (e123root / 2) * cubePaddingCompl,
                },
                {
                    x: -e123root / 2,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: -(e123root / 2) * cubePaddingCompl,
                },
                {
                    x: -e123root / 2,
                    y: (e123root / 2) * cubePaddingCompl,
                    z: (e123root / 2) * cubePaddingCompl,
                },

                {
                    x: e123root / 2,
                    y: (e123root / 2) * cubePaddingCompl,
                    z: (-cubePaddingCompl * e123root) / 2,
                },
                {
                    x: e123root / 2,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: (e123root / 2) * cubePaddingCompl,
                },
                {
                    x: e123root / 2,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: (-e123root / 2) * cubePaddingCompl,
                },
                {
                    x: e123root / 2,
                    y: (e123root / 2) * cubePaddingCompl,
                    z: (e123root / 2) * cubePaddingCompl,
                },

                {
                    x: -(e123root / 2) * cubePaddingCompl,
                    y: e123root / 2,
                    z: (-cubePaddingCompl * e123root) / 2,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: e123root / 2,
                    z: (e123root / 2) * cubePaddingCompl,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: e123root / 2,
                    z: (e123root / 2) * -cubePaddingCompl,
                },
                {
                    x: (e123root / 2) * -cubePaddingCompl,
                    y: e123root / 2,
                    z: (e123root / 2) * cubePaddingCompl,
                },

                {
                    x: (-e123root / 2) * cubePaddingCompl,
                    y: -e123root / 2,
                    z: (-cubePaddingCompl * e123root) / 2,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: -e123root / 2,
                    z: (e123root / 2) * cubePaddingCompl,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: -e123root / 2,
                    z: (e123root / 2) * -cubePaddingCompl,
                },
                {
                    x: (e123root / 2) * -cubePaddingCompl,
                    y: -e123root / 2,
                    z: (e123root / 2) * cubePaddingCompl,
                },

                {
                    x: (-cubePaddingCompl * e123root) / 2,
                    y: (-e123root / 2) * -cubePaddingCompl,
                    z: -e123root / 2,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: -e123root / 2,
                },
                {
                    x: (e123root / 2) * -cubePaddingCompl,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: -e123root / 2,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: (-e123root / 2) * -cubePaddingCompl,
                    z: -e123root / 2,
                },
                {
                    x: (-cubePaddingCompl * e123root) / 2,
                    y: (-e123root / 2) * -cubePaddingCompl,
                    z: e123root / 2,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: e123root / 2,
                },
                {
                    x: (e123root / 2) * -cubePaddingCompl,
                    y: (-e123root / 2) * cubePaddingCompl,
                    z: e123root / 2,
                },
                {
                    x: (e123root / 2) * cubePaddingCompl,
                    y: (-e123root / 2) * -cubePaddingCompl,
                    z: e123root / 2,
                },

                { x: -e123root / 2, y: 0, z: 0 },
                {
                    x: e123root / 2,
                    y: 0,
                    z: 0,
                },

                { x: 0, y: e123root / 2, z: 0 },
                {
                    x: 0,
                    y: -e123root / 2,
                    z: 0,
                },

                { x: 0, y: 0, z: -e123root / 2 },
                {
                    x: 0,
                    y: 0,
                    z: e123root / 2,
                },

                { x: -e123root / 2, y: e123root / 2, z: -e123root / 2 },
                { x: 0, y: 0, z: 0 },
            ],
            edges: [
                {
                    vertices: [0, 1],
                    faces: [],
                    attrs: {
                        class: "axis",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#axis-arrow)",
                    },
                },

                {
                    vertices: [2, 3],
                    faces: [],
                    attrs: {
                        class: "axis",
                        color: "#00aa00",
                        flip: false,
                        "marker-end": "url(#axis-arrow)",
                    },
                },

                {
                    vertices: [4, 5],
                    faces: [],
                    attrs: {
                        class: "axis",
                        color: "blue",
                        flip: false,

                        "marker-end": "url(#axis-arrow)",
                    },
                },

                {
                    vertices: [6, 7],
                    faces: [],
                    attrs: {
                        class: "vector",
                        color: "#333",
                        flip: false,
                        "stroke-width": 4,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [11, 8],
                    faces: [],
                    attrs: {
                        class: "vector-component-offset",
                        color: "#3332",
                        flip: false,
                    },
                },

                {
                    vertices: [13, 8],
                    faces: [],
                    attrs: {
                        class: "vector-component-offset",
                        color: "#3332",
                        flip: false,
                    },
                },

                {
                    vertices: [13, 10],
                    faces: [],
                    attrs: {
                        class: "vector-component-offset",
                        color: "#3332",
                        flip: false,
                    },
                },

                {
                    vertices: [12, 10],
                    faces: [],
                    attrs: {
                        class: "vector-component-offset",
                        color: "#3332",
                        flip: false,
                    },
                },

                {
                    vertices: [11, 9],
                    faces: [],
                    attrs: {
                        class: "vector-component-offset",
                        color: "#3332",
                        flip: false,
                    },
                },

                {
                    vertices: [12, 9],
                    faces: [],
                    attrs: {
                        class: "vector-component-offset",
                        color: "#3332",
                        flip: false,
                    },
                },

                {
                    vertices: [6, 11],
                    faces: [],
                    attrs: {
                        class: "vector-axis-component",
                        "stroke-width": 3,
                        color: "#00f",
                        opacity: 0.4,
                        flip: false,
                        "marker-end": "url(#axis-arrow)",
                    },
                },

                {
                    vertices: [6, 12],
                    faces: [],
                    attrs: {
                        class: "vector-axis-component",
                        "stroke-width": 3,
                        color: "#f00",
                        opacity: 0.4,
                        flip: false,
                        "marker-end": "url(#axis-arrow)",
                    },
                },
                {
                    vertices: [6, 13],
                    faces: [],
                    attrs: {
                        class: "vector-axis-component",
                        "stroke-width": 3,
                        color: "#0a0",
                        opacity: 0.4,
                        flip: false,
                        "marker-end": "url(#axis-arrow)",
                    },
                },

                {
                    vertices: [8, 7],
                    faces: [],
                    attrs: {
                        class: "vector-component-ortho",
                        color: "#3332",
                        "stroke-dasharray": "10 10",
                        flip: false,
                    },
                },

                {
                    vertices: [9, 7],
                    faces: [],
                    attrs: {
                        class: "vector-component-ortho",
                        color: "#3332",
                        "stroke-dasharray": "10 10",
                        flip: false,
                    },
                },

                {
                    vertices: [10, 7],
                    faces: [],
                    attrs: {
                        class: "vector-component-ortho",
                        color: "#3332",
                        "stroke-dasharray": "10 10",
                        flip: false,
                    },
                },

                {
                    vertices: [6, 8],
                    faces: [],
                    attrs: {
                        class: "vector-component-planar",
                        color: "#000",
                        opacity: 0.3,
                        flip: false,
                        "stroke-dasharray": "3 3",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [6, 9],
                    faces: [],
                    attrs: {
                        class: "vector-component-planar",
                        color: "#000",
                        opacity: 0.3,
                        flip: false,
                        "stroke-dasharray": "3 3",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [6, 10],
                    faces: [],
                    attrs: {
                        class: "vector-component-planar",
                        color: "#000",
                        opacity: 0.3,
                        flip: false,
                        "stroke-dasharray": "3 3",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [31, 32],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "#000",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [29, 31],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "#000",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [30, 29],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "#000",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [32, 30],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "#000",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [6, 20],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [20, 22],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [22, 21],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [21, 6],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [23, 6],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [25, 23],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [24, 25],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [6, 24],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [26, 6],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [26, 28],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [28, 27],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [27, 6],
                    faces: [],
                    attrs: {
                        class: "bivector-orientation",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [36, 73],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [36, 39],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [39, 42],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [42, 41],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [41, 36],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [37, 39],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [73, 37],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [73, 38],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [37, 40],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                {
                    vertices: [38, 40],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },
                {
                    vertices: [38, 41],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },
                {
                    vertices: [42, 40],
                    faces: [],
                    attrs: {
                        class: "blade3-border",
                        color: "#000",
                        flip: false,
                    },
                },

                // oriented face

                {
                    vertices: [43, 46],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [46, 44],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [44, 45],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [45, 43],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [50, 47],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [47, 49],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [49, 48],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [48, 50],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "red",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [51, 53],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [54, 51],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [52, 54],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [53, 52],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [58, 56],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [55, 58],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [57, 55],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [56, 57],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "green",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [63, 66],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [66, 64],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [64, 65],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [65, 63],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [61, 60],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [60, 62],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [62, 59],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [59, 61],
                    faces: [],
                    attrs: {
                        class: "blade3-orientation2",
                        color: "blue",
                        flip: false,
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [14, 17],
                    faces: [],
                    attrs: {
                        color: "blue",
                        opacity: 0.7,
                        class: "bivector-basis-orientation",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [17, 15],
                    faces: [],
                    attrs: {
                        color: "blue",
                        opacity: 0.7,
                        class: "bivector-basis-orientation",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [18, 16],
                    faces: [],
                    attrs: {
                        color: "red",
                        opacity: 0.7,
                        class: "bivector-basis-orientation",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [15, 18],
                    faces: [],
                    attrs: {
                        color: "red",
                        opacity: 0.7,
                        class: "bivector-basis-orientation",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [14, 19],
                    faces: [],
                    attrs: {
                        color: "green",
                        opacity: 0.7,
                        class: "bivector-basis-orientation",
                        "marker-end": "url(#vector-arrow)",
                    },
                },
                {
                    vertices: [19, 16],
                    faces: [],
                    attrs: {
                        color: "green",
                        opacity: 0.5,
                        class: "bivector-basis-orientation",
                        "marker-end": "url(#vector-arrow)",
                    },
                },

                {
                    vertices: [0, 0],
                    faces: [],
                    attrs: {
                        fill: vector.scalar >= 0 ? "black" : "white",
                        "stroke-width": Math.abs(vector.scalar) * 10 + 1,
                        opacity: 0.5,
                        "marker-end": "url(#circlehead)",
                    },
                },

                {
                    vertices: [0, 0],
                    faces: [],
                    attrs: {
                        fill: vector.scalar < 0 ? "black" : "white",
                        "stroke-width": Math.abs(vector.scalar) * 10,
                        opacity: 0.3,
                        "marker-end": "url(#circlehead)",
                    },
                },
            ],
            faces: [
                {
                    vertices: [6, 14, 17, 15],
                    attrs: { color: "blue", opacity: 0.5 },
                },

                {
                    vertices: [6, 16, 18, 15],
                    attrs: { color: "red", opacity: 0.5 },
                },

                {
                    vertices: [6, 14, 19, 16],
                    attrs: { color: "green", opacity: 0.5 },
                },

                //
                {
                    vertices: [6, 20, 22, 21],
                    attrs: { color: "red", opacity: 0.5 },
                },

                {
                    vertices: [6, 23, 25, 24],
                    attrs: { color: "green", opacity: 0.5 },
                },

                {
                    vertices: [6, 26, 28, 27],
                    attrs: { color: "blue", opacity: 0.5 },
                },

                {
                    vertices: [29, 30, 32, 31],
                    attrs: { color: "gray", opacity: 0.5 },
                },

                // e123

                {
                    vertices: [73, 36, 41, 38],
                    attrs: { color: "#ddd", opacity: 0.5 },
                },

                {
                    vertices: [37, 40, 42, 39],
                    attrs: { color: "#ddd", opacity: 0.5 },
                },

                {
                    vertices: [38, 41, 42, 40],
                    attrs: { color: "#ddd", opacity: 0.5 },
                },
                {
                    vertices: [36, 73, 37, 39],
                    attrs: { color: "#ddd", opacity: 0.5 },
                },
                {
                    vertices: [41, 36, 39, 42],
                    attrs: { color: "#ddd", opacity: 0.5 },
                },

                {
                    vertices: [73, 38, 40, 37],
                    attrs: { color: "#ddd", opacity: 0.5 },
                },

                {
                    vertices: [51, 53, 52, 54],
                    attrs: { color: "green", opacity: 0.5 },
                },

                {
                    vertices: [58, 56, 57, 55],
                    attrs: { color: "green", opacity: 0.5 },
                },

                {
                    vertices: [47, 49, 48, 50],
                    attrs: { color: "red", opacity: 0.5 },
                },

                {
                    vertices: [43, 46, 44, 45],
                    attrs: { color: "red", opacity: 0.5 },
                },

                {
                    vertices: [63, 66, 64, 65],
                    attrs: { color: "blue", opacity: 0.5 },
                },

                {
                    vertices: [59, 61, 60, 62],
                    attrs: { color: "blue", opacity: 0.5 },
                },
            ],
            masks: [],
            labels: [
                {
                    vertex: 1,
                    text: ["e1"],
                    attrs: {
                        class: "axis-label",
                        "pointer-events": "none",
                        stroke: "white",
                        "text-anchor": "middle",
                        "stroke-width": "5px",
                        "font-size": "1.4em",
                        fill: "red",
                        transform: "translate(0, -40)",
                    },
                },
                {
                    vertex: 3,
                    text: ["e2"],
                    attrs: {
                        class: "axis-label",
                        "pointer-events": "none",
                        stroke: "white",
                        "text-anchor": "middle",
                        "stroke-width": "5px",
                        "font-size": "1.4em",
                        fill: "#00aa00",
                        transform: "translate(0, -20)",
                    },
                },
                {
                    vertex: 5,
                    text: ["e3"],
                    attrs: {
                        class: "axis-label",
                        "pointer-events": "none",
                        stroke: "white",
                        "text-anchor": "middle",
                        "stroke-width": "5px",
                        "font-size": "1.4em",
                        fill: "blue",
                        transform: "translate(0, -40)",
                    },
                },

                {
                    vertex: 7,
                    text: ["v"],
                    attrs: {
                        class: "vector-label",
                        "pointer-events": "none",
                        stroke: "white",
                        "text-anchor": "middle",
                        "stroke-width": "5px",
                        "font-size": "1.4em",
                        fill: "black",
                        transform: "translate(0, -30)",
                    },
                },
                {
                    vertex: 33,
                    text: ["e23"],
                    attrs: {
                        class: "axis-label",
                        "pointer-events": "none",
                        "text-anchor": "middle",
                        "stroke-width": "2px",
                        "font-size": "1em",
                        fill: "red",
                        transform: "translate(0, -10)",
                    },
                },
                {
                    vertex: 34,
                    text: ["e13"],
                    attrs: {
                        class: "axis-label",
                        "pointer-events": "none",
                        "text-anchor": "middle",
                        "stroke-width": "2px",
                        "font-size": "1em",
                        fill: "green",
                        transform: "translate(0, -10)",
                    },
                },
                {
                    vertex: 35,
                    text: ["e12"],
                    attrs: {
                        class: "axis-label",
                        "pointer-events": "none",
                        "text-anchor": "middle",
                        "stroke-width": "2px",
                        "font-size": "1em",
                        fill: "blue",
                        transform: "translate(0, -10)",
                    },
                },

                //         {
                //             vertex: 67,
                //             text: ["e32"],
                //             attrs: {
                //                 class: "axis-label",
                //                 "pointer-events": "none",
                //                 "text-anchor": "middle",
                //                 "stroke-width": "2px",
                //                 "font-size": "1em",
                //                 fill: "red",
                //                 transform: "translate(0, -10)",
                //             },
                //         },

                //         {
                //             vertex: 68,
                //             text: ["e23"],
                //             attrs: {
                //                 class: "axis-label",
                //                 "pointer-events": "none",
                //                 "text-anchor": "middle",
                //                 "stroke-width": "2px",
                //                 "font-size": "1em",
                //                 fill: "red",
                //                 transform: "translate(0, -10)",
                //             },
                //         },

                //         {
                //             vertex: 69,
                //             text: ["e13"],
                //             attrs: {
                //                 class: "axis-label",
                //                 "pointer-events": "none",
                //                 "text-anchor": "middle",
                //                 "stroke-width": "2px",
                //                 "font-size": "1em",
                //                 fill: "green",
                //                 transform: "translate(0, -10)",
                //             },
                //         },
                //         {
                //             vertex: 70,
                //             text: ["e31"],
                //             attrs: {
                //                 class: "axis-label",
                //                 "pointer-events": "none",
                //                 "text-anchor": "middle",
                //                 "stroke-width": "2px",
                //                 "font-size": "1em",
                //                 fill: "green",
                //                 transform: "translate(0, -10)",
                //             },
                //         },

                //         {
                //             vertex: 71,
                //             text: ["e21"],
                //             attrs: {
                //                 class: "axis-label",
                //                 "pointer-events": "none",
                //                 "text-anchor": "middle",
                //                 "stroke-width": "2px",
                //                 "font-size": "1em",
                //                 fill: "blue",
                //                 transform: "translate(0, -10)",
                //             },
                //         },
                //         {
                //             vertex: 72,
                //             text: ["e12"],
                //             attrs: {
                //                 class: "axis-label",
                //                 "pointer-events": "none",
                //                 "text-anchor": "middle",
                //                 "stroke-width": "2px",
                //                 "font-size": "1em",
                //                 fill: "blue",
                //                 transform: "translate(0, -10)",
                //             },
                //         },
            ],
        };
    };

    const numf = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });
    //const expect = (p, f) => (x) => (p(x) ? f(x) : undefined);
    const expect = (p, f) => (x) => (x === undefined ? x : f(x));

    const {
        camera = atom({
            clip: {
                near: 2,
                far: 400,
            },
            aspectRatio: 1,
            fov: Math.PI / 2 / 10,
            orthogonality: 0,
            eye: {
                tx: 0,
                ty: 0,
                tz: 30,
                rx: (33 / 180) * Math.PI,
                ry: -(33 / 180) * Math.PI,
                rz: 0,
                sx: 1,
                sy: 1,
                sz: 1,
            },
            offset: {
                x: 0,
                y: 0,
                z: 130,
            },
        }),
        screen = atom({
            aspect: "meet",
            alignX: "Mid",
            alignY: "Mid",
            size: {
                x: 100,
                y: 100,
            },
        }),
    } = $props();

    const offsetRect = (o) => [
        L.applyAt("x", L.add(o)),
        L.applyAt("y", L.add(o)),
        L.applyAt("width", L.subtract(2 * o)),
        L.applyAt("height", L.subtract(2 * o)),
    ];

    const lensTranslateBuilder =
        (...axis) =>
        (...deltas) =>
            R.zipWith((ax, d) => L.applyAt(ax, L.add(d)), axis, deltas);

    const lensScaleBuilder =
        (...axis) =>
        (...deltas) =>
            R.zipWith((ax, d) => L.applyAt(ax, L.multiply(d)), axis, deltas);

    const lensRotateBuilder = (ax1, ax2) => (angle) => [
        L.applyAt(
            L.pick({ ax1, ax2 }),
            L.iso(
                expect(R.is(Object), ({ ax1, ax2 }) => ({
                    ax1: ax1 * Math.cos(angle) - ax2 * Math.sin(angle),
                    ax2: ax1 * Math.sin(angle) + ax2 * Math.cos(angle),
                })),
                expect(R.is(Object), ({ ax1, ax2 }) => ({
                    ax1: ax1 * Math.cos(-angle) - ax2 * Math.sin(-angle),
                    ax2: ax1 * Math.sin(-angle) + ax2 * Math.cos(-angle),
                })),
            ),
        ),
    ];

    const lens3dPerspectiveBuilder =
        (ax1, ax2, ax3, ax4) => (fov, aspect, near, far) => {
            const tanfov = 1 / Math.tan(fov / 2);
            const fpn = -(far + near) / (far - near);
            const ftn = -(2 * far * near) / (far - near);

            return [
                L.applyAt(ax1, [L.multiply(tanfov), L.multiply(aspect)]),
                L.applyAt(ax2, L.multiply(tanfov)),
                L.applyAt(
                    L.pick({ ax3, ax4 }),
                    L.iso(
                        ({ ax3, ax4 }) => ({
                            ax3: fpn * ax3 + ftn * ax4,
                            ax4: -ax3,
                        }),
                        ({ ax3, ax4 }) => ({
                            ax3: -ax4,
                            ax4: (ax3 + fpn * ax4) / ftn,
                        }),
                    ),
                ),
            ];
        };

    const lens3dOrthographicBuilder =
        (ax1, ax2, ax3, ax4) => (fov, aspect, near, far) => {
            const tanfov = 1 / Math.tan(fov / 2);

            const top = ((near + far) / 2 / tanfov) * aspect;
            const bottom = -top;
            const right = top / aspect;
            const left = -right;

            const rl = right - left;
            const tb = top - bottom;
            const fn = far - near;

            return [
                L.applyAt(ax1, [
                    L.multiply(2),
                    L.divide(rl),
                    L.add(-(right + left) / rl),
                ]),
                L.applyAt(ax2, [
                    L.multiply(2),
                    L.divide(tb),
                    L.add(-(top + bottom) / tb),
                ]),
                L.applyAt(ax3, [
                    L.multiply(-2),
                    L.divide(fn),
                    L.add(-(far + near) / fn),
                ]),
                L.applyAt(ax4, [R.always(1)]),
            ];
        };

    const lerp = (a, b, t) => b * t + (1 - t) * a;

    const lens3dProjectBuilder =
        (ax1, ax2, ax3, ax4) =>
        (ortho = 0) => [
            L.applyAt(
                L.pick({ ax1, ax2, ax3, ax4 }),
                L.iso(
                    expect(R.is(Object), ({ ax1, ax2, ax3, ax4 }) => ({
                        ax1: ax1 / ax4,
                        ax2: ax2 / ax4,
                        ax3: ax3 / ax4,
                        ax4: ax4,
                    })),
                    expect(R.is(Object), ({ ax1, ax2, ax3, ax4 }) => ({
                        ax1: ax1 * ax4,
                        ax2: ax2 * ax4,
                        ax3: ax3 * ax4,
                        ax4: ax4,
                    })),
                ),
            ),
        ];

    const lens3dTranslate = lensTranslateBuilder("x", "y", "z");
    const lens2dTranslate = lensTranslateBuilder("x", "y", "z");
    const lens3dScale = lensScaleBuilder("x", "y", "z");
    const lens2dScale = lensScaleBuilder("x", "y");
    const lens3dRotateX = lensRotateBuilder("y", "z");
    const lens3dRotateY = lensRotateBuilder("x", "z");
    const lens3dRotateZ = lensRotateBuilder("x", "y");
    const lens2dRotate = lensRotateBuilder("x", "y");
    const lens3dPerspective = lens3dPerspectiveBuilder("x", "y", "z", "w");
    const lens3dOrthographic = lens3dOrthographicBuilder("x", "y", "z", "w");
    const lens3dProject = lens3dProjectBuilder("x", "y", "z", "w");

    const coordPair = L.iso(
        expect(R.is(Object), ({ x, y }) => `${x},${y}`),
        expect(R.is(String), (s) => {
            const [x, y] = s.split(",").map(Number);
            return { x, y };
        }),
    );

    const coordString = L.iso(
        expect(R.is(Array), R.pipe(R.map(L.get(coordPair)), R.join(" "))),
        expect(
            R.is(String),
            R.pipe(
                R.trim,
                R.split(/\s+/),
                R.map((p) => L.set(coordPair, p, p)),
            ),
        ),
    );

    const viewBox = $derived(
        view(["size", ({ x, y }) => `${-x / 2} ${-y / 2} ${x} ${y}`], screen),
    );
    const aspectRatio = $derived(
        view(
            ({ alignX, alignY, aspect }) => `x${alignX}Y${alignY} ${aspect}`,
            screen,
        ),
    );
    const clientWidth = $derived(view(["size", "x"], screen));
    const clientHeight = $derived(view(["size", "y"], screen));

    const debugRect = $derived(
        view(
            [
                "size",
                L.pick({
                    x: ["x", L.subtract(10), L.divide(2), L.negate],
                    y: ["y", L.subtract(10), L.divide(2), L.negate],
                    width: ["x", L.subtract(10)],
                    height: ["y", L.subtract(10)],
                    fill: R.always("red"),
                    opacity: R.always(0.1),
                }),
            ],
            screen,
        ),
    );

    const lensRectEdges = L.lens(
        ({ x, y, width, height }) => [
            {
                x,
                y,
            },
            { x: x + width, y: y },
            { x: x + width, y: y + height },
            { x: x, y: y + height },
        ],
        (edges) => ({
            x: R.min(R.map(R.prop("x"), edges)),
            y: R.min(R.map(R.prop("y"), edges)),
            width:
                R.max(R.map(R.prop("x"), edges)) -
                R.min(R.map(R.prop("x"), edges)),
            height:
                R.max(R.map(R.prop("x"), edges)) -
                R.min(R.map(R.prop("y"), edges)),
        }),
    );

    const debugBounds = $derived(
        view(
            [
                L.pick({
                    points: lensRectEdges,
                }),
            ],
            debugRect,
        ),
    );

    const debugBoundsSvg = $derived(
        view(
            [
                L.pickIn({
                    points: coordString,
                    stroke: R.always("cyan"),
                    fill: R.always("white"),
                    "fill-opacity": R.always("0.1"),
                }),
            ],
            debugBounds,
        ),
    );

    const lensRadToDegree = [L.multiply(180), L.divide(Math.PI)];

    const offset = atom({
        x: 0,
        y: 0,
    });
    const rotation = atom(0);
    const scale = atom({ x: 1, y: 1 });
    const rotationAngle = $derived(view(lensRadToDegree, rotation));

    const debugCircle = $derived(
        view(
            [
                L.pick({
                    fill: R.always("black"),
                    r: R.always(3),
                    cx: ["x"],
                    cy: ["y"],
                }),
            ],
            offset,
        ),
    );

    const rangeX = $derived(
        view(
            [
                "size",
                L.pick({
                    min: ["x", L.divide(2), L.negate],
                    max: ["x", L.divide(2)],
                }),
            ],
            screen,
        ),
    );
    const rangeY = $derived(
        view(
            [
                "size",
                L.pick({
                    min: ["y", L.divide(2), L.negate],
                    max: ["y", L.divide(2)],
                }),
            ],
            screen,
        ),
    );
    const offsetX = $derived(view("x", offset));
    const offsetY = $derived(view("y", offset));
    const scaleX = $derived(view("x", scale));
    const scaleY = $derived(view("y", scale));

    const polygon2DShape = atom({
        points: [
            { x: -400, y: 300 },
            { x: 0, y: -300 },
            { x: 300, y: 100 },
        ],
    });

    const mapIso = (iso) =>
        L.iso(
            expect(R.is(Array), R.map(L.get(iso))),
            expect(R.is(Array), R.zipWith(L.set(iso))),
        );

    const transformChain = ({
        offset: { x, y },
        rotation,
        scale: { x: sx, y: sy },
    }) =>
        mapIso([
            lens2dScale(sx, sy),
            lens2dRotate(rotation),
            lens2dTranslate(x, y),
        ]);

    const polygon2D = $derived(
        view(
            L.choose(({ offset, scale, rotation }) => [
                "poly",
                L.applyAt(
                    "points",
                    transformChain({ offset, scale, rotation }),
                ),
            ]),
            combine({ offset, rotation, scale, poly: polygon2DShape }),
        ),
    );

    function intersect(l1p1, l1p2, l2p1, l2p2) {
        const denom =
            (l1p1.x - l1p2.x) * (l2p1.y - l2p2.y) -
            (l1p1.y - l1p2.y) * (l2p1.x - l2p2.x);
        if (denom === 0) return null; // lines are parallel

        const px =
            ((l1p1.x * l1p2.y - l1p1.y * l1p2.x) * (l2p1.x - l2p2.x) -
                (l1p1.x - l1p2.x) * (l2p1.x * l2p2.y - l2p1.y * l2p2.x)) /
            denom;
        const py =
            ((l1p1.x * l1p2.y - l1p1.y * l1p2.x) * (l2p1.y - l2p2.y) -
                (l1p1.y - l1p2.y) * (l2p1.x * l2p2.y - l2p1.y * l2p2.x)) /
            denom;

        return { x: px, y: py };
    }

    function leftOf(p, edge) {
        const a = edge.from;
        const b = edge.to;
        return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) > 0;
    }

    const clipPolygonEdge = (polygon, edge) => {
        const result = [];

        for (let i = 0; i < polygon.points.length; i++) {
            const j = (i + 1) % polygon.points.length;
            const a = polygon.points[i];
            const b = polygon.points[j];

            const c = intersect(a, b, edge.from, edge.to);

            if (leftOf(b, edge)) {
                if (!leftOf(a, edge)) {
                    result.push(c);
                }

                result.push(b);
            } else if (leftOf(a, edge)) {
                result.push(c);
            }
        }

        return { ...polygon, points: result };
    };

    const polygonEdges = function* (polygon) {
        for (let i = 0; i < polygon.points.length; i++) {
            const j = (i + 1) % polygon.points.length;

            yield { from: polygon.points[i], to: polygon.points[j] };
        }
    };

    const clipPolygonPolygon = (polygonInner, polygonOuter) => {
        return G.reduce(
            clipPolygonEdge,
            polygonInner,
            polygonEdges(polygonOuter),
        );
    };

    const debugPolygon = $derived(
        view(
            L.pickIn({
                points: coordString,
                stroke: R.always("blue"),
                "stroke-dasharray": R.always("10 10"),
                fill: R.always("white"),
                "fill-opacity": R.always("0.3"),
            }),
            polygon2D,
        ),
    );

    const inset = atom(10);

    const debugPolygonClipped = $derived(
        view(
            L.choose(({ inset }) =>
                L.pick({
                    stroke: R.always("purple"),
                    points: [
                        L.applyAt("bounds", [
                            offsetRect(inset),
                            L.pick({ points: lensRectEdges }),
                        ]),
                        ({ poly, bounds }) => clipPolygonPolygon(poly, bounds),
                        "points",
                        coordString,
                    ],
                    fill: R.always("purple"),
                    "stroke-width": R.always(5),
                    "vector-effect": R.always("non-scaling-stroke"),
                    "fill-opacity": R.always("0.1"),
                    "stroke-opacity": R.always(0.5),
                }),
            ),
            combine({ poly: polygon2D, bounds: debugRect, inset }),
        ),
    );

    const ndcCube = atom({
        vertices: [
            { x: -1, y: -1, z: -1, w: 2 },
            { x: -1, y: -1, z: 1, w: 1 },
            { x: -1, y: 1, z: -1, w: 2 },
            { x: -1, y: 1, z: 1, w: 1 },
            { x: 1, y: -1, z: -1, w: 2 },
            { x: 1, y: -1, z: 1, w: 1 },
            { x: 1, y: 1, z: -1, w: 2 },
            { x: 1, y: 1, z: 1, w: 1 },
        ],
        edges: [
            { from: 0, to: 1 },
            { from: 2, to: 3 },
            { from: 4, to: 5 },
            { from: 6, to: 7 },
            { from: 0, to: 2 },
            { from: 2, to: 6 },
            { from: 4, to: 0 },
            { from: 4, to: 6 },
            { from: 1, to: 3 },
            { from: 3, to: 7 },
            { from: 5, to: 1 },
            { from: 5, to: 7 },
        ],
    });

    const lensAddProp = (k, v) => L.iso(R.assoc(k, v), R.dissoc(k));
    const normLength = L.normalize((o) => {
        return L.modify(L.values, R.divide(R.__, L.sum(L.values, o) || 1), o);
    });
    const mainVector = atom({
        scalar: 0,
        e1: 0,
        e2: 0,
        e3: 0,
        e12: 0,
        e13: 0,
        e23: 0,
        e123: 0,
    });
    const worldGeo = view(makeGeo, mainVector);
    const sunLightDir = atom({
        pos: { x: 0, y: 0, z: -100 },
        dir: { x: -1, y: 0.8, z: 0.5 },
    });
    const sunLight = $derived(
        view(
            L.pickIn({
                pos: [],
                dir: [normLength],
            }),
            sunLightDir,
        ),
    );

    const worldTransform = atom({
        tx: 0,
        ty: 0,
        tz: -100,
        rx: 0,
        ry: 0,
        rz: 0,
        sx: 1.1,
        sy: 1.2,
        sz: 1,
    });
    const meshColor = atom("#5fdfb4");
    const meshColorGL = $derived(
        view(
            L.reread((hex) => {
                const digits = hex.slice(1);
                const int = parseInt(digits, 16);
                return [
                    (int >> 16) & 0xff,
                    (int >> 8) & 0xff,
                    (int << 0) & 0xff,
                    255,
                ].map((x) => x / 255);
            }),
            meshColor,
        ),
    );

    const meshColorGLDark = $derived(
        view(
            L.reread((hex) => {
                const digits = hex.slice(1);
                const int = parseInt(digits, 16);
                return [
                    ((int >> 16) & 0xff) * 0.6,
                    ((int >> 8) & 0xff) * 0.6,
                    ((int << 0) & 0xff) * 0.6,
                    255,
                ].map((x) => x / 255);
            }),
            meshColor,
        ),
    );
    const meshColorGLTranslucent = $derived(
        view(
            L.reread((hex) => {
                const digits = hex.slice(1);
                const int = parseInt(digits, 16);
                return [
                    (int >> 16) & 0xff,
                    (int >> 8) & 0xff,
                    (int << 0) & 0xff,
                    100,
                ].map((x) => x / 255);
            }),
            meshColor,
        ),
    );

    const meshColorGLDarker = $derived(
        view(
            L.reread((hex) => {
                const digits = hex.slice(1);
                const int = parseInt(digits, 16);
                return [
                    170 - ((int >> 16) & 0xff) / 3,
                    170 - ((int >> 8) & 0xff) / 3,
                    170 - ((int << 0) & 0xff) / 3,
                    250,
                ].map((x) => x / 255);
            }),
            meshColor,
        ),
    );
    const lensMatrixTransform = (transform) => [
        lens3dScale(transform.sx, transform.sy, transform.sz),
        lens3dRotateX(transform.rx),
        lens3dRotateY(transform.ry),
        lens3dRotateZ(transform.rz),
        lens3dTranslate(transform.tx, transform.ty, transform.tz),
    ];

    const fastMatrixTransform = (v, transform) => {
        const v0 = {
            x: v.x * transform.sx,
            y: v.y * transform.sy,
            z: v.z * transform.sz,
        };

        const v1 = {
            x: v0.x,
            y: v0.y * Math.cos(transform.rx) - v0.z * Math.sin(transform.rx),
            z: v0.y * Math.sin(transform.rx) + v0.z * Math.cos(transform.rx),
        };

        const v2 = {
            x: v1.x * Math.cos(transform.ry) - v1.z * Math.sin(transform.ry),
            y: v1.y,
            z: v1.x * Math.sin(transform.ry) + v1.z * Math.cos(transform.ry),
        };

        const v3 = {
            x: v2.x * Math.cos(transform.rz) - v2.y * Math.sin(transform.rz),
            y: v2.x * Math.sin(transform.rz) + v2.y * Math.cos(transform.rz),
            z: v2.z,
        };

        return {
            x: v3.x + transform.tx,
            y: v3.y + transform.ty,
            z: v3.z + transform.tz,
        };
    };

    const cameraTransform = (camera, screenAspect, translation = true) =>
        L.compose(
            L.inverse(
                L.compose(
                    lens3dScale(camera.eye.sx, camera.eye.sy, camera.eye.sz),
                    lens3dTranslate(
                        camera.offset.x,
                        camera.offset.y,
                        camera.offset.z,
                    ),
                    lens3dRotateX(camera.eye.rx),
                    lens3dRotateY(camera.eye.ry),
                    lens3dRotateZ(camera.eye.rz),
                    lens3dTranslate(
                        -camera.offset.x,
                        -camera.offset.y,
                        -camera.offset.z,
                    ),
                    translation
                        ? lens3dTranslate(
                              camera.eye.tx,
                              camera.eye.ty,
                              camera.eye.tz,
                          )
                        : L.identity,
                ),
            ),
            lensAddProp("w", 1),
            lens3dOrthographic(
                camera.fov,
                camera.aspectRatio * screenAspect,
                camera.clip.near,
                camera.clip.far,
            ),
        );

    const fastCameraTransform = (v, camera, screenAspect) => {
        const v5 = {
            x: v.x + camera.offset.x - camera.eye.tx,
            y: v.y + camera.offset.y - camera.eye.ty,
            z: v.z + camera.offset.z - camera.eye.tz,
        };

        const v4 = {
            x:
                v5.x * Math.cos(-camera.eye.rz) -
                v5.y * Math.sin(-camera.eye.rz),
            y:
                v5.x * Math.sin(-camera.eye.rz) +
                v5.y * Math.cos(-camera.eye.rz),
            z: v5.z,
        };

        const v3 = {
            x:
                v4.x * Math.cos(-camera.eye.ry) -
                v4.z * Math.sin(-camera.eye.ry),
            y: v4.y,
            z:
                v4.x * Math.sin(-camera.eye.ry) +
                v4.z * Math.cos(-camera.eye.ry),
        };

        const v2 = {
            x: v3.x,
            y:
                v3.y * Math.cos(-camera.eye.rx) -
                v3.z * Math.sin(-camera.eye.rx),
            z:
                v3.y * Math.sin(-camera.eye.rx) +
                v3.z * Math.cos(-camera.eye.rx),
        };

        const v1 = {
            x: v2.x - camera.offset.x,
            y: v2.y - camera.offset.y,
            z: v2.z - camera.offset.z,
        };

        const v0 = {
            x: v1.x / camera.eye.sx,
            y: v1.y / camera.eye.sy,
            z: v1.z / camera.eye.sz,
        };

        const projection = [
            M.blendProjections(
                M.makePerspective(
                    (camera.fov / Math.PI) * 180,
                    ((1 / camera.aspectRatio) * 1) / screenAspect,
                    camera.clip.near,
                    camera.clip.far,
                ),
                M.makeOrthographic(
                    (camera.fov / Math.PI) * 180,
                    ((1 / camera.aspectRatio) * 1) / screenAspect,
                    camera.clip.near,
                    camera.clip.far,
                ),
                camera.orthogonality,
            ),
        ].reduce(M.matMulMat);

        const res = {
            x:
                projection[0] * v0.x +
                projection[4] * v0.y +
                projection[8] * v0.z +
                projection[12],
            y:
                projection[1] * v0.x +
                projection[5] * v0.y +
                projection[9] * v0.z +
                projection[13],
            z:
                projection[2] * v0.x +
                projection[6] * v0.y +
                projection[10] * v0.z +
                projection[14],
            w:
                projection[3] * v0.x +
                projection[7] * v0.y +
                projection[11] * v0.z +
                projection[15],
        };

        // const res = {
        //     x: projection[0] * v0.x + projection[1] * v0.y + projection[2] * v0.z + projection[3],
        //     y: projection[4] * v0.x + projection[5] * v0.y + projection[6] * v0.z + projection[7],
        //     z: projection[8] * v0.x + projection[9] * v0.y + projection[10] * v0.z + projection[11],
        //     w: projection[12] * v0.x + projection[13] * v0.y + projection[14] * v0.z + projection[15],
        // };

        //console.log(res)

        return res;
    };

    const ratio = (a, b) => [
        L.pick({ a, b }),
        L.choose(({ a }) => ["b", L.divide(a)]),
    ];

    const screenAspect = $derived(view(["size", ratio("x", "y")], screen));
    const screenSize = $derived(view(["size", L.props("x", "y")], screen));

    const ndcGeo = $derived(
        view(
            L.choose(({ camera, transform, screenAspect }) => {
                return [
                    "geo",
                    L.applyAt("vertices", [
                        mapIso([
                            lensMatrixTransform(transform),
                            cameraTransform(camera, screenAspect),
                        ]),
                    ]),
                ];
            }),
            combine({
                geo: worldGeo,
                transform: worldTransform,
                camera,
                screenAspect,
            }),
        ),
    );

    const ndcGeoFast = $derived(
        view(
            ({ geo, camera, transform, screenAspect }) => {
                const t = L.compose(cameraTransform(camera, screenAspect));

                return {
                    ...geo,
                    vertices: geo.vertices.map((v) => {
                        const r = fastCameraTransform(
                            fastMatrixTransform(v, transform),
                            camera,
                            screenAspect,
                        );

                        return r;
                    }),
                };
            },
            combine({
                geo: worldGeo,
                transform: worldTransform,
                camera,
                screenAspect,
            }),
        ),
    );

    const ndcLight = $derived(
        view(
            L.choose(({ camera, transform, screenAspect }) => {
                return [
                    "light",
                    L.applyAt(
                        L.values,
                        cameraTransform(camera, screenAspect, false),
                    ),
                ];
            }),
            combine({
                light: sunLight,
                camera,
                screenAspect,
            }),
        ),
    );

    const coordPathString = (r) =>
        L.iso(
            expect(
                R.is(Array),
                R.pipe(
                    R.map(
                        ({ x, y }) =>
                            `M ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y}`,
                    ),
                    R.join(" "),
                ),
            ),
            expect(
                R.is(String),
                R.pipe(
                    R.trim(),
                    R.split(","),
                    R.map((s) => {
                        const [x, y] = s.split(",").map(Number);
                        return { x, y };
                    }),
                ),
            ),
        );

    const ndcCubeVertices = $derived(
        view(
            L.choose(
                ({
                    screen: { size },
                    cube: { vertices },
                    camera: { orthogonality },
                }) => {
                    return [
                        "cube",
                        "vertices",
                        mapIso([
                            lens3dProject(orthogonality),
                            lens2dScale(size.x / 2, size.y / 2),
                        ]),
                    ];
                },
            ),
            combine({ screen, cube: ndcCube, camera }),
        ),
    );

    const ndcCubeVertexPath = $derived(
        view(coordPathString(3), ndcCubeVertices),
    );

    const ndcCubeEdgePath = $derived(
        view(
            ({ geo: { edges }, projectedVertices }) => {
                return R.join(
                    " ",
                    R.map(
                        ({ from, to }) =>
                            `M${L.get(coordPair, projectedVertices[from])} L ${L.get(coordPair, projectedVertices[to])}`,
                        edges,
                    ),
                );
            },
            combine({ projectedVertices: ndcCubeVertices, geo: ndcCube }),
        ),
    );

    const ndcPlanes = [
        { axis: "x", sign: +1, offset: -0.2 }, // x ≤ w
        { axis: "x", sign: -1, offset: -0.2 }, // -x ≤ w
        { axis: "y", sign: +1, offset: -0.2 }, // y ≤ w
        { axis: "y", sign: -1, offset: -0.2 }, // -y ≤ w
        { axis: "z", sign: +1, offset: -0.2 }, // z ≤ w
        { axis: "z", sign: -1, offset: -0.2 }, // -z ≤ w
    ];

    const interpolate = (p0, p1, t, k) => p0[k] + (p1[k] - p0[k]) * t;

    const polygonClipper = (poly, { axis, sign, offset }) => {
        const result = [];

        const length = poly.length;

        for (let i = 0; i < length; i++) {
            const j = (i + 1) % poly.length;

            const a = poly[i];
            const b = poly[j];

            const aSign = sign * a[axis] - a.w + offset;
            const bSign = sign * b[axis] - b.w + offset;

            const t = aSign / (aSign - bSign);
            const c = {
                x: interpolate(a, b, t, "x"),
                y: interpolate(a, b, t, "y"),
                z: interpolate(a, b, t, "z"),
                w: interpolate(a, b, t, "w"),
            };

            if (bSign <= 0) {
                if (aSign >= 0) {
                    result.push(c);
                }

                result.push(b);
            } else if (aSign <= 0) {
                result.push(c);
            }
        }

        return result;
    };

    const edgeClipper = (poly, { axis, sign, offset }) => {
        const result = [];

        const length = poly.length;

        for (let i = 0; i < length; i++) {
            const j = (i + 1) % poly.length;

            const a = poly[i];
            const b = poly[j];

            const aSign = sign * a[axis] - a.w + offset;
            const bSign = sign * b[axis] - b.w + offset;

            const t = aSign / (aSign - bSign);
            const c = {
                x: interpolate(a, b, t, "x"),
                y: interpolate(a, b, t, "y"),
                z: interpolate(a, b, t, "z"),
                w: interpolate(a, b, t, "w"),
            };

            if (aSign <= 0) {
                result.push(a);
            } else if (aSign > 0 !== bSign > 0) {
                result.push(c);
            }
        }

        return result;
    };

    const clipFace4D = (clipper) => (polygon) => {
        return ndcPlanes.reduce(clipper, polygon);
    };

    const clipVertex4D = (point) => {
        return R.all(({ axis, sign, offset }) => {
            return sign * point[axis] - point.w + offset < 0;
        }, ndcPlanes);
    };

    const ndcGeoEdgePaths = $derived(
        view(
            L.choose(
                ({
                    screen: { size },
                    geo: { vertices, edges },
                    camera: { orthogonality },
                }) => {
                    const project = L.compose(
                        lens3dProject(orthogonality),
                        lens2dScale(size.x / 2, size.y / 2),
                    );

                    return [
                        "geo",
                        "edges",
                        L.applyAt(
                            L.compose(L.elems, "vertices", L.elems),
                            (i) => vertices[i],
                        ),
                        mapIso(
                            L.applyAt(
                                "vertices",
                                L.compose(
                                    clipFace4D(edgeClipper),
                                    L.applyAt(L.elems, project),
                                ),
                            ),
                        ),
                    ];
                },
            ),
            combine({ screen, geo: ndcGeo, camera }),
        ),
    );

    const lightRay = $derived(
        view(
            L.choose(({ screen: { size }, camera: { orthogonality } }) => {
                const project = L.compose(
                    lens3dProject(orthogonality),
                    lens2dScale(size.x / 2, size.y / 2),
                );

                return ["light", L.applyAt(L.values, project)];
            }),
            combine({ screen, light: ndcLight, camera }),
        ),
    );

    const isClockwise = (points) => {
        return R.pipe(
            R.aperture(3),
            R.map(
                ([a, b, c]) =>
                    (b.y - a.y) * (c.x - b.x) - (c.y - b.y) * (b.x - a.x) >= 0,
            ),
            R.all(R.identity),
        )(points);
    };

    const putProp = (prop, fn) =>
        L.lens(
            (obj) => ({
                ...obj,
                [prop]: fn(obj),
            }),
            ({ [prop]: _, ...rest }) => ({
                ...rest,
            }),
        );

    const ndcGeoFacePaths = $derived(
        view(
            L.choose(
                ({
                    screen: { size },
                    geo: { vertices, faces },
                    camera: { orthogonality },
                }) => {
                    const project = mapIso(
                        L.compose(
                            lens3dProject(orthogonality),
                            lens2dScale(size.x / 2, size.y / 2),
                        ),
                    );

                    return [
                        "geo",
                        "faces",
                        L.applyAt(
                            L.compose(L.elems, "vertices", L.elems),
                            (i) => vertices[i],
                        ),
                        mapIso(
                            L.applyAt(
                                "vertices",
                                L.compose(
                                    clipFace4D(polygonClipper),
                                    project,
                                    L.pick({
                                        clockwise: isClockwise,
                                        points: [],
                                    }),
                                ),
                            ),
                        ),
                    ];
                },
            ),
            combine({ screen, geo: ndcGeo, camera }),
        ),
    );

    const ndcGeoMaskPaths = $derived(
        view(
            L.choose(
                ({
                    screen: { size },
                    geo: { vertices },
                    camera: { orthogonality },
                }) => {
                    const project = mapIso(
                        L.compose(
                            lens3dProject(orthogonality),
                            lens2dScale(size.x / 2, size.y / 2),
                        ),
                    );

                    return [
                        "geo",
                        "masks",
                        L.applyAt(
                            L.compose(L.elems, "vertices", L.elems),
                            (i) => vertices[i],
                        ),
                        mapIso(
                            L.applyAt(
                                "vertices",
                                L.compose(
                                    clipFace4D(polygonClipper),
                                    project,
                                    L.pick({
                                        clockwise: isClockwise,
                                        points: [],
                                    }),
                                ),
                            ),
                        ),
                    ];
                },
            ),
            combine({ screen, geo: ndcGeo, camera }),
        ),
    );

    const ndcGeoVertices = $derived(
        view(
            L.choose(({ screen: { size }, camera: { orthogonality } }) => {
                const project = L.compose(
                    lens3dProject(orthogonality),
                    lens2dScale(size.x / 2, size.y / 2),
                );

                return [
                    "geo",
                    "vertices",
                    R.map((o) => ({ ...o, clipped: !clipVertex4D(o) })),
                    mapIso(project),
                ];
            }),
            combine({ screen, geo: ndcGeo, camera }),
        ),
    );

    const ndcGeoLabels = $derived(
        view(
            L.choose(
                ({
                    screen: { size },
                    geo: { vertices },
                    camera: { orthogonality },
                }) => {
                    const project = L.compose(
                        lens3dProject(orthogonality),
                        lens2dScale(size.x / 2, size.y / 2),
                    );

                    return [
                        "geo",
                        "labels",
                        mapIso([
                            L.applyAt(
                                "vertex",
                                L.compose(
                                    (i) => vertices[i],
                                    (o) => ({
                                        ...o,
                                        clipped: !clipVertex4D(o),
                                    }),
                                    project,
                                    L.props("x", "y", "clipped"),
                                ),
                            ),
                        ]),
                    ];
                },
            ),
            combine({ screen, geo: ndcGeo, camera }),
        ),
    );

    const cameraFoVDeg = $derived(view(["fov", lensRadToDegree], camera));
    const cameraFoVRad = $derived(view(["fov"], camera));
    const cameraAspectRatio = $derived(view(["aspectRatio"], camera));
    const cameraOrtho = $derived(
        view(["orthogonality", L.normalize(R.clamp(0, 1))], camera),
    );

    const cameraEye = $derived(view(["eye"], camera));
    const cameraOffset = $derived(view(["offset"], camera));
    const cameraEyePosX = $derived(view(["tx"], cameraEye));
    const cameraEyePosY = $derived(view(["ty"], cameraEye));
    const cameraEyePosZ = $derived(view(["tz"], cameraEye));
    const cameraOffsetX = $derived(view(["x"], cameraOffset));
    const cameraOffsetY = $derived(view(["y"], cameraOffset));
    const cameraOffsetZ = $derived(view(["z"], cameraOffset));
    const cameraEyeRotX = $derived(view(["rx", lensRadToDegree], cameraEye));
    const cameraEyeRotY = $derived(view(["ry", lensRadToDegree], cameraEye));
    const cameraEyeRotZ = $derived(view(["rz", lensRadToDegree], cameraEye));
    const cameraClipNear = $derived(
        view(
            [
                [
                    "clip",
                    L.choose(({ far }) => ["near", L.normalize(R.min(far))]),
                ],
            ],
            camera,
        ),
    );
    const cameraClipFar = $derived(
        view(
            [
                [
                    "clip",
                    L.choose(({ near }) => ["far", L.normalize(R.max(near))]),
                ],
            ],
            camera,
        ),
    );

    const worldTransformRotX = $derived(
        view(["rx", lensRadToDegree], worldTransform),
    );
    const worldTransformRotY = $derived(
        view(["ry", lensRadToDegree], worldTransform),
    );
    const worldTransformRotZ = $derived(
        view(["rz", lensRadToDegree], worldTransform),
    );

    const worldTransformPosX = $derived(view(["tx"], worldTransform));
    const worldTransformPosY = $derived(view(["ty"], worldTransform));
    const worldTransformPosZ = $derived(view(["tz"], worldTransform));

    const worldTransformScaleX = $derived(view(["sx"], worldTransform));
    const worldTransformScaleY = $derived(view(["sy"], worldTransform));
    const worldTransformScaleZ = $derived(view(["sz"], worldTransform));

    const worldTransformMatrix = $derived(
        view(
            L.reread(({ rx, ry, rz, tx, ty, tz, sx, sy, sz }) => [
                [sx, 0, 0, tx, 0, sy, 0, ty, 0, 0, sz, tz, 0, 0, 0, 1],
            ]),
            worldTransform,
        ),
    );

    const wrapRange = (a, b) => {
        const range_width = b - a;
        return L.normalize(
            (x) => ((((x - a) % range_width) + range_width) % range_width) + a,
        );
    };

    const objectPointerRotate = $derived(
        view(
            L.pick({
                dx: L.cond(
                    [
                        R.pipe(R.prop("rx"), Math.abs, R.lt(Math.PI / 2)),
                        [
                            "ry",
                            wrapRange(-Math.PI, Math.PI),
                            lensRadToDegree,
                            L.setter((a, b) => b + a / 1.5),
                        ],
                    ],
                    [
                        [
                            "ry",
                            wrapRange(-Math.PI, Math.PI),
                            lensRadToDegree,
                            L.setter((a, b) => b - a / 1.5),
                        ],
                    ],
                ),
                dy: [
                    "rx",
                    wrapRange(-Math.PI, Math.PI),
                    lensRadToDegree,
                    L.setter((a, b) => b - a / 1.5),
                ],
            }),
            worldTransform,
        ),
    );

    const cameraFoVWheel = $derived(
        view(
            [
                L.normalize(R.clamp(2, 160)),
                L.setter((a, b) => b * Math.exp(a / 1000)),
            ],
            cameraFoVDeg,
        ),
    );

    const eyePointerRotate = $derived(
        view(
            L.pick({
                dx: [
                    L.choose(({ rx }) =>
                        Math.cos(rx) > 0 ? "ry" : ["ry", L.negate],
                    ),
                    wrapRange(-Math.PI, Math.PI),
                    lensRadToDegree,
                    L.setter((a, b) => b + a / 3),
                ],
                dy: [
                    "rx",
                    wrapRange(-Math.PI, Math.PI),
                    lensRadToDegree,
                    L.setter((a, b) => b + a / 3),
                ],
            }),
            cameraEye,
        ),
    );

    const getCameraUpVector = (rx, ry, rz) => {
        const sinX = Math.sin(rx),
            cosX = Math.cos(rx);
        const sinY = Math.sin(ry),
            cosY = Math.cos(ry);
        const sinZ = Math.sin(rz),
            cosZ = Math.cos(rz);

        // Combine rotations: R = Ry * Rx * Rz
        // Then apply to (0, 1, 0)

        // Intermediate result: (0, 1, 0) rotated by Rz
        const x1 = -sinZ;
        const y1 = cosZ;
        const z1 = 0;

        // Then rotate by Rx
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Then rotate by Ry
        return {
            x: x2 * cosY + z2 * sinY,
            y: y2,
            z: -x2 * sinY + z2 * cosY,
        };
    };

    const eyePointerPan = $derived(
        view(
            L.pick({
                dx: [
                    L.setter((dist, cam) =>
                        R.pipe(
                            R.modify(
                                "tx",
                                R.add(-Math.cos(cam.ry) * dist * 0.1),
                            ),
                            R.modify(
                                "tz",
                                R.add(-Math.sin(cam.ry) * dist * 0.1),
                            ),
                        )(cam),
                    ),
                ],
                dy: L.setter((dist, cam) => {
                    const up = getCameraUpVector(cam.rx, cam.ry, cam.rz);
                    return R.pipe(
                        R.modify("tx", R.add(up.x * dist * 0.1)),
                        R.modify("ty", R.add(-up.y * dist * 0.1)),
                        R.modify("tz", R.add(-up.z * dist * 0.1)),
                    )(cam);
                }),
            }),
            cameraEye,
        ),
    );

    const eyePointerWalk = $derived(
        view(
            L.pick({
                dx: [
                    "tx",
                    wrapRange(-Math.PI, Math.PI),
                    lensRadToDegree,
                    L.setter((a, b) => b),
                ],
                dy: [
                    "tz",
                    wrapRange(-Math.PI, Math.PI),
                    lensRadToDegree,
                    L.setter((a, b) => b - a * 2),
                ],
            }),
            cameraEye,
        ),
    );
    const eyeArrowWalk = $derived(
        view(
            L.pick({
                dx: [
                    L.setter((dist, cam) =>
                        R.pipe(
                            R.modify("tx", R.add(Math.cos(cam.ry) * dist * 2)),
                            R.modify("tz", R.add(Math.sin(cam.ry) * dist * 2)),
                        )(cam),
                    ),
                ],
                dy: [
                    L.setter((dist, cam) =>
                        R.pipe(
                            R.modify(
                                "tz",
                                R.add(
                                    -Math.cos(cam.ry) *
                                        Math.cos(cam.rx) *
                                        dist *
                                        2,
                                ),
                            ),
                            R.modify(
                                "tx",
                                R.add(
                                    Math.sin(cam.ry) *
                                        Math.cos(cam.rx) *
                                        dist *
                                        2,
                                ),
                            ),
                            R.modify("ty", R.add(Math.sin(cam.rx) * dist * 2)),
                        )(cam),
                    ),
                ],
            }),
            cameraEye,
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

    const arrowKeys = atom({
        Shift: false,
        ArrowLeft: false,
        ArrowRight: false,
        ArrowDown: false,
        ArrowUp: false,
    });

    const arrowDirection = $derived(
        view((map) => {
            const dx = (map.ArrowLeft ? -1 : 0) + (map.ArrowRight ? 1 : 0);
            const dy = (map.ArrowDown ? -1 : 0) + (map.ArrowUp ? 1 : 0);
            const len = Math.hypot(dy, dx);

            return {
                dx: (len ? dx / len : 0) * (map.Shift ? 3 : 1),
                dy: (len ? dy / len : 0) * (map.Shift ? 3 : 1),
            };
        }, arrowKeys),
    );

    const keyDown = $derived(
        view(
            L.lens(
                (map) => {
                    return Object.entries(map)
                        .filter(([k, v]) => v)
                        .map(([k, v]) => k);
                },
                (key, map) => {
                    return Object.prototype.hasOwnProperty.call(map, key)
                        ? { ...map, [key]: true }
                        : map;
                },
            ),
            arrowKeys,
        ),
    );
    const keyUp = $derived(
        view(
            L.lens(
                (map) => {
                    return Object.entries(map)
                        .filter(([k, v]) => !v)
                        .map(([k, v]) => k);
                },
                (key, map) => {
                    return Object.prototype.hasOwnProperty.call(map, key)
                        ? { ...map, [key]: false }
                        : map;
                },
            ),
            arrowKeys,
        ),
    );

    let raf = null;
    function frame(dx, dy, time) {
        if (raf) {
            raf = requestAnimationFrame(frame.bind(null, dx, dy));

            eyeArrowWalk.value = { dx, dy };
        }
    }

    $effect(() => {
        const { dx, dy } = arrowDirection.value;

        if (dx || dy) {
            raf = requestAnimationFrame(frame.bind(null, dx, dy));
        }

        return () => {
            cancelAnimationFrame(raf);
        };
    });

    const allProps = (val) =>
        L.lens(R.pipe(R.values, R.all(R.equals(val))), (v, o) =>
            v ? R.map(R.always(val), o) : R.map(R.always(!val), o),
        );

    const backfaceCull = atom({
        cw: false,
        ccw: false,
    });
    const hideCW = $derived(view("cw", backfaceCull));
    const hideCCW = $derived(view("ccw", backfaceCull));
    const hideNone = $derived(view(allProps(false), backfaceCull));
    const hideAll = $derived(view(allProps(true), backfaceCull));

    const debugLabels = atom({
        svg: true,
        canvas: false,
        edge: false,
        face: false,
        vertex: false,
        ndcCube: false,
        screenTriangle: false,
    });
    const showSvg = $derived(view("svg", debugLabels));
    const showCanvas = $derived(view("canvas", debugLabels));
    const labelFace = $derived(view("face", debugLabels));
    const labelVertex = $derived(view("vertex", debugLabels));
    const labelEdge = $derived(view("edge", debugLabels));
    const showNDCCube = $derived(view("ndcCube", debugLabels));
    const screenTriangle = $derived(view("screenTriangle", debugLabels));
    const penSize = atom({
        fg: 2,
        bg: 1,
        circleRad: 0,
        fontSize: 12,
        dashRatio: 0.5,
        dashFrequency: 1.5,
        alphaBlend: true,
    });

    const textRendering = atom({
        perspective: true,
        formatted: true,
    });

    const alphaBlend = $derived(view("alphaBlend", penSize));
    const strokeWidthBg = $derived(view("bg", penSize));
    const strokeWidthFg = $derived(view("fg", penSize));
    const circleRad = $derived(view("circleRad", penSize));
    const fontSize = $derived(view("fontSize", penSize));
    const dashRatio = $derived(view("dashRatio", penSize));
    const dashFrequency = $derived(view("dashFrequency", penSize));

    const textFormatted = $derived(view("formatted", textRendering));
    const textPerspective = $derived(view("perspective", textRendering));

    const geoJson = $derived(
        view(L.inverse(L.json({ space: "  " })), mainVector),
    );

    const clipEdge = clipFace4D(edgeClipper);
    const clipFace = clipFace4D(polygonClipper);
    const fastProject = (v, camera, screen) => {
        return {
            x: ((v.x / v.w) * screen.size.x) / 2,
            y: ((v.y / v.w) * screen.size.y) / 2,
            z: v.z / v.w,
            w: 1,
        };
    };
    const ndcGeoEdgePathsFast = $derived(
        view(
            ({ ndcGeo, camera, screen, screenAspect }) => {
                const vertices = ndcGeo.vertices;
                return ndcGeo.edges.map((edge) => {
                    const vs = clipEdge(
                        edge.vertices.map((vi) => vertices[vi]),
                    ).map((v) => fastProject(v, camera, screen));
                    return {
                        attrs: edge.attrs,
                        frontFacing: edge.faces.some((fi) => {
                            const face = ndcGeo.faces[fi];
                            return isClockwise(
                                clipFace(
                                    face.vertices.map((vi) => vertices[vi]),
                                ).map((v) => fastProject(v, camera, screen)),
                            );
                        }),
                        path: "M" + vs.map((c) => c.x + "," + c.y).join(" L"),
                        center: vs.length
                            ? vs.reduce(
                                  ({ x: ax, y: ay }, { x, y }) => ({
                                      x: ax + x / vs.length,
                                      y: ay + y / vs.length,
                                  }),
                                  { x: 0, y: 0 },
                              )
                            : { "data-count": 0 },
                    };
                });
            },
            combine({
                ndcGeo: ndcGeoFast,
                camera,
                screen,
                screenAspect,
            }),
        ),
    );
    const ndcGeoFacePathsFast = $derived(
        view(
            ({ ndcGeo, camera, screen, screenAspect }) => {
                const vertices = ndcGeo.vertices;
                return ndcGeo.faces.map((face) => {
                    const vs = clipFace(
                        face.vertices.map((vi) => vertices[vi]),
                    ).map((v) => fastProject(v, camera, screen));
                    return {
                        attrs: face.attrs,
                        clockwise: isClockwise(vs),
                        path: vs.map((c) => c.x + "," + c.y).join(","),
                        center: vs.length
                            ? vs.reduce(
                                  ({ x: ax, y: ay }, { x, y }) => ({
                                      x: ax + x / vs.length,
                                      y: ay + y / vs.length,
                                  }),
                                  { x: 0, y: 0 },
                              )
                            : { "data-count": 0 },
                    };
                });
            },
            combine({
                ndcGeo: ndcGeoFast,
                camera,
                screen,
                screenAspect,
            }),
        ),
    );
    const ndcGeoMaskPathsFast = $derived(
        view(
            ({ ndcGeo, camera, screen, screenAspect }) => {
                const vertices = ndcGeo.vertices;
                return (ndcGeo.masks ?? []).map((face) => {
                    const vs = clipFace(
                        face.vertices.map((vi) => vertices[vi]),
                    ).map((v) => fastProject(v, camera, screen));
                    return {
                        attrs: face.attrs,
                        clockwise: isClockwise(vs),
                        path: vs.map((c) => c.x + "," + c.y).join(","),
                    };
                });
            },
            combine({
                ndcGeo: ndcGeoFast,
                camera,
                screen,
                screenAspect,
            }),
        ),
    );
    const ndcGeoVerticesFast = $derived(
        view(
            ({ ndcGeo, camera, screen, screenAspect }) => {
                return ndcGeo.vertices.map((v) => ({
                    ...fastProject(v, camera, screen),
                    clipped: !clipVertex4D(v),
                }));
            },
            combine({
                ndcGeo: ndcGeoFast,
                worldTransform,
                camera,
                screen,
                screenAspect,
            }),
        ),
    );
    const ndcGeoLabelsFast = $derived(
        view(
            ({ ndcGeo, camera, screen, screenAspect }) => {
                return ndcGeo.labels.map((l) => ({
                    ...l,
                    vertex: fastProject(
                        ndcGeo.vertices[l.vertex],
                        camera,
                        screen,
                    ),
                    anchor:
                        l.anchor >= 0
                            ? fastProject(
                                  ndcGeo.vertices[l.anchor],
                                  camera,
                                  screen,
                              )
                            : null,
                    clipped: !clipVertex4D(ndcGeo.vertices[l.vertex]),
                    lines: Array.isArray(l.text) ? l.text : l.text.split("\n"),
                }));
            },
            combine({
                ndcGeo: ndcGeoFast,
                camera,
                screen,
                screenAspect,
            }),
        ),
    );

    export function doubleArrowGeometry(size) {
        return (regl) => {
            return {
                buffer: regl.buffer([
                    [0, 0, 1],
                    [-size, size * 0.5, 1],
                    [-size, 0, 1],

                    [-size * 0.5, 0, 1],
                    [-size * 1.6, size * 0.5, 1],
                    [-size * 1.6, 0, 1],

                    [0, 0, 1],
                    [-size, 0, 1],
                    [-size, -size * 0.5, 1],

                    [-size * 0.5, 0, 1],
                    [-size * 1.6, 0, 1],
                    [-size * 1.6, -size * 0.5, 1],
                ]),
                count: 12,
            };
        };
    }

    export function flatArrowGeometry(size) {
        return (regl) => {
            return {
                buffer: regl.buffer([
                    [0, 0, 1],
                    [-size * 1.5, size, 1],
                    [-size * 1.5, 0, 1],

                    [0, 0, 1],
                    [-size * 1.5, 0, 1],
                    [-size * 1.5, -size, 1],
                ]),
                count: 6,
            };
        };
    }

    export function lineArrowGeometry(size, thickness = 0.3) {
        return (regl) => {
            const sq2 = 1.414;
            return {
                buffer: regl.buffer([
                    [0, 0, 1],
                    [-size * 1.5, size, 1],
                    [
                        -size * (1.5 + (thickness / 3) * sq2),
                        size * (1 - (thickness / 2) * sq2),
                        1,
                    ],

                    [
                        -size * (1.5 + (thickness / 3) * sq2),
                        size * (1 - (thickness / 2) * sq2),
                        1,
                    ],
                    [-size * thickness * sq2, 0, 1],
                    [0, 0, 1],

                    [0, 0, 1],
                    [
                        -size * (1.5 + (thickness / 3) * sq2),
                        -(size * (1 - (thickness / 2) * sq2)),
                        1,
                    ],
                    [-size * 1.5, -size, 1],

                    [-size * thickness * sq2, 0, 1],
                    [
                        -size * (1.5 + (thickness / 3) * sq2),
                        -(size * (1 - (thickness / 2) * sq2)),
                        1,
                    ],
                    [0, 0, 1],
                ]),
                count: 12,
            };
        };
    }

    const arrowGeometries = {
        "axis-arrow": S.arrowGeometry(4),
        "vector-arrow": S.arrowGeometry(4),
    };
    const roundLineGeo = S.roundCapJoinGeometry(10);

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

        const arrowDrawers = R.mapObjIndexed(
            (geo, arrow) => S.interleavedStrip3D(regl, geo),
            arrowGeometries,
        );

        const drawLine3D = S.interleavedStrip3D(regl, roundLineGeo);
        const drawFace3D = S.makeColorShader(regl);
        var reglCamera = regl({
            context: {
                view: ({ tick }) => {
                    return [
                        M.makeTranslate(
                            -cameraOffsetX.value,
                            cameraOffsetY.value,
                            -cameraOffsetZ.value,
                        ),

                        M.makeRotateX(
                            -L.getInverse(lensRadToDegree, cameraEyeRotX.value),
                        ),
                        M.makeRotateY(
                            -L.getInverse(lensRadToDegree, cameraEyeRotY.value),
                        ),
                        M.makeRotateX(
                            -L.getInverse(lensRadToDegree, cameraEyeRotZ.value),
                        ),
                        M.makeTranslate(
                            cameraOffsetX.value,
                            -cameraOffsetY.value,
                            cameraOffsetZ.value,
                        ),

                        M.makeTranslate(
                            -cameraEyePosX.value,
                            cameraEyePosY.value,
                            -cameraEyePosZ.value,
                        ),
                    ].reduce(M.matMulMat);
                },
                projection: ({ viewportWidth, viewportHeight }) =>
                    [
                        M.blendProjections(
                            M.makePerspective(
                                cameraFoVDeg.value,
                                viewportWidth / viewportHeight,
                                cameraClipNear.value,
                                cameraClipFar.value,
                            ),
                            M.makeOrthographic(
                                cameraFoVDeg.value,
                                viewportWidth / viewportHeight,
                                cameraClipNear.value,
                                cameraClipFar.value,
                            ),
                            cameraOrtho.value,
                        ),
                    ].reduce(M.matMulMat),

                viewport: () => ({
                    x: 0,
                    y: 0,
                    width: reglCanvas.width,
                    height: reglCanvas.height,
                }),

                viewNormal: () => {
                    const m = [
                        M.makeRotateX(
                            -L.getInverse(lensRadToDegree, cameraEyeRotX.value),
                        ),
                        M.makeRotateY(
                            -L.getInverse(lensRadToDegree, cameraEyeRotY.value),
                        ),
                        M.makeRotateX(
                            -L.getInverse(lensRadToDegree, cameraEyeRotZ.value),
                        ),
                    ].reduce(M.matMulMat);

                    return [
                        m[0],
                        m[1],
                        m[2],
                        m[4],
                        m[5],
                        m[6],
                        m[8],
                        m[9],
                        m[10],
                    ];
                },
            },

            uniforms: {
                view: regl.context("view"),
                projection: regl.context("projection"),
                viewport: regl.context("viewport"),
                viewNormal: regl.context("viewNormal"),
            },
        });

        let reglLineMesh = {
            points: regl.buffer([]),
            normals: regl.buffer([]),
            shortenings: regl.buffer([]),
            count: 0,
        };

        let reglArrowMeshes = R.mapObjIndexed(
            (_, arrow) => ({
                points: regl.buffer([]),
                normals: regl.buffer([]),
                shortenings: regl.buffer([]),
                count: 0,
            }),
            arrowGeometries,
        );

        let reglVertexMesh = {
            points: regl.buffer([]),
            normals: regl.buffer([]),
            shortenings: regl.buffer([]),
            count: 0,
        };

        let reglFaceMesh = {
            positions: regl.buffer([0, 0, 1, 1, 0, 0, 0, 1, 0]),
            colors: regl.buffer([0.2, 0, 0, 1, 0.2, 0, 0, 1, 0.2, 0, 0, 1]),
            elements: regl.elements([0, 1, 2, 3, 4, 5, 6, 7, 8]),
        };

        const hasMarker = (side, type) => (e) =>
            !!e.attrs["marker-" + side] &&
            (!type || "url(#" + type + ")" === e.attrs["marker-" + side]);

        $effect(() => {
            const vs = worldGeo.value.vertices;
            const edges = worldGeo.value.edges.flatMap((e) =>
                e.vertices.map((vi) => [vs[vi].x, -vs[vi].y, vs[vi].z]),
            );

            const edgeNormals = worldGeo.value.edges.flatMap((e) => {
                const normals = e.faces.flatMap((fi) => {
                    const faceVerts = worldGeo.value.faces[fi].vertices.map(
                        (vi) => worldGeo.value.vertices[vi],
                    );
                    const v1 = faceVerts[0];
                    const v2 = faceVerts[1];
                    const v3 = faceVerts[2];

                    const d1x = v2.x - v1.x;
                    const d1y = -(v2.y - v1.y);
                    const d1z = v2.z - v1.z;

                    const d2x = v3.x - v1.x;
                    const d2y = -(v3.y - v1.y);
                    const d2z = v3.z - v1.z;

                    const normal = [
                        d1y * d2z - d1z * d2y,
                        d1z * d2x - d1x * d2z,
                        d1x * d2y - d1y * d2x,
                    ];

                    const length = Math.sqrt(
                        normal.map((x) => x * x).reduce((a, b) => a + b),
                    );

                    return normal.map((x) => x / length);
                });
                return [...normals, ...normals, 0, 0, 0, 0, 0, 0].slice(0, 6);
            });

            const toTriangle = (vs) => {
                return R.pipe(
                    R.slice(1, Infinity),
                    R.aperture(2),
                    R.map(R.prepend(R.nth(0, vs))),
                )(vs);
            };

            const faces = worldGeo.value.faces.flatMap((f) =>
                toTriangle(f.vertices),
            );
            const vertices = vs.map(({ x, y, z }) => [x, -y, z]);

            R.pipe(
                R.props(["positions", "colors"]),
                R.forEach(R.pipe(R.prop("destroy"), R.call)),
            )(reglFaceMesh);
            reglFaceMesh = {
                positions: regl.buffer({
                    type: "float",
                    data: vertices,
                }),
                colors: regl.buffer({
                    type: "float",
                    data: vs.map(({ x, y, z }, vi) => {
                        return parseColor(
                            worldGeo.value.faces.find((f) =>
                                f.vertices.includes(vi),
                            )?.attrs?.color,
                            [0.2, 0, 0, 0.0],
                        );
                    }),
                }),
                elements: regl.elements(faces),
            };

            R.pipe(
                R.props(["points", "shortenings", "normals"]),
                R.forEach(R.pipe(R.prop("destroy"), R.call)),
            )(reglLineMesh);

            reglLineMesh = {
                points: regl.buffer(edges),
                shortenings: regl.buffer(
                    worldGeo.value.edges.flatMap((e) => {
                        return [
                            hasMarker("start")(e) ? 6 : 0,
                            hasMarker("end")(e) ? 6 : 0,
                        ];
                    }),
                ),
                normals: regl.buffer(edgeNormals),
                count: edges.length / 2,
            };

            reglArrowMeshes = R.mapObjIndexed((old, arrow) => {
                const arrowEdgesForward = worldGeo.value.edges
                    .filter(hasMarker("end", arrow))
                    .flatMap((e) =>
                        e.vertices
                            .slice(-2)
                            .map((vi) => [vs[vi].x, -vs[vi].y, vs[vi].z]),
                    );

                const arrowEdgeNormalsForward = worldGeo.value.edges
                    .filter(hasMarker("end", arrow))
                    .flatMap((e) => {
                        const normals = e.faces.flatMap((fi) => {
                            const faceVerts = worldGeo.value.faces[
                                fi
                            ].vertices.map((vi) => worldGeo.value.vertices[vi]);
                            const v1 = faceVerts[0];
                            const v2 = faceVerts[1];
                            const v3 = faceVerts[2];

                            const d1x = v2.x - v1.x;
                            const d1y = -(v2.y - v1.y);
                            const d1z = v2.z - v1.z;

                            const d2x = v3.x - v1.x;
                            const d2y = -(v3.y - v1.y);
                            const d2z = v3.z - v1.z;

                            const normal = [
                                d1y * d2z - d1z * d2y,
                                d1z * d2x - d1x * d2z,
                                d1x * d2y - d1y * d2x,
                            ];

                            const length = Math.sqrt(
                                normal
                                    .map((x) => x * x)
                                    .reduce((a, b) => a + b),
                            );

                            return normal.map((x) => x / length);
                        });
                        return [...normals, ...normals, 0, 0, 0, 0, 0, 0].slice(
                            0,
                            6,
                        );
                    });

                const arrowEdgesBackward = worldGeo.value.edges
                    .filter(hasMarker("start", arrow))
                    .flatMap((e) =>
                        e.vertices
                            .slice(0, 2)
                            .reverse()
                            .map((vi) => [vs[vi].x, -vs[vi].y, vs[vi].z]),
                    );

                const arrowEdgeNormalsBackward = worldGeo.value.edges
                    .filter(hasMarker("start", arrow))
                    .flatMap((e) => {
                        const normals = e.faces.flatMap((fi) => {
                            const faceVerts = worldGeo.value.faces[
                                fi
                            ].vertices.map((vi) => worldGeo.value.vertices[vi]);
                            const v1 = faceVerts[0];
                            const v2 = faceVerts[1];
                            const v3 = faceVerts[2];

                            const d1x = v2.x - v1.x;
                            const d1y = -(v2.y - v1.y);
                            const d1z = v2.z - v1.z;

                            const d2x = v3.x - v1.x;
                            const d2y = -(v3.y - v1.y);
                            const d2z = v3.z - v1.z;

                            const normal = [
                                d1y * d2z - d1z * d2y,
                                d1z * d2x - d1x * d2z,
                                d1x * d2y - d1y * d2x,
                            ];

                            const length = Math.sqrt(
                                normal
                                    .map((x) => x * x)
                                    .reduce((a, b) => a + b),
                            );

                            return normal.map((x) => x / length);
                        });
                        return [...normals, ...normals, 0, 0, 0, 0, 0, 0].slice(
                            0,
                            6,
                        );
                    });

                return {
                    points: regl.buffer([
                        ...arrowEdgesForward,
                        ...arrowEdgesBackward,
                    ]),
                    shortenings: regl.buffer([
                        ...worldGeo.value.edges
                            .filter(hasMarker("start", arrow))
                            .flatMap(() => [0, 0]),
                        ...worldGeo.value.edges
                            .filter(hasMarker("end", arrow))
                            .flatMap(() => [0, 0]),
                    ]),
                    normals: regl.buffer([
                        ...arrowEdgeNormalsForward,
                        ...arrowEdgeNormalsBackward,
                    ]),
                    count:
                        arrowEdgesForward.length / 2 +
                        arrowEdgesBackward.length / 2,
                };
            }, reglArrowMeshes);

            R.pipe(
                R.props(["points", "shortenings", "normals"]),
                R.forEach(R.pipe(R.prop("destroy"), R.call)),
            )(reglVertexMesh);

            reglVertexMesh = {
                points: regl.buffer(
                    vs.flatMap((v) => [v.x, -v.y, v.z, v.x, -v.y, v.z]),
                ),
                shortenings: regl.buffer(vs.flatMap((v) => [0, 0])),
                normals: regl.buffer(vs.flatMap((v) => [0, 0, 0, 0, 0, 0])),
                count: vs.length,
            };
        });

        let modelMatrix = $derived(
            read(
                (trans) =>
                    [
                        M.makeTranslate(trans.tx, -trans.ty, trans.tz),
                        M.makeRotateZ(trans.rz),
                        M.makeRotateY(trans.ry),
                        M.makeRotateX(trans.rx),
                        M.makeScale(trans.sx, trans.sy, trans.sz),
                    ].reduce(M.matMulMat),
                worldTransform,
            ),
        );

        let modelMatrixNormal = $derived(
            read((trans) => {
                const m = [
                    M.makeRotateZ(trans.rz),
                    M.makeRotateY(trans.ry),
                    M.makeRotateX(trans.rx),
                    M.makeScale(1 / trans.sx, 1 / trans.sy, 1 / trans.sz),
                ].reduce(M.matMulMat);

                return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
            }, worldTransform),
        );

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
                color: [0.99, 0.99, 0.99, 1],
                stencil: 1,
                depth: 0.0,
            });

            reglCamera(() => {
                if (!hideCCW.value) {
                    drawFace3D({
                        model: modelMatrix.value,
                        color: meshColorGLTranslucent.value,
                        positions: reglFaceMesh.positions,
                        colors: reglFaceMesh.colors,
                        elements: reglFaceMesh.elements,
                        depth: true,
                        depthFunc: "always",
                        cullFace: "front",
                        depthOffsetFactor: -4,
                        blend: alphaBlend.value,
                    });
                }
                if (!hideCW.value) {
                    drawFace3D({
                        model: modelMatrix.value,
                        color: meshColorGLTranslucent.value,
                        positions: reglFaceMesh.positions,
                        colors: reglFaceMesh.colors,
                        elements: reglFaceMesh.elements,
                        depth: true,
                        depthFunc: "always",
                        depthOffsetFactor: -4,
                        blend: alphaBlend.value,
                    });
                }

                drawLine3D({
                    segments: reglLineMesh,
                    model: modelMatrix.value,
                    color: meshColorGLDarker.value,
                    width: strokeWidthBg.value * window.devicePixelRatio * 2,
                    depthFunc: "always",
                    cullEnabled: false,
                    cullFace: "front",
                    modelMatrixNormal: modelMatrixNormal.value,
                    dashFrequency: dashFrequency.value,
                    dashRatio: dashRatio.value,
                    depthOffsetFactor: strokeWidthBg.value,
                });

                drawLine3D({
                    segments: reglLineMesh,
                    model: modelMatrix.value,
                    color: meshColorGLDark.value,
                    width: strokeWidthFg.value * window.devicePixelRatio * 2,
                    depth: true,
                    depthFunc: "gequal",
                    modelMatrixNormal: modelMatrixNormal.value,
                    depthOffsetFactor: strokeWidthFg.value,
                });

                R.forEachObjIndexed((drawer, arrow) => {
                    if (reglArrowMeshes[arrow].count) {
                        drawer({
                            segments: reglArrowMeshes[arrow],
                            model: modelMatrix.value,
                            color: meshColorGLDark.value,
                            width:
                                strokeWidthFg.value *
                                window.devicePixelRatio *
                                2,
                            depth: true,
                            depthFunc: "gequal",
                            cullEnabled: false,
                            modelMatrixNormal: modelMatrixNormal.value,
                            depthOffsetFactor: strokeWidthFg.value,
                        });
                    }
                }, arrowDrawers);

                drawLine3D({
                    segments: reglVertexMesh,
                    model: modelMatrix.value,
                    width: circleRad.value * window.devicePixelRatio * 4,
                    depthFunc: "gequal",
                    modelMatrixNormal: modelMatrixNormal.value,
                    depthOffsetFactor: 0,
                });
            });
        });

        return () => {
            tick.cancel();
            regl.destroy();
            canvasRoot.removeChild(reglCanvas);
        };
    };

    const upsert = R.curry((key, updateFn, defaultVal, obj) =>
        R.assoc(key, updateFn(R.propOr(defaultVal, key, obj)), obj),
    );
</script>

<fieldset>
    <legend>Debug</legend>
    {#each ["vertex"] as dbg}
        {@const v = view(dbg, debugLabels)}

        <label>
            <input bind:checked={v.value} type="checkbox" />
            {dbg}
        </label>
    {/each}
</fieldset>

<fieldset>
    <legend>Vector</legend>
    {#each Object.entries( { scalar: 10, e1: 25, e2: 25, e3: 25, e12: 200, e13: 200, e23: 200, e123: 5000 } ) as [axis, range]}
        <label
            >{axis}-Axis
            <input
                type="range"
                min={-range}
                max={range}
                step="0.1"
                {@attach bindValue(
                    view([axis, L.normalize(parseFloat)], mainVector),
                )}
            />
        </label>
    {/each}
    <label
        >Length
        <input
            type="range"
            min="-25"
            max="25"
            step="0.1"
            {@attach bindValue(
                view(
                    L.lens(
                        ({ e1, e2, e3 }) =>
                            (Math.sign(e1) || 1) *
                            (Math.sign(e2) || 1) *
                            (Math.sign(e3) || 1) *
                            Math.hypot(e1, Math.hypot(e2, e3)),
                        (l, { e1, e2, e3, ...rest }) => {
                            const oldLen =
                                Math.hypot(e1, Math.hypot(e2, e3)) || 1;
                            const s =
                                Math.sign(e1 || 1) *
                                Math.sign(e2 || 1) *
                                Math.sign(e3 || 1);
                            if (Math.abs(l) < 0.01) {
                                return { e1, e2, e3, ...rest };
                            }

                            return {
                                e1: (e1 / oldLen) * l * s,
                                e2: (e2 / oldLen) * l * s,
                                e3: (e3 / oldLen) * l * s,
                                ...rest,
                            };
                        },
                    ),
                    mainVector,
                ),
            )}
        />
    </label>
    <label
        >Area
        <input
            type="range"
            min="-100"
            max="100"
            step="0.1"
            {@attach bindValue(
                view(
                    L.lens(
                        ({ e12, e13, e23 }) =>
                            (Math.sign(e12) || 1) *
                            (Math.sign(e13) || 1) *
                            (Math.sign(e23) || 1) *
                            Math.hypot(e12, Math.hypot(e13, e23)),
                        (l, { e12, e13, e23, ...rest }) => {
                            const oldLen =
                                Math.hypot(e12, Math.hypot(e13, e23)) || 1;
                            const s =
                                Math.sign(e12 || 1) *
                                Math.sign(e13 || 1) *
                                Math.sign(e23 || 1);
                            if (Math.abs(l) < 0.01) {
                                return { e12, e13, e23, ...rest };
                            }

                            return {
                                e12: (e12 / oldLen) * l * s,
                                e13: (e13 / oldLen) * l * s,
                                e23: (e23 / oldLen) * l * s,
                                ...rest,
                            };
                        },
                    ),
                    mainVector,
                ),
            )}
        />
    </label>
</fieldset>
<div class="resize">
    {#if showCanvas.value}
        <div class="viewportContainer" {@attach renderGL}></div>
    {/if}
    <svg
        role="button"
        data-hide-cw={hideCW.value}
        data-hide-ccw={hideCCW.value}
        bind:clientWidth={clientWidth.value}
        bind:clientHeight={clientHeight.value}
        tabindex="-1"
        class="viewport vector"
        viewBox={viewBox.value}
        preserveAspectRatio={aspectRatio.value}
        onpointerdown={(evt) => {
            if (evt.isPrimary) {
                evt.preventDefault();
                evt.currentTarget.focus();
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
                if (evt.ctrlKey) {
                    objectPointerRotate.value = pointerDelta.value;
                } else if (evt.shiftKey) {
                    eyePointerPan.value = pointerDelta.value;
                } else {
                    eyePointerRotate.value = pointerDelta.value;
                }
            }
        }}
        onkeydown={(evt) => {
            evt.preventDefault();
            keyDown.value = evt.key;
        }}
        onkeyup={(evt) => {
            evt.preventDefault();
            keyUp.value = evt.key;
        }}
        onwheel={(evt) => {
            evt.preventDefault();
            cameraFoVWheel.value = evt.deltaY;
        }}
    >
        {#if showSvg.value}
            <g style:--mesh-color={meshColor.value}>
                <rect
                    {...debugRect.value}
                    class={{ hidden: !showNDCCube.value }}
                >
                    <title>Debug Rect</title>
                </rect>
                <polygon
                    {...debugPolygon.value}
                    class={{ hidden: !screenTriangle.value }}
                />
                <polygon
                    {...debugBoundsSvg.value}
                    class={{ hidden: !showNDCCube.value }}
                />
                <polygon
                    {...debugPolygonClipped.value}
                    class={{ hidden: !screenTriangle.value }}
                />
                <circle
                    {...debugCircle.value}
                    class={{ hidden: !showNDCCube.value }}
                >
                    <title>Debug Center</title>
                </circle>
                <path
                    fill="red"
                    d={ndcCubeVertexPath.value}
                    class={{ hidden: !showNDCCube.value }}
                />
                <path
                    stroke-width="1"
                    vector-effect="non-scaling-stroke"
                    stroke="gray"
                    stroke-dasharray="5 5"
                    d={ndcCubeEdgePath.value}
                    class={{ hidden: !showNDCCube.value }}
                />

                {#each ndcGeoFacePathsFast.value as p, i (i)}
                    <polygon
                        fill={p.attrs.color ?? "#ccc"}
                        fill-opacity="0.5"
                        vector-effect="non-scaling-stroke"
                        stroke="none"
                        {...p.attrs}
                        stroke-opacity="0.1"
                        data-clockwise={p.clockwise !== (p.attrs.flip ?? false)}
                        points={p.path}
                    />
                    {#if labelFace.value}
                        <text
                            class={p.attrs.class}
                            {...p.center}
                            data-clockwise={p.clockwise !==
                                (p.attrs.flip ?? false)}
                            text-anchor="middle"
                            fill="black"
                            transform="translate(0, -10)">f{i}</text
                        >
                    {/if}
                {/each}
                <g
                    style:--stroke-width-fg={strokeWidthFg.value + "px"}
                    style:--stroke-width-bg={strokeWidthBg.value + "px"}
                    style:--stroke-width-bg2={strokeWidthBg.value * 2 + "px"}
                    style:--stroke-dash-ratio={dashRatio.value}
                    style:--stroke-dash-period={dashFrequency.value &&
                        15 / dashFrequency.value}
                >
                    {#each ndcGeoEdgePathsFast.value as p, i (i)}
                        <path
                            stroke-opacity="1"
                            vector-effect="non-scaling-stroke"
                            stroke={p.attrs.color ?? "black"}
                            {...p.attrs}
                            data-any-clockwise={p.frontFacing !==
                                (p.attrs.flip ?? false)}
                            d={p.path}
                        />
                        {#if labelEdge.value}
                            <text
                                class={p.attrs.class}
                                {...p.center}
                                data-any-clockwise={p.frontFacing !==
                                    (p.attrs.flip ?? false)}
                                text-anchor="middle"
                                transform="translate(0, -10)">e{i}</text
                            >
                        {/if}
                    {/each}
                </g>
                <g style:--circle-rad={circleRad.value + "px"}>
                    {#each ndcGeoVerticesFast.value as v, i (i)}
                        {#if !v.clipped}
                            <circle
                                class="vertex"
                                cx={v.x}
                                cy={v.y}
                                r="5"
                                fill="black"
                            />
                            {#if labelVertex.value}
                                <text
                                    x={v.x}
                                    y={v.y}
                                    text-anchor="middle"
                                    transform="translate(0, -10)">v{i}</text
                                >
                            {/if}
                        {/if}
                    {/each}
                </g>
            </g>
        {/if}
        <g
            class={{ "petri-plain": !textFormatted.value }}
            style:--font-size={fontSize.value + "px"}
            style:font-size="var(--font-size, 1em)"
        >
            {#each ndcGeoLabelsFast.value as v, i (i)}
                {#if !v.clipped}
                    {@const perspectiveAngle =
                        textPerspective.value && v.anchor
                            ? Math.atan2(
                                  v.anchor.y - v.vertex.y,
                                  v.anchor.x - v.vertex.x,
                              )
                            : 0}
                    {@const perspectiveRotation = `rotate(${(perspectiveAngle * 180) / Math.PI})`}
                    {@const attrs = upsert(
                        "transform",
                        R.concat(R.__, perspectiveRotation),
                        "",
                        v.attrs,
                    )}
                    {@const fade = textPerspective.value
                        ? Math.max(
                              0,
                              Math.cos(
                                  Math.min(
                                      Math.PI / 3,
                                      Math.abs(perspectiveAngle),
                                  ) * 3,
                              ),
                          )
                        : 1}
                    <text
                        transform-origin="{v.vertex.x} {v.vertex.y}"
                        {...v.vertex}
                        text-anchor="middle"
                        transform="translate(0, -10)"
                        opacity={fade}
                        {...attrs}
                        >{#each v.lines as line, l (l)}
                            <tspan x={v.vertex.x} dy="1em">{line}</tspan>
                        {/each}</text
                    >
                    {#if attrs.stroke}
                        <text
                            transform-origin="{v.vertex.x} {v.vertex.y}"
                            {...v.vertex}
                            text-anchor="middle"
                            transform="translate(0, -10)"
                            opacity={fade}
                            {...attrs}
                            stroke="none"
                            stroke-width="0"
                            >{#each v.lines as line, l (l)}
                                <tspan x={v.vertex.x} dy="1em">{line}</tspan>
                            {/each}</text
                        >
                    {/if}
                {/if}
            {/each}
        </g>
        <defs>
            <marker
                id="circlehead"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                fill="context-fill"
                orient="auto-start-reverse"
            >
                <circle cx="5" cy="5" r="4" stroke-width="0" stroke="black" />
            </marker>
            <marker
                id="axis-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                fill="context-stroke"
                orient="auto-start-reverse"
            >
                <path d="M 10 5 l -10 5 l 3 -5 l -3 -5 z" />
            </marker>

            <marker
                id="vector-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                fill="context-stroke"
                orient="auto-start-reverse"
            >
                <path d="M 10 5 l -10 5 l 3 -5 l -3 -5 z" />
            </marker>
        </defs>
    </svg>
</div>
<textarea bind:value={geoJson.value}></textarea>

<style>
    .viewportContainer :global(.viewport),
    .viewport {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        display: block;
        touch-action: none;
        overscroll-behavior: contain;
        grid-area: 1/1/-1/-1;
    }

    .blade3-border {
        stroke: #666a;
    }

    .blade3-orientation2 {
        stroke-width: 1;
    }

    .viewport:focus,
    .viewport:has-focus,
    .viewport:focus-inside {
        touch-action: none;
    }

    .viewportContainer {
        background: #fff;
        display: contents;
    }

    .viewport.vector {
        z-index: 10;
    }

    .axis {
        stroke-width: 2;
    }

    .resize {
        resize: both;
        width: 100%;
        height: 30em;
        border: 1px solid gray;
        overflow: hidden;
        display: grid;
        grid-template: 100% / 100%;
    }

    polygon {
        stroke-linejoin: round;
        stroke-width: 5px;
    }

    [data-hide-ccw="true"] .cube-face[data-clockwise="false"] {
        display: none;
    }

    [data-hide-cw="true"] .cube-face[data-clockwise="true"] {
        display: none;
    }

    [data-hide-ccw="true"] text[data-clockwise="false"] {
        display: none;
    }

    [data-hide-cw="true"] text[data-clockwise="true"] {
        display: none;
    }

    .cube-edge[data-any-clockwise="false"] {
        stroke-dashoffset: calc(
            var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                (1 - var(--stroke-dash-ratio, 0))
        );
        stroke-dasharray: calc(
            var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                var(--stroke-dash-ratio, 0)
        );
        stroke-width: var(--stroke-width-bg, 2);
        stroke-opacity: 0.7;
    }

    .vertex {
        r: var(--circle-rad, 10px);
    }

    .cube-edge[data-any-clockwise="true"] {
        stroke-width: var(--stroke-width-fg, 8);
    }

    .cube-edge {
        stroke-linecap: round;
    }
    .vector-component-ortho {
        display: none;
    }

    .vector-component-planar {
        display: none;
    }

    .vector-component-offset {
        display: none;
    }

    text.cube-edge[data-any-clockwise="false"] {
        opacity: 0.6;
    }

    text.cube-face[data-clockwise="false"] {
        opacity: 0.3;
    }

    text.cube-face[data-count="0"] {
        display: none;
    }

    text.cube-edge[data-count="0"] {
        display: none;
    }

    .hidden {
        display: none;
    }

    polygon.ground {
        fill-opacity: 0.2;
        stroke: var(--mesh-color, mediumaquamarine);
        stroke-opacity: 0.5;
        stroke-width: 1px;
        opacity: 1;
        pointer-events: none;
    }

    text.ground {
        display: none;
    }

    polygon.cube-face:hover {
        fill-opacity: 0.7;
    }

    polygon.cube-face {
        pointer-events: fill;
    }

    .cube-edge {
        pointer-events: none;
    }

    .cube-mask[data-clockwise="false"] {
        display: none;
    }

    polygon.ground[data-clockwise="false"] {
        display: none;
    }

    text.cube-label {
        font-size: var(--font-size, 1em) !important;
        stroke-linejoin: round;
        stroke-linecap: round;
    }

    polygon.obj-face {
        opacity: 0.4;
        fill-opacity: 1;
        fill: var(--mesh-color, mediumaquamarine);
    }

    path.obj-edge {
        stroke: var(--mesh-color, mediumaquamarine);
    }

    .obj-edge[data-any-clockwise="true"] {
        stroke-width: var(--stroke-width-fg, 8);
    }

    .obj-edge {
        stroke-linecap: round;
    }

    .obj-edge[data-any-clockwise="false"] {
        stroke-dashoffset: calc(
            var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                (1 - var(--stroke-dash-ratio, 0))
        );
        stroke-dasharray: calc(
                var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                    var(--stroke-dash-ratio, 0)
            )
            calc(
                var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                    (1 - var(--stroke-dash-ratio, 0))
            );
        stroke-width: var(--stroke-width-bg, 2);
        stroke-opacity: 0.7;
    }

    [data-hide-ccw="true"] .obj-face[data-clockwise="false"] {
        display: none;
    }

    [data-hide-cw="true"] .obj-face[data-clockwise="true"] {
        display: none;
    }

    text.obj-face[data-count="0"] {
        display: none;
    }

    text.obj-edge[data-count="0"] {
        display: none;
    }

    .petri-edge {
        stroke-width: 2;
        stroke-linejoin: round;
        stroke-linecap: round;
    }

    .petri-plain .petri-label {
        font-size: var(--font-size, 1em) !important;
        font-family: monospace;
        font-style: none;
        font-weight: normal;
    }

    polygon.petri-face {
        opacity: 0.4;
        fill-opacity: 1;
        fill: currentColor;
    }

    [data-hide-ccw="true"] .petri-face[data-clockwise="false"] {
        display: none;
    }

    [data-hide-cw="true"] .petri-face[data-clockwise="true"] {
        display: none;
    }

    text.petri-face[data-count="0"] {
        display: none;
    }

    text.petri-edge[data-count="0"] {
        display: none;
    }

    path.petri-edge {
        stroke: currentColor;
    }
    .petri-edge[data-any-clockwise="true"] {
        stroke-width: var(--stroke-width-fg, 8);
    }

    .petri-line {
        stroke-width: var(--stroke-width-fg, 8);
    }

    .petri-edge {
        stroke-linecap: round;
    }

    .petri-edge[data-any-clockwise="false"] {
        stroke-dashoffset: calc(
            var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                (1 - var(--stroke-dash-ratio, 0))
        );
        stroke-dasharray: calc(
                var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                    var(--stroke-dash-ratio, 0)
            )
            calc(
                var(--stroke-width-bg, 4) * var(--stroke-dash-period, 0) *
                    (1 - var(--stroke-dash-ratio, 0))
            );
        stroke-width: var(--stroke-width-bg, 2);
        stroke-opacity: 0.7;
    }

    path.petri-edge.edge-3d {
        stroke-opacity: 0.5;
        stroke-width: var(--stroke-width-bg, 8);
    }
</style>
