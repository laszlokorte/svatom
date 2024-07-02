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

	const rotation = atom({});
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
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (b, o) => (b ? o : undefined)),
		rotationPivot,
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
	class:rotating={isActive.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	use:disableTouchEventsIf={isActive}
	onpointerdown={(evt) => {
		if (!(evt.isPrimary && U.isLeftButton(evt))) {
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);
		rotationPivot.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

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
		stroke-width: 0;
		outline: none;
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
