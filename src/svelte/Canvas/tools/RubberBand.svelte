<script>
	import * as L from "partial.lenses";
	import * as G from "../../generators";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
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
	const {frame} = $props();
	const rootEl = atom(null);
	const gEl = view(L.setter((g) => g.ownerSVGElement), rootEl);
	const svgPoint = $derived(rootEl.value ? rootEl.value.createSVGPoint() : null);

	const rubberBand = atom(undefined);
	const rubberBandStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		rubberBand,
	);
	const rubberBandEnd = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("end"), "end", L.removable("x", "y")],
			L.zero,
		),
		rubberBand,
	);

	const rubberBandPath = read(
		L.getter((b) =>
			b && b.start && b.end
				? `M${b.start.x},${b.start.y}H${b.end.x}V${b.end.y}M${b.start.x},${b.start.y}V${b.end.y}H${b.end.x}`
				: "",
		),
		rubberBand,
	);
</script>

<g
	bind:this={gEl.value}
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		rubberBandEnd.value = undefined;
	}}
	onpointerdown={(evt) => {
		evt.currentTarget.setPointerCapture(evt.pointerId);
		const pt = svgPoint;
		pt.x = evt.clientX;
		pt.y = evt.clientY;
		const svgP = pt.matrixTransform(
			rootEl.value.getScreenCTM().inverse(),
		);
		rubberBandStart.value = { x: svgP.x, y: svgP.y };
		rubberBandEnd.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (rubberBandStart.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			rubberBandEnd.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (rubberBandStart.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			rubberBandEnd.value = undefined;
		}
	}}>

	{@render frame()}
</g>

<path
	d={rubberBandPath.value}
	class="rubber-band"
	pointer-events="none"
/>

<style>

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