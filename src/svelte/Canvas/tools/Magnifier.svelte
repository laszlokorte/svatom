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
	const {frame, frameBoxPath, zoomDelta, zoomFrame} = $props();
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

	const rubberBandStretched = read([L.valueOr({}), L.getter(({start, end}) => {
			return (start && end && start.x !== end.x && start.y !== end.y) ? true : false
		})], rubberBand)

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
	class="magnifier-surface"
	class:magnifier-surface-active={rubberBandStretched.value}
	bind:this={gEl.value}
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if((evt.key === "Escape" || evt.key === "Esc")) {
			rubberBandEnd.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if(!U.isLeftButton(evt)) {
			return
		}
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

			if(zoomDelta && !rubberBandStretched.value) {
				zoomDelta.value = {dz: evt.altKey ? -.5:.5, px: svgP.x, py: svgP.y }
			} else if (zoomFrame) {
				zoomFrame.value = {
					start: rubberBandStart.value,
					end: rubberBandEnd.value,
				}
			}


			rubberBandEnd.value = undefined;
		} else if(zoomDelta) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			zoomDelta.value = {dz: (evt.altKey || evt.shiftKey) ? -.5:.5, px: svgP.x, py: svgP.y }
		}
	}}>

	{@render frame()}
</g>

{#if rubberBandStretched.value}
<path
	d={frameBoxPath +' '+ rubberBandPath.value}
	class="rubber-band"
	pointer-events="none"
/>
{/if}

<style>

	.magnifier-surface {
		cursor: zoom-in;
	}

	.magnifier-surface-active {
		cursor: crosshair;
	}

	.rubber-band {
		fill: #fff;
		stroke: #aaa;
		fill-opacity: 0.5;
		fill-rule: evenodd;
		stroke-width: 1px;
		shape-rendering: crispEdges;
		vector-effect: non-scaling-stroke;
	}


</style>