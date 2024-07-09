<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, throttled } from "../../svatom.svelte.js";

	const { frameBoxPath, clientToCanvas, panMovement } = $props();

	const grab = atom({ active: false });
	const grabPosition = view([L.removable("position"), "position"], grab);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (b, o) => (b ? o : undefined)),
		grabPosition,
	);
</script>

<path
	d={frameBoxPath.value}
	class="pan-surface"
	class:grabbing={isActive.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	oncontextmenu={(evt) => {
		evt.preventDefault();
		isActive.value = false;
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		grabPosition.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			isActive.value = false;
			return;
		}
		if (!isActive.value) {
			return;
		}
		const newPos = clientToCanvas(evt.clientX, evt.clientY);
		panMovement.value = {
			x: grabPosition.value.x - newPos.x,
			y: grabPosition.value.y - newPos.y,
		};
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		isActive.value = false;
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

<style>
	.pan-surface {
		stroke-width: 0;
		cursor: grab;
		outline: none;
	}
	.pan-surface.grabbing {
		cursor: grabbing;
	}
</style>
