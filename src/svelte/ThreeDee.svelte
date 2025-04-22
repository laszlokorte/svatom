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
	import ThreeDeeModel from "./ThreeDeeModel.svelte";

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

	const viewTransform = (np, fp, w, h) =>
		L.reread(({ x, y, z }) => {
			const s = (z - np) / (fp - np);
			return {
				x: x / w,
				y: -y / h,
				z: s,
				s,
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
			L.get(
				[
					viewTransform(camera.np, camera.fp, camera.w, camera.h),
					project(camera.scale),
				],
				p,
			),
		);
	});

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
		w: 50,
		h: 50,
		np: 10,
		fp: 100,
		scale: 1000,
	});
	const selected = atom();
	const debug = atom(false);

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
	<ThreeDeeModel
		id="model-a"
		{trans}
		{camera}
		{selected}
		debug={debug.value}
	/>

	<g clip-path="url(#model-a-quad-0)">
		<ThreeDeeModel
			id="model-b"
			trans={view(
				L.iso(
					(c) => ({
						...c,
						sx: 0.4,
						sy: 0.4,
						sz: 0.4,
						rz: -0.3 * c.rz + c.ry * 0.1,
						rx: -0.3 * c.rx + c.ry * 0.1,
					}),
					(c, o) => ({
						...c,
						sx: o.sx,
						sy: o.sy,
						sz: o.sz,
						ry: -c.ry,
					}),
				),
				trans,
			)}
			{camera}
			{selected}
		/>
	</g>

	<ThreeDeeModel
		trans={view(
			L.iso(
				(c) => ({
					...c,
					tx: c.tx + 30,
					ty: c.ty + 8,
					sx: 0.4,
					sy: 0.4,
					sz: 0.4,
					rz: 0,
				}),
				(c, o) => ({
					...c,
					tx: c.tx - 20,
					ty: c.ty - 8,
					sx: o.sx,
					sy: o.sy,
					sz: o.sz,
					rz: o.rz,
				}),
			),
			trans,
		)}
		{camera}
		{selected}
	/>

	<g clip-path="url(#model-a-quad-0)">
		<circle
			stroke="white"
			stroke-width="10"
			stroke-linejoin="round"
			cx="0"
			cy="0"
			r="60"
			fill="red"
			clip-path="url(#model-b-quad-0)"
		/>
	</g>

	<polygon
		stroke="white"
		stroke-width="10"
		stroke-linejoin="round"
		points="-80 -90 80 -90 0 100"
		fill="blue"
		clip-path="url(#model-a-quad-1)"
	/>

	<rect
		stroke="white"
		stroke-width="10"
		stroke-linejoin="round"
		x="-50"
		y="-70"
		width="200"
		height="200"
		fill="yellow"
		clip-path="url(#model-a-quad-2)"
	/>

	<polygon
		stroke="white"
		stroke-width="10"
		stroke-linejoin="round"
		points="-80 90 80 90 0 -100"
		fill="purple"
		clip-path="url(#model-a-quad-3)"
	/>

	<rect
		stroke="white"
		stroke-width="10"
		stroke-linejoin="round"
		x="-50"
		y="-50"
		width="200"
		height="200"
		rx="40"
		ry="40"
		fill="orange"
		clip-path="url(#model-a-quad-4)"
	/>

	<rect
		stroke="white"
		stroke-width="10"
		stroke-linejoin="round"
		x="-75"
		y="-75"
		width="150"
		height="150"
		rx="40"
		ry="40"
		fill="darkred"
		clip-path="url(#model-a-quad-5)"
	/>
</svg>

<fieldset>
	<legend>Controls</legend>

	<div>
		<label><input type="checkbox" bind:checked={debug.value} /> Debug</label
		>
	</div>

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
		<input
			type="range"
			bind:value={scale.value}
			min="0"
			max="2000"
		/></label
	>
</fieldset>

<style>
	svg {
		user-select: none;
		font-family: inherit;
	}

	.viewport {
		width: 100%;
		height: 50vh;
	}

	polygon[clockwise="true"] {
		fill: blue;
	}

	circle[clockwise="false"] {
		display: none;
	}
</style>
