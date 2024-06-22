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

	const minRadius = read(R.multiply(50), cameraScale);

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
	const rotating = view(R.has("pivot"), rotation);
	const rotationPivot = view(
		[
			L.rewrite(({ pivot }) => ({ pivot, ref: pivot })),
			L.removable("pivot"),
			"pivot",
			L.removable("x", "y"),
		],
		rotation,
	);
	const rotationRef = view("ref", rotation);

	const rotationRadius = view(
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
		if (rotating.value) {
			return;
		}
		const pos = clientToCanvas(evt.clientX, evt.clientY);

		evt.currentTarget.setPointerCapture(evt.pointerId);
		rotationPivot.value = pos;
	}}
	onpointermove={(evt) => {
		if (rotating.value) {
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
		if (rotating.value) {
			rotationPivot.value = undefined;
		}
	}}
	onpointercancel={(evt) => {
		if (rotating.value) {
			rotationPivot.value = undefined;
		}
	}}
/>

<g transform={rotationTransform.value}>
	{#if rotationPivot.value}
		<circle
			cx={rotationPivot.value.x}
			cy={rotationPivot.value.y}
			r={minRadius.value}
			fill="lightgray"
			class="ring"
			class:active={radiusIsLargeEnough.value}
			opacity="0.3"
			stroke="gray"
			stroke-width="10px"
			vector-effect="non-scaling-stroke"
		/>

		<circle
			cx={rotationPivot.value.x}
			cy={rotationPivot.value.y}
			r={cameraScale.value * 3}
			class="ref"
			opacity="0.3"
			fill="black"
		/>

		<line
			stroke="black"
			opacity="0.3"
			stroke-width="2px"
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
			fill="lightgray"
			class:active={radiusIsLargeEnough.value}
		/>
	{/if}
</g>

<style>
	.rotate-surface {
		outline: none;
	}
	.rotate-surface.rotating {
		cursor: rotating;
		cursor:
			var(--cursor-b) 16 16,
			default;
	}

	.ref.active {
		fill: green;
	}

	.ring.active {
		fill: lightgreen;
		stroke: darkgreen;
	}
</style>
