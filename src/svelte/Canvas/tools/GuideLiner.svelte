<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import {
		atom,
		view,
		read,
		combine,
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

	const minDragDistance = 25;
	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const {
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		newGuide,
		frameBoxObject,
		cameraScale,
	} = $props();

	const guide = atom(undefined);
	const pointerId = view([L.removable("pointerId"), "pointerId"], guide);

	const guideStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		guide,
	);
	const guideEnd = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("end"), "end", L.removable("x", "y")],
			L.zero,
		),
		guide,
	);

	const guideAngle = view(
		[
			L.props("start", "end"),
			L.reread(({ start, end }) => {
				const dx = end.x - start.x;
				const dy = end.y - start.y;

				return Math.atan2(dy, dx);
			}),
		],
		guide,
	);

	const guideDistance = view(
		[
			L.props("start", "end"),
			L.reread(({ start, end }) => {
				const dx = end.x - start.x;
				const dy = end.y - start.y;

				return (
					(start.x * -dy + start.y * dx) /
					Math.sqrt(dx * dx + dy * dy)
				);
			}),
		],
		guide,
	);

	const guideLength = read(
		[
			L.props("start", "end"),
			L.reread(({ start, end }) => {
				const dx = end.x - start.x;
				const dy = end.y - start.y;

				return Math.sqrt(dx * dx + dy * dy);
			}),
		],
		guide,
	);

	const newGuideValid = read(
		[
			L.reread(({ len, scale }) => {
				return len / scale > minDragDistance;
			}),
			L.valueOr(false),
		],
		combine({ len: guideLength, scale: cameraScale }),
	);

	const guidePath = read(
		L.getter((b) =>
			b && b.start && b.end
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}L${numberSvgFormat.format(b.end.x)},${numberSvgFormat.format(b.end.y)}`
				: "",
		),
		guide,
	);

	const newGuideEdgePoints = read(
		L.reread(
			R.compose(
				R.apply(Geo.rayInsideQuad),
				R.props(["angle", "dist", "quad"]),
			),
		),
		combine({
			angle: guideAngle,
			dist: guideDistance,
			quad: read("worldSpace", frameBoxObject),
		}),
	);

	const newGuideRayPath = read(
		L.reread(({ a, b }) => `M${a.x},${a.y}L${b.x},${b.y}`),
		newGuideEdgePoints,
	);
</script>

<path
	use:disableTouchEventsIf={guideStart}
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="guideliner-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			guideEnd.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (guideStart.value) {
			return;
		}
		if (!(evt.isPrimary && U.isLeftButton(evt))) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);

		const svgP = clientToCanvas(evt.clientX, evt.clientY);

		pointerId.value = evt.pointerId;
		guideStart.value = { x: svgP.x, y: svgP.y };
		guideEnd.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			guideEnd.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);
			if (newGuideValid.value) {
				newGuide.value = {
					angle: guideAngle.value,
					distance: guideDistance.value,
				};
			}
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
	{#if newGuideValid.value}
		<path
			fill="none"
			stroke="black"
			d={newGuideRayPath.value}
			class="guide-ray"
			pointer-events="none"
		/>
	{/if}

	<path
		d={guidePath.value}
		fill="none"
		class="guide-handle"
		class:valid={newGuideValid.value}
		pointer-events="none"
	/>
</g>

<style>
	.guideliner-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.guide-ray {
		stroke: cyan;
		stroke-opacity: 0.3;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	.guide-handle {
		fill: none;
		stroke: #ff9999;
		stroke-opacity: 0.2;
		stroke-width: 4px;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
	}

	.guide-handle.valid {
		stroke: cyan;
	}
</style>
