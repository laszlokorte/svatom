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
		disableEventIf,
	} from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		rotateMovement,
		rotationTransform,
		cameraScale,
		state = atom({}),
	} = $props();

	const minRadius = read(R.multiply(40), cameraScale);

	const rotation = state;
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

	const rotPivot = $derived(rotationPivot.value);
	const active = $derived(radiusIsLargeEnough.value);
	const clampedRefValue = $derived(clampedRef.value);
</script>

<path
	d={frameBoxPath.value}
	class={"rotate-surface"}
	class:rotating={isActive.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		evt.stopPropagation();
	}}
	onkeydown={(evt) => {
		evt.stopPropagation();
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		isActive.value = false;
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			isActive.value = false;

			return;
		}
		evt.preventDefault();

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
		const piv = rotationPivot.value;
		const distance = Math.hypot(newPos.x - piv.x, newPos.y - piv.y);

		if (distance > minRadius.value) {
			const dw =
				Math.atan2(newPos.y - piv.y, newPos.x - piv.x) -
				Math.atan2(
					rotationRef.value.y - piv.y,
					rotationRef.value.x - piv.x,
				);

			rotateMovement.value = {
				dw: (dw * 180) / Math.PI,
				px: piv.x,
				py: piv.y,
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
	onlostpointercapture={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		isActive.value = false;
	}}
	use:disableEventIf={{ eventType: "wheel", cond: isActive }}
/>

<g transform={rotationTransform.value} pointer-events="none">
	{#if rotPivot}
		<circle
			cx={rotPivot.x}
			cy={rotPivot.y}
			r={minRadius.value}
			stroke="#444"
			class={"ring"}
			class:active
			fill-opacity="0.1"
			stroke-width="{4 * cameraScale.value}px"
		/>
		<circle
			cx={rotPivot.x}
			cy={rotPivot.y}
			r={minRadius.value * 0.92}
			stroke-dasharray="{7 * cameraScale.value} {4 * cameraScale.value}"
			fill="#aa8888"
			class={"ring"}
			class:active
			fill-opacity="0.3"
			stroke="#444"
			stroke-width="{4 * cameraScale.value}px"
		/>

		<circle
			cx={rotPivot.x}
			cy={rotPivot.y}
			r={cameraScale.value * 3}
			class="ref"
			stroke="#444"
			class:active
		/>

		<line
			stroke-opacity="0.8"
			stroke-width="{1 * cameraScale.value}px"
			class="ref-line"
			stroke="#444"
			x1={rotPivot.x}
			y1={rotPivot.y}
			x2={clampedRefValue.x}
			y2={clampedRefValue.y}
			class:active
		/>

		<circle
			cx={clampedRefValue.x}
			cy={clampedRefValue.y}
			r={cameraScale.value * 5}
			class="ref"
			fill="#444"
			class:active
		/>
	{/if}
</g>

<style>
	.rotate-surface {
		stroke-width: 0;
		outline: none;
	}

	.ref {
		stroke-width: 0;
		stroke: none;
	}

	.ref-line {
		stroke-opacity: 0.8;
		stroke-width: 1px;
		stroke: #444;
		vector-effect: non-scaling-stroke;
	}

	.ref-line.active {
		stroke: darkgreen;
	}

	.ref.active {
		fill: darkgreen;
	}

	.ring.active {
		fill: lightgreen;
		stroke: darkgreen;
		stroke-opacity: 1;
	}
</style>
