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
		rotateMovement,
		rotationTransform,
		cameraScale,
	} = $props();

	const minRadius = read(R.multiply(40), cameraScale);

	const cursorImgB = window.URL.createObjectURL(
		new Blob(
			[
				`<?xml version="1.0" encoding="utf-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="16" r="8" fill="#4edd40" />
</svg>`,
			],
			{ type: "image/svg+xml" },
		),
	);

	const rotation = atom({});
	const pointerId = view([L.removable("pointerId"), "pointerId"], rotation);
	const rotating = view(
		L.lens(R.compose(R.not, R.isNil), (b, o) => (b ? o : undefined)),
		pointerId,
	);
	const rotationPivot = view(
		[
			L.props("pivot", "ref"),
			L.rewrite(({ pivot }) => ({ pivot, ref: pivot })),
			L.removable("pivot"),
			"pivot",
			L.removable("x", "y"),
		],
		rotation,
	);
	const rotationRef = view("ref", rotation);

	const rotationRadius = view(
		[
			L.props("pivot", "ref"),
			L.lens(
				({ pivot, ref }) => {
					return Math.hypot(ref.x - pivot.x, ref.y - pivot.y);
				},
				(newRadius, { pivot, ref }) => {
					const dx = ref.x - pivot.x;
					const dy = ref.y - pivot.y;

					const oldRadius = Math.hypot(dx, dy);

					return {
						pivot,
						ref: {
							x: pivot.x + (newRadius * dx) / oldRadius,
							y: pivot.y + (newRadius * dy) / oldRadius,
						},
					};
				},
			),
		],
		rotation,
	);

	const radiusIsLargeEnough = read(
		({ r, m }) => r >= m,
		combine({ r: rotationRadius, m: minRadius }),
	);
	const clampedRef = read(
		({ rot: { pivot, ref }, min }) => {
			const dx = ref.x - pivot.x;
			const dy = ref.y - pivot.y;

			const oldRadius = Math.hypot(dx, dy);

			if (!oldRadius) {
				return pivot;
			}

			return {
				x: pivot.x + (R.clamp(0, min, oldRadius) * dx) / oldRadius,
				y: pivot.y + (R.clamp(0, min, oldRadius) * dy) / oldRadius,
			};
		},
		combine({ rot: rotation, min: minRadius }),
	);
</script>

<path
	d={frameBoxPath.value}
	class="rotate-surface"
	class:rotating={rotating.value}
	style:--cursor-b="url({cursorImgB})"
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	use:disableTouchEventsIf={rotating}
	onpointerdown={(evt) => {
		if (!(evt.isPrimary && U.isLeftButton(evt))) {
			return;
		}
		if (rotating.value) {
			return;
		}
		const pos = clientToCanvas(evt.clientX, evt.clientY);

		pointerId.value = evt.pointerId;
		evt.currentTarget.setPointerCapture(evt.pointerId);
		rotationPivot.value = pos;
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const newPos = clientToCanvas(evt.clientX, evt.clientY);
			const distance = Math.hypot(
				newPos.x - rotationPivot.value.x,
				newPos.y - rotationPivot.value.y,
			);

			if (distance > minRadius.value) {
				const dw =
					Math.atan2(
						newPos.y - rotationPivot.value.y,
						newPos.x - rotationPivot.value.x,
					) -
					Math.atan2(
						rotationRef.value.y - rotationPivot.value.y,
						rotationRef.value.x - rotationPivot.value.x,
					);

				rotateMovement.value = {
					dw: (dw * 180) / Math.PI,
					px: rotationPivot.value.x,
					py: rotationPivot.value.y,
				};
				rotationRadius.value = distance;
			} else {
				rotationRef.value = newPos;
			}
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId) {
			pointerId.value = undefined;
		}
	}}
	onpointercancel={(evt) => {
		if (pointerId.value === evt.pointerId) {
			pointerId.value = undefined;
		}
	}}
/>

<g transform={rotationTransform.value}>
	{#if rotationPivot.value}
		<circle
			cx={rotationPivot.value.x}
			cy={rotationPivot.value.y}
			r={minRadius.value}
			stroke="#444"
			class="ring"
			class:active={radiusIsLargeEnough.value}
			fill-opacity="0.1"
			stroke-width="4px"
			vector-effect="non-scaling-stroke"
		/>
		<circle
			cx={rotationPivot.value.x}
			cy={rotationPivot.value.y}
			r={minRadius.value * 0.92}
			stroke-dasharray="7 4"
			fill="#aa8888"
			class="ring"
			class:active={radiusIsLargeEnough.value}
			fill-opacity="0.3"
			stroke="#444"
			stroke-width="4px"
			vector-effect="non-scaling-stroke"
		/>

		<circle
			cx={rotationPivot.value.x}
			cy={rotationPivot.value.y}
			r={cameraScale.value * 3}
			class="ref"
			stroke="#444"
		/>

		<line
			stroke-opacity="0.8"
			stroke-width="1px"
			class="ref"
			stroke="#444"
			vector-effect="non-scaling-stroke"
			x1={rotationPivot.value.x}
			y1={rotationPivot.value.y}
			x2={clampedRef.value.x}
			y2={clampedRef.value.y}
		/>

		<circle
			cx={clampedRef.value.x}
			cy={clampedRef.value.y}
			r={cameraScale.value * 5}
			class="ref"
			fill="#444"
			class:active={radiusIsLargeEnough.value}
		/>
	{/if}
</g>

<style>
	.rotate-surface {
		outline: none;
	}
	.rotate-surface.rotating {
		/*cursor:
			var(--cursor-b) 16 16,
			default;*/
	}

	.ref.active {
		fill: darkgreen;
		stroke: darkgreen;
	}

	.ring.active {
		fill: lightgreen;
		stroke: darkgreen;
		stroke-opacity: 1;
	}
</style>
