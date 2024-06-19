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


	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});


	const {frame, rotationTransform, rotationTransformFunction, cameraOrientation, zoomDelta, zoomFrame, frameBoxPath } = $props();
	const rootEl = atom(null);
	const svgPoint = $derived(rootEl.value ? rootEl.value.ownerSVGElement.createSVGPoint() : null);

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


	const rubberBandAngle = view(
		[L.removable("angle"), "angle", L.valueOr(0)],
		rubberBand,
	);
	const rubberBandAngleCos = view(
		[L.reread(r => Math.cos(r/180*Math.PI))],
		rubberBandAngle,
	);
	const rubberBandAngleSin = view(
		[L.reread(r => Math.sin(r/180*Math.PI))],
		rubberBandAngle,
	);

	const rubberBandPath = read(
		L.reread(({b, cos, sin, t}) => {
			if(b && b.start && b.size) {
				const h = cos * b.size.x - sin * b.size.y
				const v = sin * b.size.x + cos * b.size.y

				const A = L.get(['start', t], b)
				const B = L.get(t, {x: b.start.x + h*cos, y: b.start.y + sin*h}) // h
				const C = L.get(t, {x: b.start.x + h*cos + v * sin, y: b.start.y + sin*h - v*cos,}) //h v
				const D = L.get(t, {x: b.start.x + v*-sin, y: b.start.y + v*cos,}) // v

				return `M${numberSvgFormat.format(A.x)},${numberSvgFormat.format(A.y)}
				L${numberSvgFormat.format(B.x)},${numberSvgFormat.format(B.y)}
				L${numberSvgFormat.format(C.x)},${numberSvgFormat.format(C.y)}
				L${numberSvgFormat.format(D.x)},${numberSvgFormat.format(D.y)}z`
			} else {
				return ""
			}
		}
		),
		combine({b: rubberBand, sin:rubberBandAngleSin, cos:rubberBandAngleCos, t: rotationTransformFunction}),
	);

	const rubberBandTransform = read(L.reread(r => ``), rubberBand)

	const rubberBandStretched = read([L.valueOr({}), L.getter(({start, size}) => {
			return (start && size && 0 !== size.x && 0 !== size.y) ? true : false
		})], rubberBand)
</script>

<g
	class="magnifier-surface"
	class:magnifier-surface-active={rubberBandStretched.value}
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if((evt.key === "Escape" || evt.key === "Esc")) {
			rubberBandStart.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if(!U.isLeftButton(evt, true)) {
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
		rubberBandSize.value = { x: 0, y: 0 };
		rubberBandAngle.value = -cameraOrientation.value
	}}
	onpointermove={(evt) => {
		if (rubberBandStart.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);


			const dx = svgP.x - rubberBandStart.value.x
			const dy = svgP.y - rubberBandStart.value.y
			rubberBandSize.value = { x: rubberBandAngleCos.value * dx + rubberBandAngleSin.value * dy, y: -rubberBandAngleSin.value * dx + rubberBandAngleCos.value * dy};
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
					size: rubberBandSize.value,
					angle: rubberBandAngle.value
				}
			}


			rubberBandSize.value = undefined;
		}
	}}>

	{@render frame()}
</g>

<g pointer-events="none" transform={rotationTransform.value} bind:this={rootEl.value}></g>

{#if rubberBandStretched.value}
<path
	transform="{rubberBandTransform.value}"
	d={frameBoxPath.value +' '+ rubberBandPath.value}
	fill="none"
	class="magnifier"
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

	.magnifier {
		fill: #aaa;
		stroke: #aaa;
		fill-opacity: 0.5;
		fill-rule: evenodd;
		stroke-width: 1px;
		shape-rendering: crispEdges;
		vector-effect: non-scaling-stroke;
	}


</style>