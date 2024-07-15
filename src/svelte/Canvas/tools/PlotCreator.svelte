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
		newPlot,
	} = $props();

	let seqNumber = 0;

	const examplesFns = [
		{
			fn: ["x", "Math.cos(x * Math.PI * 2)"],
			poles: [],
		},
		{
			fn: ["x", "Math.sin(x * Math.PI * 2)"],
			poles: [],
		},
		{
			fn: ["x", "Math.pow(x * Math.PI * 2, 2)"],
			poles: [],
		},
		{
			fn: ["x", "Math.pow(x * Math.PI * 2, 3)"],
			poles: [],
		},
		{
			fn: ["x", "Math.exp(x * Math.PI * 2)"],
			poles: [],
		},
		{
			fn: ["x", "Math.log(x * Math.PI * 2)"],
			poles: [0],
		},
		{
			fn: ["x", "1/(x * Math.PI * 2)"],
			poles: [0],
		},
	];

	const plot = atom(undefined);

	const plotStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		plot,
	);
	const plotSize = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("size"), "size", L.removable("x", "y")],
			L.zero,
		),
		plot,
	);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		plot,
	);

	const plotAngle = view([L.removable("angle"), "angle"], plot);
	const plotAngleCos = view(
		[L.reread((r) => Math.cos((r / 180) * Math.PI))],
		plotAngle,
	);
	const plotAngleSin = view(
		[L.reread((r) => Math.sin((r / 180) * Math.PI))],
		plotAngle,
	);

	const plotPath = read(
		L.getter(({ plot: b, cameraScale: scale }) =>
			b && b.start && b.size
				? U.formattedNumbers`M${b.start.x - 10 * scale * Math.sign(b.size.x)},${b.start.y}h${b.size.x}
				m${Math.sign(b.size.x) * (10 * scale)},0l${Math.sign(b.size.x) * (-10 * scale)},${-10 * scale}v${2 * 10 * scale}l${Math.sign(b.size.x) * (10 * scale)},${-10 * scale}
				M${b.start.x},${b.start.y - 10 * scale * Math.sign(b.size.y)}v${b.size.y}
				m0,${Math.sign(b.size.y) * (10 * scale)}l${-10 * scale},${Math.sign(b.size.y) * (-10 * scale)}h${2 * 10 * scale}l${-10 * scale},${Math.sign(b.size.y) * (10 * scale)}
				`
				: "",
		),
		combine({ plot, cameraScale }),
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
	class="plot-surface"
	role="button"
	tabindex="-1"
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
		plotStart.value = clientToCanvas(evt.clientX, evt.clientY);
		plotSize.value = { x: 0, y: 0 };
		plotAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		const worldPos = clientToCanvas(evt.clientX, evt.clientY);

		const dx = worldPos.x - plotStart.value.x;
		const dy = worldPos.y - plotStart.value.y;
		plotSize.value = {
			x: plotAngleCos.value * dx + plotAngleSin.value * dy,
			y: -plotAngleSin.value * dx + plotAngleCos.value * dy,
		};
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}
		if (plotSize.value.x != 0 && plotSize.value.y != 0) {
			newPlot.value = {
				...plot.value,
				...examplesFns[seqNumber % examplesFns.length],
				color: `hsl(${180 + ((seqNumber * 1.6180339887499) % 1) * 360}, 40%, 60%)`,
			};
			seqNumber++;
			isActive.value = false;
		}
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
	{#if plot.value}
		<path
			d={plotPath.value}
			transform="rotate({plotAngle.value}, {plotStart.value.x}, {plotStart
				.value.y})"
			fill="none"
			class="plot"
			pointer-events="none"
		/>
	{/if}
</g>

<style>
	.plot-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.plot {
		fill: none;
		stroke: magenta;
		fill: magenta;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		shape-rendering: crispedges;
	}
</style>
