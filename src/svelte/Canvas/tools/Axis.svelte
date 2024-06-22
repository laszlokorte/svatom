<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import {
		atom,
		view,
		read,
		combine,
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const {
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		cameraOrientation,
		cameraScale,
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
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}h${numberSvgFormat.format(b.size.x)}
				m${Math.sign(b.size.x) * (10 * scale)},0l${Math.sign(b.size.x) * (-10 * scale)},${-10 * scale}v${2 * 10 * scale}l${Math.sign(b.size.x) * (10 * scale)},${-10 * scale}
				M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}v${numberSvgFormat.format(b.size.y)}
				m0,${Math.sign(b.size.y) * (10 * scale)}l${-10 * scale},${Math.sign(b.size.y) * (-10 * scale)}h${2 * 10 * scale}l${-10 * scale},${Math.sign(b.size.y) * (10 * scale)}
				`
				: "",
		),
		combine({ axis, cameraScale }),
	);
</script>

<path
	use:disableTouchEventsIf={axisStart}
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="axis-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			axisSize.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (axisStart.value) {
			return;
		}
		if (!U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		const svgP = clientToCanvas(evt.clientX, evt.clientY);
		axisStart.value = { x: svgP.x, y: svgP.y };
		axisSize.value = { x: 0, y: 0 };
		axisAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (axisStart.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			const dx = svgP.x - axisStart.value.x;
			const dy = svgP.y - axisStart.value.y;
			axisSize.value = {
				x: axisAngleCos.value * dx + axisAngleSin.value * dy,
				y: -axisAngleSin.value * dx + axisAngleCos.value * dy,
			};
		}
	}}
	onpointerup={(evt) => {
		if (axisStart.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			axisSize.value = undefined;
		}
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
	}
</style>
