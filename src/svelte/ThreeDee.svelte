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
		failableView,
		bindValue,
		autofocusIf,
	} from "./svatom.svelte.js";

	const numf = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	});

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

	const project = (np, fp, scale) =>
		L.reread(({ x, y, z }) => {
			const f = (z - np) / (fp - np);
			return {
				x: (scale * x) / f,
				y: -(scale * y) / f,
				s: f,
			};
		});

	const svgCircle = (r) =>
		L.reread(({ x, y, s }) => {
			return { cx: x, cy: y, r: r + r / s };
		});

	const svgText = L.reread(({ x, y, s }) => {
		return { x: x, y: y };
	});

	const svgLine = ({ width, color }) =>
		L.reread(
			({
				from: { x: x1, y: y1, s: s1 },
				to: { x: x2, y: y2, s: s2 },
			}) => {
				if (s1 < 0 || s2 < 0) {
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

				return {
					x1,
					y1,
					x2,
					y2,
					stroke: color ?? "black",
					"stroke-width": width ?? 1,
				};
			},
		);

	function clockwise(x1, y1, x2, y2, x3, y3) {
		return (y2 - y1) * (x3 - x2) - (y3 - y2) * (x2 - x1) >= 0;
	}

	const svgTriangle = ({ width, color, opacity }) =>
		L.reread(
			({
				a: { x: x1, y: y1, s: s1 },
				b: { x: x2, y: y2, s: s2 },
				c: { x: x3, y: y3, s: s3 },
			}) => {
				if (s1 < 0 || s2 < 0 || s3 < 0) {
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
					points: `${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`,
					fill: color ?? "black",
					opacity: opacity ?? "1",
					clockwise: clockwise(x1, y1, x2, y2, x3, y3),
					behind: false,
				};
			},
		);

	const svgTriangleTip = ({ r = 10, width, color, opacity }) =>
		L.reread(
			({
				a: { x: x1, y: y1, s: s1 },
				b: { x: x2, y: y2, s: s2 },
				c: { x: x3, y: y3, s: s3 },
			}) => {
				if (s2 < 0) {
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
					r: r + r / s2,
					fill: color ?? "black",
					opacity: opacity ?? "1",
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
			L.get(project(camera.np, camera.fp, camera.scale), p),
		);
	});

	const geo = atom({
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
			{ from: 0, to: 1 },
			{ from: 1, to: 2 },
			{ from: 2, to: 3 },
			{ from: 3, to: 0 },
			{ from: 4, to: 5 },
			{ from: 5, to: 6 },
			{ from: 6, to: 7 },
			{ from: 7, to: 4 },
			{ from: 0, to: 4 },
			{ from: 1, to: 5 },
			{ from: 2, to: 6 },
			{ from: 3, to: 7 },
			{ from: 0, to: 8 },
			{ from: 3, to: 8 },
			{ from: 4, to: 8 },
			{ from: 7, to: 8 },
		],
		faces: [
			{ a: 0, b: 1, c: 2 },
			{ a: 2, b: 3, c: 0 },
			{ a: 4, b: 5, c: 1 },
			{ a: 1, b: 0, c: 4 },
			{ a: 7, b: 6, c: 5 },
			{ a: 5, b: 4, c: 7 },
			{ a: 6, b: 7, c: 3 },
			{ a: 3, b: 2, c: 6 },
			{ a: 1, b: 6, c: 2 },
			{ a: 1, b: 5, c: 6 },
		],
	});
	const points3d = view("vertices", geo);
	const edges = view("edges", geo);
	const faces = view("faces", geo);
	const trans = atom({
		rx: 0,
		ry: 0,
		rz: 0,
		tx: 0,
		ty: 0,
		tz: 60,
		sx: 1,
		sy: 1,
		sz: 1,
	});
	const camera = atom({
		np: 10,
		fp: 100,
		scale: 5,
	});

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
</script>

<svg
	preserveAspectRatio="xMidYMid meet"
	viewBox="-500 -500 1000 1000"
	class="viewport"
>
	<rect
		x="-500"
		y="-500"
		width="1000"
		height="1000"
		fill="none"
		stroke="black"
		stroke-dasharray="10 10"
		opacity="0.2"
	/>
	{#each edgeIndices.value as i (i)}
		{@const e = view(i, edges)}
		{@const pp1 = view([e.value.from], projectedPoints)}
		{@const pp2 = view([e.value.to], projectedPoints)}
		{@const line = view(
			svgLine({ color: "red", width: 3 }),
			combine({ from: pp1, to: pp2 }),
		)}

		<line {...line.value}></line>
	{/each}

	{#each faceIndices.value as i (i)}
		{@const e = view(i, faces)}
		{@const ppA = view([e.value.a], projectedPoints)}
		{@const ppB = view([e.value.b], projectedPoints)}
		{@const ppC = view([e.value.c], projectedPoints)}

		{@const triangle = view(
			svgTriangle({ color: "#aa1010", opacity: 0.1 }),
			combine({ a: ppA, b: ppB, c: ppC }),
		)}
		{@const triangleTip1 = view(
			svgTriangleTip({ color: "#aa1010", opacity: 1, r: 2 }),
			combine({ a: ppA, b: ppB, c: ppC }),
		)}
		{@const triangleTip2 = view(
			svgTriangleTip({ color: "#aa1010", opacity: 1, r: 2 }),
			combine({ b: ppA, c: ppB, a: ppC }),
		)}
		{@const triangleTip3 = view(
			svgTriangleTip({ color: "#aa1010", opacity: 1, r: 2 }),
			combine({ c: ppA, a: ppB, b: ppC }),
		)}

		<polygon {...triangle.value}></polygon>
		<circle {...triangleTip1.value}></circle>
		<circle {...triangleTip2.value}></circle>
		<circle {...triangleTip3.value}></circle>
	{/each}

	{#each pointIndices.value as i (i)}
		{@const ptr = view([i, "s"], projectedPoints)}
		{@const pt = view([i], projectedPoints)}
		{@const pp = view([svgCircle(1)], pt)}
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
</svg>

<fieldset>
	<legend>Controls</legend>

	<label
		>rx: <output>{numf.format(rx.value)}</output>
		<input type="range" bind:value={rx.value} min="-360" max="360" /></label
	>
	<label
		>ry: <output>{numf.format(ry.value)}</output>
		<input type="range" bind:value={ry.value} min="-360" max="360" /></label
	>
	<label
		>rz: <output>{numf.format(rz.value)}</output>
		<input type="range" bind:value={rz.value} min="-360" max="360" /></label
	>

	<label
		>sx: <output>{numf.format(sx.value)}</output>
		<input
			type="range"
			bind:value={sx.value}
			step="0.01"
			min="0"
			max="10"
		/></label
	>
	<label
		>sy: <output>{numf.format(sy.value)}</output>
		<input
			type="range"
			bind:value={sy.value}
			step="0.01"
			min="0"
			max="10"
		/></label
	>
	<label
		>sz: <output>{numf.format(sz.value)}</output>
		<input
			type="range"
			bind:value={sz.value}
			step="0.01"
			min="0"
			max="10"
		/></label
	>

	<label
		>tx: <output>{numf.format(tx.value)}</output>
		<input type="range" bind:value={tx.value} min="-100" max="100" /></label
	>
	<label
		>ty: <output>{numf.format(ty.value)}</output>
		<input type="range" bind:value={ty.value} min="-100" max="100" /></label
	>
	<label
		>tz: <output>{numf.format(tz.value)}</output>
		<input type="range" bind:value={tz.value} min="0" max="300" />
	</label>
	<label
		>np: <output>{numf.format(np.value)}</output>
		<input
			type="range"
			bind:value={np.value}
			min="0.1"
			step="0.1"
			max="200"
		/></label
	>
	<label
		>fp: <output>{numf.format(fp.value)}</output>
		<input type="range" bind:value={fp.value} min="0" max="200" /></label
	>
	<label
		>scale: <output>{numf.format(scale.value)}</output>
		<input type="range" bind:value={scale.value} min="0" max="40" /></label
	>
</fieldset>

<style>
	.viewport {
		width: 100%;
		height: 80vh;
	}

	polygon[clockwise="true"] {
		fill: blue;
	}

	circle[clockwise="false"] {
		display: none;
	}
</style>
