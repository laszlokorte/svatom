<script>
	import * as L from "partial.lenses";
	import * as G from "./generators";
	import * as R from "ramda";
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		autofocusIf,
		string,
	} from "./svatom.svelte.js";
	import { derived } from "svelte/store";

	const el = atom(null);
	const rotEl = atom(null);
	const svgPoint = $derived(el.value ? el.value.createSVGPoint() : null);

	const lastOrNew = L.ifElse(R.length, [L.index(0)], [L.appendTo]);

	const camera = atom({
		focus: {
			x: 0,
			y: 0,
			z: 0,
			w: 0,
		},
		plane: {
			x: 100,
			y: 100,
		},
		frame: {
			aspect: "meet",
			alignX: "Mid",
			alignY: "Mid",
			padding: 10,
		},
	});

	const preserveAspectRatio = $derived(
		`x${camera.value.frame.alignX}Y${camera.value.frame.alignY} ${camera.value.frame.aspect}`,
	);

	const viewBox = $derived(
		`${camera.value.focus.x - (camera.value.plane.x / 2) * Math.exp(-camera.value.focus.z)} 
		${camera.value.focus.y - (camera.value.plane.y / 2) * Math.exp(-camera.value.focus.z)} 
		${camera.value.plane.x * Math.exp(-camera.value.focus.z)} 
		${camera.value.plane.y * Math.exp(-camera.value.focus.z)}`,
	);

	const viewBoxPath = $derived(
		`M${camera.value.focus.x - (camera.value.plane.x / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)},
		${camera.value.focus.y - (camera.value.plane.y / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}
		H${camera.value.focus.x + (camera.value.plane.x / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}
		V${camera.value.focus.y + (camera.value.plane.y / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}
		H${camera.value.focus.x - (camera.value.plane.x / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}z`,
	);

	const rotationTransform = $derived(
		`translate(${camera.value.focus.x}, ${camera.value.focus.y}) rotate(${camera.value.focus.w}) translate(${-camera.value.focus.x}, ${-camera.value.focus.y}) `,
	);

	const cameraZoom = view(["focus", "z"], camera);
	const cameraX = view(["focus", "x"], camera);
	const cameraY = view(["focus", "y"], camera);
	const cameraAngle = view(["focus", "w"], camera);

	const tool = atom("select");
	const nodes = atom([{ x: 200, y: 100 }]);
	const drafts = atom([]);
	const rubberBand = atom(undefined);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);
	const isDrafting = view([L.index(0), L.defaults(false)], drafts);
	const lastDraft = view([L.index(0), L.removable("x", "y")], drafts);

	const rubberBandStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		rubberBand,
	);
	const rubberBandEnd = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("end"), "end", L.removable("x", "y")],
			L.zero,
		),
		rubberBand,
	);

	const rubberBandPath = read(
		L.getter((b) =>
			b && b.start && b.end
				? `M${b.start.x},${b.start.y}H${b.end.x}V${b.end.y}H${b.start.x}z`
				: "",
		),
		rubberBand,
	);

	const dragTool = $derived(
		{
			create: combine({
				final: newNode,
				start: isDrafting,
				current: lastDraft,
				root: rotEl,
			}),
			select: combine({
				start: rubberBandStart,
				current: rubberBandEnd,
				root: el,
			}),
		}[tool.value],
	);

	// const dragTool = combine({
	// 	start: rubberBandStart,
	// 	current: rubberBandEnd,
	// 	final: L.zero,
	// });

	const dragToolStart = $derived(view("start", dragTool));
	const dragToolCurrent = $derived(view("current", dragTool));
	const dragToolFinal = $derived(view("final", dragTool));
	const dragRoot = $derived(view("root", dragTool));

	const makeSquare = L.lens(R.identity, (n, o) => ({
		...n,
		x: Math.min(n.x, n.y),
		y: Math.min(n.x, n.y),
	}));

	const makeXSquare = L.lens(R.identity, (n, o) => ({
		...n,
		x: n.y,
		y: n.y,
	}));
</script>

<div>
	X:
	<input
		type="range"
		bind:value={cameraX.value}
		min="-400"
		max="400"
		step="0.1"
	/>
	Y:
	<input
		type="range"
		bind:value={cameraY.value}
		min="-400"
		max="400"
		step="0.1"
	/>
	<br />
	Zoom:
	<input
		type="range"
		bind:value={cameraZoom.value}
		min="-2"
		max="5"
		step="0.1"
	/>
	Rotation:
	<input
		type="range"
		bind:value={cameraAngle.value}
		min="-90"
		max="90"
		step="0.1"
	/>
</div>

<button
	type="button"
	onclick={() => {
		nodes.value = [];
	}}>Clear</button
>

<label
	><input type="radio" bind:group={tool.value} value="select" /> Select</label
>
<label
	><input type="radio" bind:group={tool.value} value="create" /> Create</label
>

<div class="resizer">
	<svg
		bind:this={el.value}
		use:bindSize={view(["plane", makeSquare], camera)}
		tabindex="-1"
		{viewBox}
		{preserveAspectRatio}
		role="button"
		onkeydown={(evt) => {
			dragToolCurrent.value = undefined;
		}}
		onpointerdown={(evt) => {
			evt.currentTarget.setPointerCapture(evt.pointerId);
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				dragRoot.value.getScreenCTM().inverse(),
			);

			///newDraft.value = { x: svgP.x, y: svgP.y };
			dragToolStart.value = { x: svgP.x, y: svgP.y };
			dragToolCurrent.value = { x: svgP.x, y: svgP.y };
		}}
		onpointermove={(evt) => {
			if (dragToolStart.value) {
				const pt = svgPoint;
				pt.x = evt.clientX;
				pt.y = evt.clientY;
				const svgP = pt.matrixTransform(
					dragRoot.value.getScreenCTM().inverse(),
				);

				//lastDraft.value = { x: svgP.x, y: svgP.y };
				dragToolCurrent.value = { x: svgP.x, y: svgP.y };
			}
		}}
		onpointerup={(evt) => {
			if (dragToolStart.value) {
				const pt = svgPoint;
				pt.x = evt.clientX;
				pt.y = evt.clientY;
				const svgP = pt.matrixTransform(
					dragRoot.value.getScreenCTM().inverse(),
				);

				//newNode.value = lastDraft.value;
				//lastDraft.value = undefined;
				//rubberBandStart.value = undefined;
				dragToolCurrent.value = undefined;
				dragToolFinal.value = { x: svgP.x, y: svgP.y };
			}
		}}
	>
		<path d={viewBoxPath} fill="#ddffee" />

		<g transform={rotationTransform} bind:this={rotEl.value}>
			<g>
				{#each nodes.value as v, i (i)}
					<circle cx={v.x} cy={v.y} r="20"></circle>
				{/each}
			</g>
			<g>
				{#each drafts.value as v, i (i)}
					<circle opacity="0.2" cx={v.x} cy={v.y} r="20"></circle>
				{/each}
			</g>
		</g>

		<path
			d={rubberBandPath.value}
			fill-opacity="0.2"
			fill="blue"
			stroke="blue"
			vector-effect="non-scaling-stroke"
			stroke-width="1px"
			shape-rendering="crispEdges"
		/>
	</svg>
</div>

<style>
	.resizer {
		display: grid;
		min-height: 10em;
		height: 40em;
		width: 100%;
		resize: both;
		overflow: hidden;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		border: 3px solid #333;
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
		grid-area: 1/1/1/1;
	}

	circle {
		fill: #dd4e40;
		stroke: #aa0b10;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}
</style>
