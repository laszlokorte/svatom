<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		autofocusIf,
		string,
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
		frame,
		rotationTransform,
		cameraOrientation,
	} = $props();

	const rubberBand = atom(undefined);
	const pointerId = view([L.removable("pointerId"), "pointerId"], rubberBand);

	const rubberBandStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		rubberBand,
	);
	const rubberBandSize = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("size"), "size", L.removable("x", "y")],
			L.zero,
		),
		rubberBand,
	);

	const rubberBandAngle = view([L.removable("angle"), "angle"], rubberBand);
	const rubberBandAngleCos = view(
		[L.reread((r) => Math.cos((r / 180) * Math.PI))],
		rubberBandAngle,
	);
	const rubberBandAngleSin = view(
		[L.reread((r) => Math.sin((r / 180) * Math.PI))],
		rubberBandAngle,
	);

	const rubberBandPath = read(
		L.getter((b) =>
			b && b.start && b.size
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}h${numberSvgFormat.format(b.size.x)}v${numberSvgFormat.format(b.size.y)}M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}v${numberSvgFormat.format(b.size.y)}h${numberSvgFormat.format(b.size.x)}`
				: "",
		),
		rubberBand,
	);

	const rubberBandTransform = read(
		L.reread((r) => `rotate(${r.angle}, ${r.start.x}, ${r.start.y})`),
		rubberBand,
	);
</script>

<path
	use:disableTouchEventsIf={rubberBandStart}
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="rubber-band-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			pointerId.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (rubberBandStart.value) {
			evt.preventDefault();
			return;
		}
		if (!evt.isPrimary) {
			return;
		}
		pointerId.value = evt.pointerId;

		evt.currentTarget.setPointerCapture(evt.pointerId);
		rubberBandStart.value = clientToCanvas(evt.clientX, evt.clientY);
		rubberBandSize.value = { x: 0, y: 0 };
		rubberBandAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			const dx = svgP.x - rubberBandStart.value.x;
			const dy = svgP.y - rubberBandStart.value.y;
			rubberBandSize.value = {
				x:
					rubberBandAngleCos.value * dx +
					rubberBandAngleSin.value * dy,
				y:
					-rubberBandAngleSin.value * dx +
					rubberBandAngleCos.value * dy,
			};
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

<g pointer-events="none" transform={rotationTransform.value}>
	<path
		d={rubberBandPath.value}
		transform={rubberBandTransform.value}
		fill="none"
		class="rubber-band"
		pointer-events="none"
	/>
</g>

<style>
	.rubber-band-surface {
		cursor: default;
		outline: none;
	}

	.rubber-band {
		stroke-dasharray: 5 5;
		fill: #27b7db;
		stroke: #2374ff;
		fill-opacity: 0.2;
		fill-rule: evenodd;
		stroke-width: 1px;
		shape-rendering: crispEdges;
		vector-effect: non-scaling-stroke;
		animation: 4s linear marquee infinite;
	}

	@keyframes marquee {
		0% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: -100;
		}
	}
</style>
