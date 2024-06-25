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
		axis = atom(undefined),
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		cameraOrientation,
		cameraScale,
	} = $props();

	const axisStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		axis,
	);
	const axisAngle = view([L.removable("angle"), "angle"], axis);

	const axisPath = read(
		L.getter(({ axis: b, cameraScale: scale }) =>
			b && b.start && b.size
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}
				m${numberSvgFormat.format(b.size.x)},0
				h${numberSvgFormat.format(-b.size.x - 10 * scale * Math.sign(b.size.x))}
				m${numberSvgFormat.format(10 * scale * Math.sign(b.size.x))},${numberSvgFormat.format(-10 * scale * Math.sign(b.size.y))}
				v${numberSvgFormat.format(b.size.y + 10 * scale * Math.sign(b.size.y))}
				`
				: "",
		),
		combine({ axis, cameraScale }),
	);

	const axisArrowPath = read(
		L.getter(({ axis: b, cameraScale: scale }) =>
			b && b.start && b.size
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}
				m0,${numberSvgFormat.format(b.size.y)}

				m0,${Math.sign(b.size.y) * (10 * scale)}l${-10 * scale},${Math.sign(b.size.y) * (-10 * scale)}h${2 * 10 * scale}z

				M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}
				m${numberSvgFormat.format(b.size.x)},0
				m${Math.sign(b.size.x) * (10 * scale)},0l${Math.sign(b.size.x) * (-10 * scale)},${-10 * scale}v${2 * 10 * scale}z

				`
				: "",
		),
		combine({ axis, cameraScale }),
	);
</script>

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

		<path
			d={axisArrowPath.value}
			transform="rotate({axisAngle.value}, {axisStart.value.x}, {axisStart
				.value.y})"
			fill="none"
			class="axis-head"
			pointer-events="none"
		/>
	{/if}
</g>

<style>
	.axis {
		stroke: #111;
		stroke-width: 1px;
		stroke-dasharray: none;
		vector-effect: non-scaling-stroke;
	}

	.axis-head {
		fill: #111;
		stroke-dasharray: none;
		vector-effect: non-scaling-stroke;
	}
</style>
