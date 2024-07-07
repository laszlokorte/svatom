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
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		rubberBandStart,
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

	export const canCancel = read(R.identity, isActive);
	export function cancel() {
		isActive.value = false;
	}
</script>

<path
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="rubber-band-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			isActive.value = false;
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);

		rubberBandStart.value = clientToCanvas(evt.clientX, evt.clientY);
		rubberBandSize.value = { x: 0, y: 0 };
		rubberBandAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		if (!isActive.value) {
			return;
		}

		const worldPos = clientToCanvas(evt.clientX, evt.clientY);

		const dx = worldPos.x - rubberBandStart.value.x;
		const dy = worldPos.y - rubberBandStart.value.y;
		rubberBandSize.value = {
			x: rubberBandAngleCos.value * dx + rubberBandAngleSin.value * dy,
			y: -rubberBandAngleSin.value * dx + rubberBandAngleCos.value * dy,
		};
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
		stroke-width: 0;
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
