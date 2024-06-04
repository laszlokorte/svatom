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

	const el = atom(null);
	const svgPoint = $derived(el.value ? el.value.createSVGPoint() : null);

	const lastOrNew = L.ifElse(R.length, [L.index(0)], [L.appendTo]);

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
			}),
			select: combine({
				start: rubberBandStart,
				current: rubberBandEnd,
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
</script>

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
		tabindex="-1"
		viewBox="-500 -500 1000 1000"
		preserveAspectRatio="XMidYMid meet"
		role="button"
		onkeydown={(evt) => {
			dragToolCurrent.value = undefined;
		}}
		onpointerdown={(evt) => {
			evt.currentTarget.setPointerCapture(evt.pointerId);
			const pt = $state.snapshot(svgPoint);
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				$state.snapshot(el.value).getScreenCTM().inverse(),
			);

			///newDraft.value = { x: svgP.x, y: svgP.y };
			dragToolStart.value = { x: svgP.x, y: svgP.y };
			dragToolCurrent.value = { x: svgP.x, y: svgP.y };
		}}
		onpointermove={(evt) => {
			if (dragToolStart.value) {
				const pt = $state.snapshot(svgPoint);
				pt.x = evt.clientX;
				pt.y = evt.clientY;
				const svgP = pt.matrixTransform(
					$state.snapshot(el.value).getScreenCTM().inverse(),
				);

				//lastDraft.value = { x: svgP.x, y: svgP.y };
				dragToolCurrent.value = { x: svgP.x, y: svgP.y };
			}
		}}
		onpointerup={(evt) => {
			if (dragToolStart.value) {
				const pt = $state.snapshot(svgPoint);
				pt.x = evt.clientX;
				pt.y = evt.clientY;
				const svgP = pt.matrixTransform(
					$state.snapshot(el.value).getScreenCTM().inverse(),
				);

				//newNode.value = lastDraft.value;
				//lastDraft.value = undefined;
				//rubberBandStart.value = undefined;
				dragToolCurrent.value = undefined;
				dragToolFinal.value = { x: svgP.x, y: svgP.y };
			}
		}}
	>
		{#each nodes.value as v}
			<circle cx={v.x} cy={v.y} r="20"></circle>
		{/each}
		{#each drafts.value as v}
			<circle opacity="0.2" cx={v.x} cy={v.y} r="20"></circle>
		{/each}

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
	}
</style>
