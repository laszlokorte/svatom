<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, disableTouchEventsIf } from "../../svatom.svelte.js";

	const { frameBoxPath, clientToCanvas, panMovement } = $props();

	const grab = atom({ active: false });
	const grabPosition = view([L.removable("position"), "position"], grab);
	const pointerId = view([L.removable("pointerId"), "pointerId"], grab);
	const grabbing = view(
		L.lens(R.compose(R.not, R.isNil), (b, o) => (b ? o : undefined)),
		pointerId,
	);
</script>

<path
	use:disableTouchEventsIf={grabbing}
	d={frameBoxPath.value}
	class="pan-surface"
	class:grabbing={grabbing.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	onpointerdown={(evt) => {
		if (!(evt.isPrimary && U.isLeftButton(evt))) {
			return;
		}
		if (grabbing.value) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		grabbing.value = true;
		pointerId.value = evt.pointerId;
		grabPosition.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const newPos = clientToCanvas(evt.clientX, evt.clientY);
			panMovement.value = {
				x: grabPosition.value.x - newPos.x,
				y: grabPosition.value.y - newPos.y,
			};
		}
	}}
	onpointerup={(evt) => {
		pointerId.value = undefined;
	}}
	onpointercancel={(evt) => {
		pointerId.value = undefined;
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
