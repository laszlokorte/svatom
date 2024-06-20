<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view } from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		newNode,
		rotationTransform,
		cameraScale,
	} = $props();

	const drafts = atom([]);

	const isDrafting = view([L.index(0), L.defaults(false)], drafts);
	const lastDraft = view([L.index(0), L.removable("x", "y")], drafts);
</script>

<path
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="creator-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			lastDraft.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (!U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		const svgP = clientToCanvas(evt.clientX, evt.clientY);

		isDrafting.value = { x: svgP.x, y: svgP.y };
		lastDraft.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (isDrafting.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			lastDraft.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (isDrafting.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			lastDraft.value = undefined;
			newNode.value = { x: svgP.x, y: svgP.y };
		}
	}}
/>

<g pointer-events="none" transform={rotationTransform.value}>
	{#each drafts.value as v, i (i)}
		<circle
			class="node"
			opacity="0.2"
			cx={v.x}
			cy={v.y}
			r={Math.min(20, cameraScale.value * 20)}
		></circle>
	{/each}
</g>

<style>
	.creator-surface {
		cursor: copy;
	}
	.node {
		fill: #dd4e40;
		stroke: #aa0b10;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}
</style>
