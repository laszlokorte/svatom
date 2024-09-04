<script>
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindScrollMax,
		bindSize,
		string,
		bindBoundingBox,
		update,
	} from "./svatom.svelte.js";

	const { element: e } = $props();

	const tipGrammar =
		/(?<tipKind>[^\(]+)\((?<angle>[^:]+):(?<outer_radius>[^:]+):(?<inner_radius>[^:]+):(?<filled>[^:]+)\)/;

	const source_tip = $derived(
		e.edge?.style?.source_tip
			? tipGrammar.exec(e.edge.style.source_tip)?.groups
			: null,
	);
	const target_tip = $derived(
		e.edge?.style?.target_tip
			? tipGrammar.exec(e.edge.style.target_tip)?.groups
			: null,
	);

	const allPoints = $derived([
		{ x: e.edge.source_x, y: e.edge.source_y },
		...e.edge.waypoints,
		{ x: e.edge.target_x, y: e.edge.target_y },
	]);

	function normalize({ x, y }) {
		const len = Math.hypot(x, y);
		return {
			x: x / len,
			y: y / len,
		};
	}

	const source_direction = $derived(
		normalize(
			allPoints
				.slice(0, 2)
				.reduce((a, b) => ({ x: b.x - a.x, y: b.y - a.y })),
		),
	);
	const target_direction = $derived(
		normalize(
			allPoints
				.slice(-2)
				.reduce((a, b) => ({ x: a.x - b.x, y: a.y - b.y })),
		),
	);

	const lineDecorations = {
		"de.renew.gui.AssocArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 5;
				const width = 0.7;
				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}M${to.x},${to.y}l${(-dxn - orthoX * width) * size},${(-dyn - orthoY * width) * size}`;
			},
			attributes: () => ({
				fill: "none",
				stroke: "black",
			}),
		},
		"de.renew.diagram.AssocArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 5;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}M${to.x},${to.y}l${(-dxn - orthoX * width) * size},${(-dyn - orthoY * width) * size}`;
			},
			attributes: () => ({
				fill: "none",
				stroke: "black",
			}),
		},
		"de.renew.gui.IsaArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 10;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}l${-2 * orthoX * width * size},${-2 * orthoY * width * size}z`;
			},
			attributes: () => ({
				fill: "white",
				stroke: "black",
			}),
		},
		"de.renew.gui.fs.IsaArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 10;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}l${-2 * orthoX * width * size},${-2 * orthoY * width * size}z`;
			},
			attributes: () => ({
				fill: "white",
				stroke: "black",
			}),
		},
		"de.renew.gui.fs.AssocArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}M${to.x},${to.y}l${(-dxn - orthoX * width) * size},${(-dyn - orthoY * width) * size}`;
			},
			attributes: () => ({
				fill: "none",
				stroke: "black",
			}),
		},
		"de.renew.diagram.SynchronousMessageArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}M${to.x},${to.y}l${(-dxn - orthoX * width) * size},${(-dyn - orthoY * width) * size}`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},
		"de.renew.gui.CircleDecoration": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 4;
				const width = 1;
				const angle = (180 / Math.PI) * Math.atan2(dy, dx);

				return `M${to.x},${to.y}
				m${-dxn * size},${-dyn * size}
				m${-orthoX * size * width},${-orthoY * size * width}
				a${size},${size * width}
				${angle} 1 1
				${2 * orthoX * size * width},${2 * orthoY * size * width}
				a${size},${size * width}
				${angle} 1 1
				${-2 * orthoX * size * width},${-2 * orthoY * size * width}
				`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},
		"CH.ifa.draw.figures.ArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.4;
				const indent = -0.15;

				return `M${to.x},${to.y}
				l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}
				l${-orthoX * width * size + dxn * indent * size},${-orthoY * width * size + dyn * indent * size}
				l${-orthoX * width * size - dxn * indent * size},${-orthoY * width * size - dyn * indent * size}
				z`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},

		"de.renew.gui.DoubleArrowTip": {
			path: (to, dir) => {
				const dxn = -dir.x;
				const dyn = -dir.y;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.4;
				const indent = -0.15;

				return `M${to.x},${to.y}
				l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}
				l${-orthoX * width * size + dxn * indent * size},${-orthoY * width * size + dyn * indent * size}
				l${-orthoX * width * size - dxn * indent * size},${-orthoY * width * size - dyn * indent * size}
				z
				m${-dxn * size},${-dyn * size}
				l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}
				l${-orthoX * width * size + dxn * indent * size},${-orthoY * width * size + dyn * indent * size}
				l${-orthoX * width * size - dxn * indent * size},${-orthoY * width * size - dyn * indent * size}
				z`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},
	};
</script>

<path
	stroke-width={e.edge.style?.stroke_width ?? 1}
	stroke-dasharray={e.edge.style?.stroke_dash_array ?? null}
	stroke={e.edge.style?.stroke_color ?? "black"}
	fill="none"
	d="M{e.edge.source_x},{e.edge.source_y}
						{e.edge.waypoints.map(({ x, y }) => `L ${x},${y}`).join(' ')}
							L{e.edge.target_x},{e.edge.target_y}"
/>

<!-- <path
	d="M {e.edge.source_x},{e.edge.source_y} l {20 * source_direction.x} {20 *
		source_direction.y}"
	stroke="red"
	stroke-width="3"
/>

<path
	d="M {e.edge.target_x},{e.edge.target_y} l {20 * target_direction.x} {20 *
		target_direction.y}"
	stroke="red"
	stroke-width="3"
/> -->

{#if source_tip}
	<path
		d={lineDecorations[source_tip.tipKind].path(
			{ x: e.edge.source_x, y: e.edge.source_y },
			source_direction,
		)}
		{...lineDecorations[source_tip.tipKind].attributes()}
	/>
{/if}

{#if target_tip}
	<path
		d={lineDecorations[target_tip.tipKind].path(
			{ x: e.edge.target_x, y: e.edge.target_y },
			target_direction,
		)}
		{...lineDecorations[target_tip.tipKind].attributes()}
	/>
{/if}
