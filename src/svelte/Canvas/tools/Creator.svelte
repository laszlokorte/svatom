<script>
	import * as L from "partial.lenses";
	import * as G from "../../generators";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
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
	} from "../../svatom.svelte.js";

	const { frame, newNode, rotationTransform, cameraScale } = $props();

	const rootEl = atom(null);
	$inspect(rootEl.value)
	const svgPoint = $derived(
		rootEl.value ? rootEl.value.ownerSVGElement.createSVGPoint() : null,
	);

	const drafts = atom([]);

	const isDrafting = view([L.index(0), L.defaults(false)], drafts);
	const lastDraft = view([L.index(0), L.removable("x", "y")], drafts);
</script>

<g
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		lastDraft.value = undefined;
	}}
	onpointerdown={(evt) => {
		
		if(!U.isLeftButton(evt)) {
			return
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		const pt = svgPoint;
		pt.x = evt.clientX;
		pt.y = evt.clientY;
		const svgP = pt.matrixTransform(
			rootEl.value.getScreenCTM().inverse(),
		);
		isDrafting.value = { x: svgP.x, y: svgP.y };
		lastDraft.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (isDrafting.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			lastDraft.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (isDrafting.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			lastDraft.value = undefined;
			newNode.value = { x: svgP.x, y: svgP.y }
		}
	}}>

	{@render frame()}
</g>

<g pointer-events="none" transform={rotationTransform.value} bind:this={rootEl.value}>
	{#each drafts.value as v, i (i)}
		<circle class="node" opacity="0.2" cx={v.x} cy={v.y} r={Math.min(20, cameraScale.value*20)}></circle>
	{/each}
</g>

<style>
	
	.node {
		fill: #dd4e40;
		stroke: #aa0b10;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}
</style>