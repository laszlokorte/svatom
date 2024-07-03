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

	const creator = atom(undefined);

	const draft = view([L.removable("x", "y")], creator);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		draft,
	);
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
			isActive.value = false;
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);

		draft.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		draft.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}
		newNode.value = clientToCanvas(evt.clientX, evt.clientY);

		isActive.value = false;
	}}
	onclick={(evt) => {
		//newNode.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointercancel={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		isActive.value = false;
	}}
	onlostpointercapture={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		isActive.value = false;
	}}
/>

<g pointer-events="none" transform={rotationTransform.value}>
	{#if isActive.value}
		<circle
			class="node"
			opacity="0.2"
			cx={draft.value.x}
			cy={draft.value.y}
			r={Math.min(20, cameraScale.value * 20)}
		></circle>
	{/if}
</g>

<style>
	.creator-surface {
		stroke-width: 0;
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
