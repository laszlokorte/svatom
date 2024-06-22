<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import {
		atom,
		view,
		read,
		combine,
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		zoomMovement,
		rotationTransform,
		cameraScale,
	} = $props();

	const minRadius = read(R.multiply(3), cameraScale);

	const zoom = atom({});
	const zooming = view(R.has("pivotScreen"), zoom);
	const zoomPivotScreen = view(
		[
			L.rewrite(({ pivotScreen }) => ({
				pivotScreen,
				pivotWorld: clientToCanvas(pivotScreen.x, pivotScreen.y),
				refScreen: pivotScreen,
				refWorld: clientToCanvas(pivotScreen.x, pivotScreen.y),
			})),
			L.removable("pivotScreen"),
			"pivotScreen",
			L.removable("x", "y"),
		],
		zoom,
	);

	const zoomPivotWorld = view("pivotWorld", zoom);

	const zoomRefScreen = view(
		[
			L.props("refWorld", "refScreen"),
			L.rewrite(({ refScreen }) => ({
				refWorld: clientToCanvas(refScreen.x, refScreen.y),
				refScreen: refScreen,
			})),
			L.removable("refScreen"),
			"refScreen",
			L.removable("x", "y"),
		],
		zoom,
	);

	const zoomRefWorld = view("refWorld", zoom);
</script>

<path
	d={frameBoxPath.value}
	class="rotate-surface"
	class:zooming={zooming.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	use:disableTouchEventsIf={zooming}
	onpointerdown={(evt) => {
		if (zooming.value) {
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);
		zoomPivotScreen.value = { x: evt.clientX, y: evt.clientY };
	}}
	onpointermove={(evt) => {
		if (zooming.value) {
			const newPos = { x: evt.clientX, y: evt.clientY };

			const newDx = newPos.x - zoomPivotScreen.value.x;
			const newDy = newPos.y - zoomPivotScreen.value.y;
			const distance = Math.hypot(newDx, newDy);

			if (distance > minRadius.value) {
				const oldDx = zoomRefScreen.value.x - zoomPivotScreen.value.x;
				const oldDy = zoomRefScreen.value.y - zoomPivotScreen.value.y;

				const dot = oldDx * newDx + oldDy * newDy;
				const det = oldDx * newDy - oldDy * newDx;

				const angle = Math.atan2(det, dot);
				const factor = Math.pow(distance / 100, 2);
				const dz = (angle / Math.PI) * factor;

				zoomMovement.value = {
					dz: dz,
					px: zoomPivotWorld.value.x,
					py: zoomPivotWorld.value.y,
				};
			}

			zoomRefScreen.value = newPos;
		}
	}}
	onpointerup={(evt) => {
		if (zooming.value) {
			zoomPivotScreen.value = undefined;
		}
	}}
	onpointercancel={(evt) => {
		if (zooming.value) {
			zoomPivotScreen.value = undefined;
		}
	}}
/>

<g transform={rotationTransform.value}>
	{#if zoomPivotWorld.value}
		<circle
			cx={zoomPivotWorld.value.x}
			cy={zoomPivotWorld.value.y}
			r={cameraScale.value * 3}
			class="ref"
			fill="gray"
		/>

		<line
			stroke="gray"
			stroke-width="1px"
			vector-effect="non-scaling-stroke"
			x1={zoomPivotWorld.value.x}
			y1={zoomPivotWorld.value.y}
			x2={zoomRefWorld.value.x}
			y2={zoomRefWorld.value.y}
		/>

		<circle
			cx={zoomRefWorld.value.x}
			cy={zoomRefWorld.value.y}
			r={cameraScale.value * 5}
			class="ref"
			fill="lightgray"
		/>
	{/if}
</g>

<style>
	.rotate-surface {
		outline: none;
	}
</style>
