export default {
	vertices: [
		{ x: 10, y: 10, z: 10 },
		{ x: 10, y: -10, z: 10 },
		{ x: -10, y: -10, z: 10 },
		{ x: -10, y: 10, z: 10 },
		{ x: 10, y: 10, z: -10 },
		{ x: 10, y: -10, z: -10 },
		{ x: -10, y: -10, z: -10 },
		{ x: -10, y: 10, z: -10 },
		{ x: 0, y: 20, z: 0 },
		{ x: 0, y: 0, z: 0 },
	],
	edges: [
		{
			from: 0,
			to: 1,
			faces: [0, 3],
			/*attrs: { color: "red" }*/
		},
		{
			from: 1,
			to: 2,
			faces: [0, 8],
			/*attrs: { color: "green" }*/
		},
		{
			from: 2,
			to: 3,
			faces: [1, 7],
			/*attrs: { color: "blue" }*/
		},
		{
			from: 3,
			to: 0,
			faces: [1, 10],
			/*attrs: { color: "red" }*/
		},
		{
			from: 4,
			to: 5,
			faces: [2, 5],
			/*attrs: { color: "green" }*/
		},
		{
			from: 5,
			to: 6,
			faces: [4, 9],
			/*attrs: { color: "blue" }*/
		},
		{
			from: 6,
			to: 7,
			faces: [6, 4],
			/*attrs: { color: "red" }*/
		},
		{
			from: 7,
			to: 4,
			faces: [5, 12],
			/*attrs: { color: "green" }*/
		},
		{
			from: 0,
			to: 4,
			faces: [2, 11],
			/*attrs: { color: "blue" }*/
		},
		{
			from: 1,
			to: 5,
			faces: [3, 9],
			/*attrs: { color: "red" }*/
		},
		{
			from: 2,
			to: 6,
			faces: [6, 8],
			/*attrs: { color: "green" }*/
		},
		{
			from: 3,
			to: 7,
			faces: [7, 13],
			/*attrs: { color: "blue" }*/
		},
		{
			from: 0,
			to: 8,
			faces: [10, 11],
			/*attrs: { color: "red" }*/
		},
		{
			from: 3,
			to: 8,
			faces: [10, 13],
			/*attrs: { color: "green" }*/
		},
		{
			from: 4,
			to: 8,
			faces: [11, 12],
			/*attrs: { color: "blue" }*/
		},
		{
			from: 7,
			to: 8,
			faces: [12, 13],
			/*attrs: { color: "red" }*/
		},
	],
	faces: [
		{ a: 0, b: 1, c: 2, attrs: { color: "red" } },
		{ a: 2, b: 3, c: 0, attrs: { color: "red" } },
		{ a: 5, b: 0, c: 4, attrs: { color: "red" } },
		{ a: 5, b: 1, c: 0, attrs: { color: "red" } },
		{ a: 7, b: 6, c: 5, attrs: { color: "red" } },
		{ a: 5, b: 4, c: 7, attrs: { color: "red" } },
		{ a: 2, b: 6, c: 7, attrs: { color: "red" } },
		{ a: 7, b: 3, c: 2, attrs: { color: "red" } },
		{ a: 5, b: 6, c: 2,  attrs: { color: "red" } },
		{ a: 2, b: 1, c: 5,  attrs: { color: "red" } },
		{ a: 0, b: 3, c: 8, attrs: { color: "red" } },
		{ a: 4, b: 0, c: 8, attrs: { color: "red" } },
		{ a: 7, b: 4, c: 8, attrs: { color: "red" } },
		{ a: 3, b: 7, c: 8, attrs: { color: "red" } },
	],
	masks: [
		{ quads: [0] },
		{ quads: [1] },
		{ quads: [2] },
		{ quads: [3] },
		{ quads: [4] },
		{ faces: [10, 11, 12, 13] },
	],
	quads: [
		{ a: 0, b: 1, c: 2, d: 3 },
		{ a: 2, b: 6, c: 7, d: 3 },
		{ a: 6, b: 5, c: 4, d: 7 },
		{ a: 5, b: 1, c: 0, d: 4 },
		{ a: 1, b: 5, c: 6, d: 2 },
	],
}

export const cube = {
	vertices: [
		{ x: 10, y: 10, z: 10 },
		{ x: 10, y: -10, z: 10 },
		{ x: -10, y: -10, z: 10 },
		{ x: -10, y: 10, z: 10 },
		{ x: 10, y: 10, z: -10 },
		{ x: 10, y: -10, z: -10 },
		{ x: -10, y: -10, z: -10 },
		{ x: -10, y: 10, z: -10 },
	],
	edges: [
		{ from: 0, to: 1, faces: [0, 3] },
		{ from: 1, to: 2, faces: [0, 9] },
		{ from: 2, to: 3, faces: [1, 7] },
		{ from: 3, to: 0, faces: [1, 10] },
		{ from: 4, to: 5, faces: [2, 5] },
		{ from: 5, to: 6, faces: [4, 8] },
		{ from: 6, to: 7, faces: [6, 4] },
		{ from: 7, to: 4, faces: [5, 11] },
		{ from: 0, to: 4, faces: [2, 11] },
		{ from: 1, to: 5, faces: [3, 9] },
		{ from: 2, to: 6, faces: [6, 8] },
		{ from: 3, to: 7, faces: [7, 10] },
	],
	faces: [
		{ a: 0, b: 1, c: 2, attrs: { color: "red", flip: true } },
		{ a: 2, b: 3, c: 0, attrs: { color: "red", flip: true } },
		{ a: 5, b: 0, c: 4, attrs: { color: "blue", flip: true } },
		{ a: 5, b: 1, c: 0, attrs: { color: "blue", flip: true } },
		{ a: 7, b: 6, c: 5, attrs: { color: "green", flip: true } },
		{ a: 5, b: 4, c: 7, attrs: { color: "green", flip: true } },
		{ a: 2, b: 6, c: 7, attrs: { color: "magenta", flip: true } },
		{ a: 7, b: 3, c: 2, attrs: { color: "magenta", flip: true } },
		{ a: 5, b: 6, c: 2, attrs: { color: "cyan", flip: true } },
		{ a: 2, b: 1, c: 5, attrs: { color: "cyan", flip: true } },
		{ a: 0, b: 3, c: 7, attrs: { color: "yellow", flip: true } },
		{ a: 7, b: 4, c: 0, attrs: { color: "yellow", flip: true } },
	],
}

export const cube2 = {
	vertices: [
		{ x: 10, y: 10, z: 10 },
		{ x: 10, y: -10, z: 10 },
		{ x: -10, y: -10, z: 10 },
		{ x: -10, y: 10, z: 10 },
		{ x: 10, y: 10, z: -10 },
		{ x: 10, y: -10, z: -10 },
		{ x: -10, y: -10, z: -10 },
		{ x: -10, y: 10, z: -10 },
		{ x: 50, y: 11, z: 50 },
		{ x: -50, y: 11, z: 50 },
		{ x: 50, y: 11, z: -50 },
		{ x: -50, y: 11, z: -50 },
		{ x: -20, y: 11, z: -20 },

	],
	edges: [
		{ vertices: [0,1], faces: [0, 3],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [1,2], faces: [0, 9],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [2,3], faces: [1, 7],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [3,0], faces: [1, 10],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [4,5], faces: [2, 5],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [5,6], faces: [4, 8],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [6,7], faces: [6, 4],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [7,4], faces: [5, 11],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [0,4], faces: [2, 11],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [1,5], faces: [3, 9],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [2,6], faces: [6, 8],  attrs: { class: "cube-edge", color: "#333", flip: false } },
		{ vertices: [3,7], faces: [7, 10],  attrs: { class: "cube-edge", color: "#333", flip: false } },
	],
	faces: [
		{ vertices: [0, 1, 2], attrs: { class: "cube-face", color: "red", flip: false } },
		{ vertices: [2, 3, 0], attrs: { class: "cube-face", color: "red", flip: false } },
		{ vertices: [5, 0, 4], attrs: { class: "cube-face", color: "blue", flip: false } },
		{ vertices: [5, 1, 0], attrs: { class: "cube-face", color: "blue", flip: false } },
		{ vertices: [7, 6, 5], attrs: { class: "cube-face", color: "cyan", flip: false } },
		{ vertices: [5, 4, 7], attrs: { class: "cube-face", color: "cyan", flip: false } },
		{ vertices: [2, 6, 7], attrs: { class: "cube-face", color: "magenta", flip: false } },
		{ vertices: [7, 3, 2], attrs: { class: "cube-face", color: "magenta", flip: false } },
		{ vertices: [5, 6, 2], attrs: { class: "cube-face", color: "green", flip: false } },
		{ vertices: [2, 1, 5], attrs: { class: "cube-face", color: "green", flip: false } },
		{ vertices: [0, 3, 7], attrs: { class: "cube-face", color: "yellow", flip: false } },
		{ vertices: [7, 4, 0], attrs: { class: "cube-face", color: "yellow", flip: false } },
		{ vertices: [8,9,11,10], attrs: { class: "ground", color: "#aaa", flip: true } },
	],
	masks: [
		{ vertices: [7,3,0,4], attrs: { class: "cube-mask", flip: true } },
	],
	labels: [
		{ vertex: 12, text: ["Hello","This interactive scene","is rendered via SVG"], attrs: { class:"cube-label", "pointer-events":"none",stroke:"white", "text-anchor": "middle", "stroke-width": "5px", "font-size": "1.4em", fill: "purple", transform: "translate(0, -40)"} },
	],
}