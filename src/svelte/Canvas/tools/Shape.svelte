<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

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
		createShape,
	} = $props();

	const minSize = 15;

	const template = atom({
		box: "-30 -50 60 100",
		paths: [
			{ fill: "coral", path: "M-30,-50h60v20h-40v20h20v20h-20v40h-20z" },
		],
	});
	const shape = atom(undefined);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		shape,
	);

	const shapeStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		shape,
	);
	const shapeSize = view(
		L.ifElse(
			R.prop("start"),
			[
				L.removable("size"),
				"size",
				L.removable("x", "y"),
				L.pick({
					x: ["x", L.normalize(R.max(minSize))],
					y: ["y", L.normalize(R.max(minSize))],
				}),
			],
			L.zero,
		),
		shape,
	);
	const shapeAngle = view(
		[L.removable("angle"), "angle" /*L.normalize(R.always(0))*/],
		shape,
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
		L.getter(({ shape: b, cameraScale: scale }) =>
			b && b.start && b.size
				? `M${numberSvgFormat.format(b.start.x - 10 * scale * Math.sign(b.size.x))},${numberSvgFormat.format(b.start.y)}h${numberSvgFormat.format(b.size.x)}
				m${Math.sign(b.size.x) * (10 * scale)},0l${Math.sign(b.size.x) * (-10 * scale)},${-10 * scale}v${2 * 10 * scale}l${Math.sign(b.size.x) * (10 * scale)},${-10 * scale}
				M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y - 10 * scale * Math.sign(b.size.y))}v${numberSvgFormat.format(b.size.y)}
				m0,${Math.sign(b.size.y) * (10 * scale)}l${-10 * scale},${Math.sign(b.size.y) * (-10 * scale)}h${2 * 10 * scale}l${-10 * scale},${Math.sign(b.size.y) * (10 * scale)}
				`
				: "",
		),
		combine({ shape, cameraScale }),
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
	class="shape-surface"
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
		shapeStart.value = clientToCanvas(
			evt.clientX - minSize / 2 / cameraScale.value,
			evt.clientY - minSize / 2 / cameraScale.value,
		);
		shapeSize.value = { x: 0, y: 0 };
		shapeAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		const worldPos = clientToCanvas(evt.clientX, evt.clientY);

		const dx = worldPos.x - shapeStart.value.x;
		const dy = worldPos.y - shapeStart.value.y;
		shapeSize.value = {
			x: shapeAngleCos.value * dx + shapeAngleSin.value * dy,
			y: -shapeAngleSin.value * dx + shapeAngleCos.value * dy,
		};
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		if (createShape) {
			createShape({
				placement: shape.value,
				content: template.value,
			});
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
