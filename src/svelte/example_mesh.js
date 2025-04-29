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
			faces: [3, 11],
			/*attrs: { color: "blue" }*/
		},
		{
			from: 1,
			to: 5,
			faces: [2, 9],
			/*attrs: { color: "red" }*/
		},
		{
			from: 2,
			to: 6,
			faces: [7, 8],
			/*attrs: { color: "green" }*/
		},
		{
			from: 3,
			to: 7,
			faces: [6, 13],
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
		{ a: 4, b: 5, c: 1, attrs: { color: "red" } },
		{ a: 1, b: 0, c: 4, attrs: { color: "red" } },
		{ a: 7, b: 6, c: 5, attrs: { color: "red" } },
		{ a: 5, b: 4, c: 7, attrs: { color: "red" } },
		{ a: 6, b: 7, c: 3, attrs: { color: "red" } },
		{ a: 3, b: 2, c: 6, attrs: { color: "red" } },
		{ a: 1, b: 6, c: 2, attrs: { color: "red" } },
		{ a: 1, b: 5, c: 6, attrs: { color: "red" } },
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
		{ from: 1, to: 2, faces: [0, 8] },
		{ from: 2, to: 3, faces: [1, 7] },
		{ from: 3, to: 0, faces: [1, 11] },
		{ from: 4, to: 5, faces: [2, 5] },
		{ from: 5, to: 6, faces: [4, 9] },
		{ from: 6, to: 7, faces: [6, 4] },
		{ from: 7, to: 4, faces: [5, 10] },
		{ from: 0, to: 4, faces: [3, 11] },
		{ from: 1, to: 5, faces: [2, 9] },
		{ from: 2, to: 6, faces: [7, 8] },
		{ from: 3, to: 7, faces: [6, 10] },
	],
	faces: [
		{ a: 0, b: 1, c: 2, attrs: { color: "red", flip: true } },
		{ a: 2, b: 3, c: 0, attrs: { color: "red", flip: true } },
		{ a: 4, b: 5, c: 1, attrs: { color: "blue", flip: true } },
		{ a: 1, b: 0, c: 4, attrs: { color: "blue", flip: true } },
		{ a: 7, b: 6, c: 5, attrs: { color: "green", flip: true } },
		{ a: 5, b: 4, c: 7, attrs: { color: "green", flip: true } },
		{ a: 6, b: 7, c: 3, attrs: { color: "magenta", flip: true } },
		{ a: 3, b: 2, c: 6, attrs: { color: "magenta", flip: true } },
		{ a: 1, b: 6, c: 2, attrs: { color: "cyan", flip: true } },
		{ a: 1, b: 5, c: 6, attrs: { color: "cyan", flip: true } },
		{ a: 4, b: 3, c: 7, attrs: { color: "yellow", flip: true } },
		{ a: 3, b: 4, c: 0, attrs: { color: "yellow", flip: true } },
	],
}