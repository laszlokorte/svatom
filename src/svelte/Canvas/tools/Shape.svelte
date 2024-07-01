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
		newShape,
	} = $props();

	const template = atom({
		box: "-35 -50 60 100",
		paths: [
			{ fill: "coral", path: "M-35,-50h60v20h-40v20h20v20h-20v40h-20z" },
		],
	});
	const shape = atom(undefined);

	const pointerId = view([L.removable("pointerId"), "pointerId"], shape);

	const shapeBasis = view([L.removable("basis"), "basis"], shape);

	const shapeStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		shapeBasis,
	);
	const shapeSize = view(
		L.ifElse(
			R.prop("start"),
			[
				L.removable("size"),
				"size",
				L.removable("x", "y"),
				L.pick({
					x: ["x", L.normalize(R.max(15))],
					y: ["y", L.normalize(R.max(15))],
				}),
			],
			L.zero,
		),
		shapeBasis,
	);
	const shapeAngle = view(
		[L.removable("angle"), "angle" /*L.normalize(R.always(0))*/],
		shapeBasis,
	);
	const shapeAngleCos = view(
		[L.reread((r) => Math.cos((r / 180) * Math.PI))],
		shapeAngle,
	);
	const shapeAngleSin = view(
		[L.reread((r) => Math.sin((r / 180) * Math.PI))],
		shapeAngle,
	);

	const shapePath = read(
		L.getter(({ shapeBasis: b, cameraScale: scale }) =>
			b && b.start && b.size
				? `M${numberSvgFormat.format(b.start.x - 10 * scale * Math.sign(b.size.x))},${numberSvgFormat.format(b.start.y)}h${numberSvgFormat.format(b.size.x)}
				m${Math.sign(b.size.x) * (10 * scale)},0l${Math.sign(b.size.x) * (-10 * scale)},${-10 * scale}v${2 * 10 * scale}l${Math.sign(b.size.x) * (10 * scale)},${-10 * scale}
				M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y - 10 * scale * Math.sign(b.size.y))}v${numberSvgFormat.format(b.size.y)}
				m0,${Math.sign(b.size.y) * (10 * scale)}l${-10 * scale},${Math.sign(b.size.y) * (-10 * scale)}h${2 * 10 * scale}l${-10 * scale},${Math.sign(b.size.y) * (10 * scale)}
				`
				: "",
		),
		combine({ shapeBasis, cameraScale }),
	);
</script>

<path
	use:disableTouchEventsIf={shapeStart}
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="shape-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			pointerId.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (shapeStart.value) {
			return;
		}
		if (!(evt.isPrimary && U.isLeftButton(evt))) {
			return;
		}

		pointerId.value = evt.pointerId;

		evt.currentTarget.setPointerCapture(evt.pointerId);
		const svgP = clientToCanvas(evt.clientX, evt.clientY);
		shapeStart.value = { x: svgP.x, y: svgP.y };
		shapeSize.value = { x: 0, y: 0 };
		shapeAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			const dx = svgP.x - shapeStart.value.x;
			const dy = svgP.y - shapeStart.value.y;
			shapeSize.value = {
				x: shapeAngleCos.value * dx + shapeAngleSin.value * dy,
				y: -shapeAngleSin.value * dx + shapeAngleCos.value * dy,
			};
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId && newShape) {
			newShape.value = {
				placement: shapeBasis.value,
				content: template.value,
			};
		}
		shapeSize.value = undefined;
	}}
	onpointercancel={(evt) => {
		if (pointerId.value === evt.pointerId) {
			shapeSize.value = undefined;
		}
	}}
/>

<g pointer-events="none" transform={rotationTransform.value}>
	{#if shape.value}
		<rect
			x={shapeStart.value.x + Math.min(0, shapeSize.value.x)}
			y={shapeStart.value.y + Math.min(0, shapeSize.value.y)}
			width={Math.abs(shapeSize.value.x)}
			height={Math.abs(shapeSize.value.y)}
			transform="rotate({shapeAngle.value}, {shapeStart.value
				.x}, {shapeStart.value.y})"
			fill="none"
			class="shape"
			pointer-events="none"
		/>
		<g
			transform="rotate({shapeAngle.value}, {shapeStart.value
				.x}, {shapeStart.value.y})"
		>
			<svg
				x={shapeStart.value.x + Math.min(0, shapeSize.value.x)}
				y={shapeStart.value.y + Math.min(0, shapeSize.value.y)}
				width={Math.abs(shapeSize.value.x)}
				height={Math.abs(shapeSize.value.y)}
				viewBox={template.value.box}
				preserveAspectRatio="xMidYMid meet"
			>
				<g
					transform=" scale({Math.sign(
						shapeSize.value.x,
					)}, {Math.sign(shapeSize.value.y)})"
				>
					{#each template.value.paths as p, i (i)}
						<path d={p.path} fill={p.fill} />
					{/each}
				</g>
			</svg></g
		>
	{/if}
</g>

<style>
	.shape-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.shape {
		fill: none;
		stroke: darkgray;
		fill: lightgray;
		fill-opacity: 0.1;
		stroke-opacity: 0.7;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}
</style>
