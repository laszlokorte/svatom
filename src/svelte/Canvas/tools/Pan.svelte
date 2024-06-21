<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view } from "../../svatom.svelte.js";

	const { frameBoxPath, clientToCanvas, panMovement } = $props();

	const grab = atom({ active: false });
	const grabPosition = view("position", grab);
	const grabbing = view("active", grab);
</script>

<path
	use:U.activeTouchMove={(evt) => {
		if (grabbing.value) {
			evt.preventDefault();
		}
	}}
	d={frameBoxPath.value}
	class="pan-surface"
	class:grabbing={grabbing.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	onpointerdown={(evt) => {
		if (grabbing.value) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		grabbing.value = true;
		grabPosition.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointermove={(evt) => {
		if (grabbing.value) {
			const newPos = clientToCanvas(evt.clientX, evt.clientY);
			panMovement.value = {
				x: grabPosition.value.x - newPos.x,
				y: grabPosition.value.y - newPos.y,
			};
		}
	}}
	onpointerup={(evt) => {
		grabbing.value = false;
	}}
	onpointercancel={(evt) => {
		grabbing.value = false;
	}}
/>

<style>
	.pan-surface {
		cursor: grab;
		outline: none;
	}
	.pan-surface.grabbing {
		cursor: grabbing;
	}
</style>
