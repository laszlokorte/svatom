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

	const lastIfExists = L.choice([L.last, L.removable("x", "y")]);

	const nodes = atom([{ x: 200, y: 100 }]);
	const drafts = atom([]);
	const newNode = view([L.appendTo, L.props("x", "y")], nodes);
	const newDraft = view([L.appendTo, L.props("x", "y")], drafts);
	const lastDraft = view([lastIfExists, L.props("x", "y")], drafts);
</script>

<button
	type="button"
	onclick={() => {
		nodes.value = [];
	}}>Clear</button
>
<div class="resizer">
	<svg
		bind:this={el.value}
		tabindex="-1"
		viewBox="-500 -500 1000 1000"
		preserveAspectRatio="XMidYMid meet"
		role="button"
		onkeypress={(evt) => {
			newNode.value = { x: 0, y: 0 };
		}}
		onpointerdown={(evt) => {
			const pt = $state.snapshot(svgPoint);
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				$state.snapshot(el.value).getScreenCTM().inverse(),
			);

			newDraft.value = { x: svgP.x, y: svgP.y };
		}}
		onpointermove={(evt) => {
			const pt = $state.snapshot(svgPoint);
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				$state.snapshot(el.value).getScreenCTM().inverse(),
			);

			lastDraft.value = { x: svgP.x, y: svgP.y };
		}}
		onpointerup={(evt) => {
			const pt = $state.snapshot(svgPoint);
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				$state.snapshot(el.value).getScreenCTM().inverse(),
			);

			newNode.value = lastDraft.value;
			lastDraft.value = undefined;
		}}
	>
		{#each nodes.value as v}
			<circle cx={v.x} cy={v.y} r="20"></circle>
		{/each}
		{#each drafts.value as v}
			<circle opacity="0.2" cx={v.x} cy={v.y} r="20"></circle>
		{/each}
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
