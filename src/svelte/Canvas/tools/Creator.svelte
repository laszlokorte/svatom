<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, disableTouchEventsIf } from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		newNode,
		rotationTransform,
		cameraScale,
	} = $props();

	const creator = atom([]);

	const pointerId = view([L.removable("pointerId"), "pointerId"], creator);
	const drafts = view("drafts", creator);

	const isDrafting = view([L.index(0), L.defaults(false)], drafts);
	const lastDraft = view([L.index(0), L.removable("x", "y")], drafts);
</script>

<path
	use:disableTouchEventsIf={isDrafting}
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="creator-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			pointerId.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (isDrafting.value) {
			return;
		}
		if (!U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);

		const svgP = clientToCanvas(evt.clientX, evt.clientY);

		pointerId.value = evt.pointerId;
		isDrafting.value = svgP;
		lastDraft.value = svgP;
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			lastDraft.value = clientToCanvas(evt.clientX, evt.clientY);
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId) {
			pointerId.value = undefined;
			newNode.value = clientToCanvas(evt.clientX, evt.clientY);
		}
	}}
	onpointercancel={(evt) => {
		if (pointerId.value === evt.pointerId) {
			pointerId.value = undefined;
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
		outline: none;
	}
	.node {
		fill: #dd4e40;
		stroke: #aa0b10;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}
</style>
