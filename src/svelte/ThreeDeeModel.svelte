<script>
	import * as L from "partial.lenses";
	import * as G from "./generators";
	import * as R from "ramda";
	import * as U from "./utils";
	import {
		atom,
		view,
		read,
		combine,
		update,
		failableView,
		bindValue,
		autofocusIf,
	} from "./svatom.svelte.js";

	const numf = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	});

	const {
		id,
		debug = false,
		corners = false,
		camera = atom({
			w: 50,
			h: 50,
			np: 10,
			fp: 100,
			cp: 5,
			scale: 1200,
			aspect: 1,
			fov: Math.PI / 5,
			backoff: 0,
		}),
		selected = atom(),
		geo = atom({
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
		}),
		trans = atom({
			rx: 0,
			ry: 0,
			rz: 0,
			tx: 0,
			ty: 0,
			tz: 60,
			sx: 1,
			sy: 1,
			sz: 1,
		}),
	} = $props();

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

	const viewTransform = (near, far, w, h) =>
		L.reread(({ x, y, z }) => {
			const A = -(far + near) / (far - near);
			const B = (-2 * far * near) / (far - near);
			return {
				x: x / w,
				y: -y / h,
				z: -z * A + B,
				s: z,
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

	const svgLine = (baseAttrs) =>
		L.reread(
			({
				from: { x: x1, y: y1, z: z1 },
				to: { x: x2, y: y2, z: z2 },
				facePoints,
				attrs,
			}) => {
				if (z1 < 0 || z2 < 0) {
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

				const { width, color } = { ...baseAttrs, ...attrs };

				return {
					x1,
					y1,
					x2,
					y2,
					stroke: color ?? "black",
					"stroke-width": width ?? "inherit",
					clockwise: facePoints
						? !facePoints.every(
								({ a, b, c }) =>
									!clockwise(a.x, a.y, b.x, b.y, c.x, c.y),
							)
						: null,
				};
			},
		);

	function clockwise(x1, y1, x2, y2, x3, y3) {
		return (y2 - y1) * (x3 - x2) - (y3 - y2) * (x2 - x1) >= 0;
	}

	const svgTriangle = (baseAttrs) =>
		L.reread(
			({
				a: { x: x1, y: y1, z: z1 },
				b: { x: x2, y: y2, z: z2 },
				c: { x: x3, y: y3, z: z3 },
				attrs,
			}) => {
				if (z1 < 0 || z2 < 0 || z3 < 0) {
					return {
						points: ``,
						fill: "none",
						stroke: "none",
						"stroke-width": "0",
						opacity: "0",
						behind: true,
					};
				}

				const {
					width,
					color,
					opacity,
					flip = false,
				} = { ...baseAttrs, ...attrs };

				return {
					points: `${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`,
					fill: color ?? "black",
					"fill-opacity": opacity ?? "1",
					clockwise: flip != clockwise(x1, y1, x2, y2, x3, y3),
					behind: false,
				};
			},
		);

	const svgQuad = () =>
		L.reread(
			({
				a: { x: x1, y: y1, z: z1 },
				b: { x: x2, y: y2, z: z2 },
				c: { x: x3, y: y3, z: z3 },
				d: { x: x4, y: y4, z: z4 },
			}) => {
				if (z1 < 0 || z2 < 0 || z3 < 0 || z4 < 0) {
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
					points: `${x1} ${y1} ${x2} ${y2} ${x3} ${y3} ${x4} ${y4}`,
					clockwise:
						clockwise(x1, y1, x2, y2, x3, y3) &&
						clockwise(x1, y1, x3, y3, x4, y4),
					behind: false,
				};
			},
		);

	const svgTriangleTip = ({ r = 10, rd = 30, width, color, opacity }) =>
		L.reread(
			({
				a: { x: x1, y: y1, z: z1 },
				b: { x: x2, y: y2, z: z2, s: s2 },
				c: { x: x3, y: y3, z: z3 },
			}) => {
				if (z2 < 0) {
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
					r: r + rd * Math.exp(-z2),
					fill: color ?? "black",
					"fill-opacity": opacity ?? "1",
					clockwise: clockwise(x1, y1, x2, y2, x3, y3),
					behind: false,
				};
			},
		);

	const svgTriangleCenter = ({ r = 10, width, color, opacity }) =>
		L.reread(
			({
				a: { x: x1, y: y1, z: z1 },
				b: { x: x2, y: y2, z: z2 },
				c: { x: x3, y: y3, z: z3 },
			}) => {
				if (z2 < 0) {
					return {
						x: 0,
						y: 0,
						fill: "none",
						stroke: "none",
						"stroke-width": "0",
						opacity: "0",
						behind: true,
					};
				}
				return {
					x: (x1 + x2 + x3) / 3,
					y: (y1 + y2 + y3) / 3,
					fill: color ?? "black",
					"fill-opacity": opacity ?? "1",
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
					({ z, ...rest }) => ({
						...rest,
						z: z + camera.backoff / Math.tan(camera.fov / 2),
					}),
					viewTransform(
						camera.np,
						camera.fp,
						camera.aspect * Math.tan(camera.fov / 2),
						Math.tan(camera.fov / 2),
					),
					project(camera.scale * Math.log(20 + camera.backoff)),
				],
				p,
			),
		);
	});

	const points3d = view(["vertices", L.defaults([])], geo);
	const edges = view(["edges", L.defaults([])], geo);
	const faces = view(["faces", L.defaults([])], geo);
	const masks = view(["masks", L.defaults([])], geo);
	const quads = view(["quads", L.defaults([])], geo);

	const transformedPoints = view(
		transformAll,
		combine({ ps: points3d, mat: trans }),
	);
	const projectedPoints = view(
		projectAll,
		combine({ ps: transformedPoints, camera }),
	);

	const radToDeg = [L.multiply(180), L.divide(Math.PI)];
	const rx = view(["rx", radToDeg], trans);
	const ry = view(["ry", radToDeg], trans);
	const rz = view(["rz", radToDeg], trans);
	const tx = view(["tx"], trans);
	const ty = view(["ty"], trans);
	const tz = view(["tz"], trans);
	const sx = view(["sx"], trans);
	const sy = view(["sy"], trans);
	const sz = view(["sz"], trans);
	const np = view(
		L.lens(
			({ np, fp }) => np,
			(n, { fp, np, ...rest }) => ({
				...rest,
				fp: n + (fp - np),
				np: n,
			}),
		),
		camera,
	);
	const fp = view(
		L.lens(
			({ np, fp }) => fp - np,
			(n, { np, ...rest }) => ({ ...rest, np, fp: np + n }),
		),
		camera,
	);
	const scale = view(["scale"], camera);
	const pointIndices = view(indices, points3d);
	const edgeIndices = view(indices, edges);
	const faceIndices = view(indices, faces);
	const maskIndices = view(indices, masks);

	function getIndices(idx) {
		return idx ? L.reread((arr) => idx.map((i) => arr[i])) : L.zero;
	}
	function getEntries(idxs) {
		return L.reread((obj) =>
			idxs
				? idxs.map((idx) =>
						Object.fromEntries(
							Object.entries(idx).map(([i, v]) => [i, obj[v]]),
						),
					)
				: undefined,
		);
	}
	function getEntry(idx) {
		return L.reread((obj) =>
			idx
				? Object.fromEntries(
						Object.entries(idx).map(([i, v]) => [i, obj[v]]),
					)
				: undefined,
		);
	}
</script>

{#each edgeIndices.value as i (i)}
	{@const e = view(i, edges)}
	{@const attrs = view("attrs", e)}
	{@const pp1 = view([e.value.from], projectedPoints)}
	{@const pp2 = view([e.value.to], projectedPoints)}
	{@const facidx = view([getIndices(e.value.faces)], edgeIndices)}
	{@const facs = view([getIndices(facidx.value)], faces)}
	{@const facePoints = view([getEntries(facs.value)], projectedPoints)}
	{@const line = view(
		svgLine({ color: "inherit" }),
		combine({ from: pp1, to: pp2, facePoints, attrs }),
	)}

	<line {...line.value}></line>
{/each}

{#each faceIndices.value as i (i)}
	{@const e = view(i, faces)}
	{@const ppA = view([e.value.a], projectedPoints)}
	{@const ppB = view([e.value.b], projectedPoints)}
	{@const ppC = view([e.value.c], projectedPoints)}
	{@const attrs = view("attrs", e)}

	{@const triangle = view(
		svgTriangle({ opacity: 0.1 }),
		combine({ a: ppA, b: ppB, c: ppC, attrs }),
	)}
	<polygon
		stroke="none"
		class:clickable={selected}
		class:selected={selected && selected.value === i}
		onclick={(evt) => {
			if ((evt.ctrlKey || evt.altKey) && selected) {
				evt.stopPropagation();
				selected.value = i;
			}
		}}
		{...triangle.value}
	></polygon>

	{#if corners}
		{@const triangleTip1 = view(
			svgTriangleTip({ color: "#aa1010", opacity: 1, r: 3 }),
			combine({ a: ppA, b: ppB, c: ppC }),
		)}
		{@const triangleTip2 = view(
			svgTriangleTip({ color: "#aa1010", opacity: 1, r: 3 }),
			combine({ b: ppA, c: ppB, a: ppC }),
		)}
		{@const triangleTip3 = view(
			svgTriangleTip({ color: "#aa1010", opacity: 1, r: 3 }),
			combine({ c: ppA, a: ppB, b: ppC }),
		)}
		<circle pointer-events="none" {...triangleTip1.value}></circle>
		<circle pointer-events="none" {...triangleTip2.value}></circle>
		<circle pointer-events="none" {...triangleTip3.value}></circle>
	{/if}

	{#if debug}
		{@const triangleCenter = view(
			svgTriangleCenter({ color: "magenta", opacity: 1 }),
			combine({ a: ppA, b: ppB, c: ppC }),
		)}
		<text font-size="20" {...triangleCenter.value}>{i}</text>
	{/if}
{/each}

{#if debug}
	{#each pointIndices.value as i (i)}
		{@const ptr = view([i, "z"], projectedPoints)}
		{@const pt = view([i], projectedPoints)}
		{@const pp = view([svgCircle(4)], pt)}
		{@const text = view([svgText], pt)}

		{#if ptr.value > 0}
			<circle {...pp.value} opacity="0.5"></circle>
			<text
				{...text.value}
				transform="translate(0,{-(30 + pp.value.r)})"
				font-size="20"
				text-anchor="middle"
				dominant-baseline="central">{i}</text
			><text
				{...text.value}
				transform="translate(0,{30 + pp.value.r})"
				fill="red"
				font-size="20"
				text-anchor="middle"
				dominant-baseline="central">{numf.format(ptr.value)}</text
			>
		{/if}
	{/each}
{/if}

{#if id}
	<defs>
		{#each maskIndices.value as i (i)}
			{@const fs = view([i, "faces"], masks)}
			{@const qs = view([i, "quads"], masks)}

			<clipPath id={id + "-quad-" + i}>
				{#each fs.value as i (i)}
					{@const e = view(i, faces)}
					{@const ppA = view([e.value.a], projectedPoints)}
					{@const ppB = view([e.value.b], projectedPoints)}
					{@const ppC = view([e.value.c], projectedPoints)}
					{@const attrs = view("attrs", e)}

					{@const triangle = view(
						svgTriangle({ opacity: 0.1 }),
						combine({ a: ppA, b: ppB, c: ppC, attrs }),
					)}
					<polygon stroke="none" class="clip" {...triangle.value}
					></polygon>
				{/each}

				{#each qs.value as i (i)}
					{@const q = view(i, quads)}
					{@const corners = view(
						[getEntry(q.value)],
						projectedPoints,
					)}
					{@const quad = view(svgQuad({}), corners)}
					<polygon stroke="none" class="clip" {...quad.value}
					></polygon>
				{/each}
			</clipPath>
		{/each}
	</defs>
{/if}

<style>
	.viewport {
		width: 100%;
		height: 50vh;
	}

	polygon[clockwise="true"] {
		fill: none;
	}

	polygon.clickable[clockwise="true"] {
		pointer-events: all;
	}

	polygon[clockwise="false"] {
		pointer-events: none;
	}

	polygon.clip[clockwise="false"] {
		display: none;
	}

	polygon.selected {
		stroke: magenta;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 4;
		stroke-opacity: 1;
		vector-effect: non-scaling-stroke;
		fill: magenta;
		fill-opacity: 0.2;
		stroke-opacity: 0.4;
	}

	polygon[clockwise="false"].selected {
		stroke: cyan;
		stroke-width: 2;
		fill: cyan;
	}

	circle[clockwise="false"] {
		transform: scale(0.4);
		transform-box: fill-box;
		fill: white;
		fill-opacity: 0.2;
		transform-origin: 50% 50%;
	}
	line[clockwise="false"] {
		stroke-dasharray: 4 4;
		stroke-width: 1;
		stroke: black;
		stroke-opacity: 0.4;
	}

	line {
		vector-effect: non-scaling-stroke;
	}

	text {
		pointer-events: none;
	}
</style>
