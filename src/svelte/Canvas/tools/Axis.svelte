<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		createAxis,
	} = $props();

	const axis = atom(undefined);

	const axisStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		axis,
	);
	const axisSize = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("size"), "size", L.removable("x", "y")],
			L.zero,
		),
		axis,
	);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		axis,
	);

	const axisAngle = view([L.removable("angle"), "angle"], axis);
	const axisAngleCos = view(
		[L.reread((r) => Math.cos((r / 180) * Math.PI))],
		axisAngle,
	);
	const axisAngleSin = view(
		[L.reread((r) => Math.sin((r / 180) * Math.PI))],
		axisAngle,
	);

	const axisPath = read(
		L.getter(({ axis: b, cameraScale: scale }) =>
			b && b.start && b.size
				? U.formattedNumbers`M${b.start.x - 10 * scale * Math.sign(b.size.x)},${b.start.y}h${b.size.x}
				m${Math.sign(b.size.x) * (10 * scale)},0l${Math.sign(b.size.x) * (-10 * scale)},${-10 * scale}v${2 * 10 * scale}l${Math.sign(b.size.x) * (10 * scale)},${-10 * scale}
				M${b.start.x},${b.start.y - 10 * scale * Math.sign(b.size.y)}v${b.size.y}
				m0,${Math.sign(b.size.y) * (10 * scale)}l${-10 * scale},${Math.sign(b.size.y) * (-10 * scale)}h${2 * 10 * scale}l${-10 * scale},${Math.sign(b.size.y) * (10 * scale)}
				`
				: "",
		),
		combine({ axis, cameraScale }),
	);
	export const canCancel = read(R.identity, isActive);
	export function cancel() {
		isActive.value = false;
	}
</script>

<path
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="axis-surface"
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		evt.stopPropagation();
	}}
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			isActive.value = false;
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			isActive.value = false;
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		axisStart.value = clientToCanvas(evt.clientX, evt.clientY);
		axisSize.value = { x: 0, y: 0 };
		axisAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		const worldPos = clientToCanvas(evt.clientX, evt.clientY);

		const dx = worldPos.x - axisStart.value.x;
		const dy = worldPos.y - axisStart.value.y;
		axisSize.value = {
			x: axisAngleCos.value * dx + axisAngleSin.value * dy,
			y: -axisAngleSin.value * dx + axisAngleCos.value * dy,
		};
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}
		createAxis(axis.value);
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

<g pointer-events="none" transform={rotationTransform.value}>
	{#if axis.value}
		<path
			d={axisPath.value}
			transform="rotate({axisAngle.value}, {axisStart.value.x}, {axisStart
				.value.y})"
			fill="none"
			class="axis"
			pointer-events="none"
		/>
	{/if}
</g>

<style>
	.axis-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.axis {
		fill: none;
		stroke: magenta;
		fill: magenta;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		shape-rendering: crispedges;
	}
</style>
