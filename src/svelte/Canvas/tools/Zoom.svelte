<script>
	import { tick } from "svelte";
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import * as Geo from "../../geometry";
	import {
		atom,
		view,
		read,
		combine,
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

	const POLAR = true;

	const {
		frameBoxPath,
		clientToCanvas,
		zoomMovement,
		rotationTransform,
		cameraScale,
	} = $props();

	const minRadius = read(R.multiply(3), cameraScale);

	const zoom = atom({});
	const zooming = view(R.has("pivotClient"), zoom);
	const zoomPivotClient = view(
		[
			L.rewrite(({ pivotClient }) => ({
				pivotClient,
				pivotWorld: clientToCanvas(pivotClient.x, pivotClient.y),
				refClient: pivotClient,
			})),
			L.removable("pivotClient"),
			"pivotClient",
			L.removable("x", "y"),
		],
		zoom,
	);

	const zoomPivotWorld = view(["pivotWorld"], zoom);

	const zoomRefClient = view(
		[L.removable("refClient"), "refClient", L.removable("x", "y")],
		zoom,
	);

	const zoomRefWorld = view(
		[
			"refClient",
			L.reread((refClient) => clientToCanvas(refClient.x, refClient.y)),
		],
		zoom,
	);

	const zoomRefWorldRadius = view(
		L.lens(
			({ pivotWorld, refClient }) => {
				const refWorld = clientToCanvas(refClient.x, refClient.y);
				return Math.hypot(
					refWorld.x - pivotWorld.x,
					refWorld.y - pivotWorld.y,
				);
			},
			(newRadius, { pivotWorld, refClient }) => {
				const refWorld = clientToCanvas(refClient.x, refClient.y);

				const dx = refWorld.x - pivot.x;
				const dy = refWorld.y - pivot.y;
				const sdx = refClient.x - pivot.x;
				const sdy = refClient.y - pivot.y;

				const oldRadius = Math.hypot(dx, dy);

				return {
					pivotWorld,
					ref: {
						x: pivot.x + (newRadius * sdx) / oldRadius,
						y: pivot.y + (newRadius * sdy) / oldRadius,
					},
				};
			},
		),
		zoom,
	);
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
		zoomPivotClient.value = { x: evt.clientX, y: evt.clientY };
	}}
	onpointermove={(evt) => {
		if (zooming.value) {
			const newPos = { x: evt.clientX, y: evt.clientY };

			const newDx = Math.abs(newPos.x - zoomPivotClient.value.x);
			const newDy = newPos.y - zoomPivotClient.value.y;
			const distance = Math.hypot(newDx, newDy);

			if (POLAR) {
				if (distance > minRadius.value) {
					const angle = Geo.angleRadBetween(
						zoomRefClient.value,
						zoomPivotClient.value,
						newPos,
					);
					const factor = Math.pow(distance / 100, 2);
					const dz = (angle / Math.PI) * factor;

					zoomMovement.value = {
						dz: dz,
						px: zoomPivotWorld.value.x,
						py: zoomPivotWorld.value.y,
					};
				}
			} else {
				const factor = newDx / 10000;
				const dz = -(newPos.y - zoomRefClient.value.y) * factor;

				zoomMovement.value = {
					dz: dz,
					px: zoomPivotWorld.value.x,
					py: zoomPivotWorld.value.y,
				};
			}

			// TODO remove tick if clientToCanvas is updated to not rely on SVG dom
			tick().then(() => {
				zoomRefClient.value = newPos;
			});
		}
	}}
	onpointerup={(evt) => {
		if (zooming.value) {
			zoomPivotClient.value = undefined;
		}
	}}
	onpointercancel={(evt) => {
		if (zooming.value) {
			zoomPivotClient.value = undefined;
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

		<!-- <line
			stroke="gray"
			stroke-width="1px"
			vector-effect="non-scaling-stroke"
			x1={zoomPivotWorld.value.x}
			y1={zoomPivotWorld.value.y}
			x2={zoomRefWorld.value.x}
			y2={zoomRefWorld.value.y}
		/>
 -->
		<circle
			cx={zoomRefWorld.value.x}
			cy={zoomRefWorld.value.y}
			r={cameraScale.value * 5}
			class="ref"
			fill="black"
		/>

		<circle
			cx={zoomPivotWorld.value.x}
			cy={zoomPivotWorld.value.y}
			r={zoomRefWorldRadius.value}
			class="ref"
			fill="none"
			stroke="black"
			opacity="0.1"
			stroke-width="3px"
			vector-effect="non-scaling-stroke"
			stroke-dasharray="5px 5px"
		/>
	{/if}
</g>

<style>
	.rotate-surface {
		outline: none;
	}
</style>
