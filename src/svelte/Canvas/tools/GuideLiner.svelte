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

	const minDragDistance = 25
	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});


	const {frame, rotationTransform, newGuide, frameBoxObject, cameraScale} = $props();
	const rootEl = atom(null);
	const svgPoint = $derived(rootEl.value ? rootEl.value.ownerSVGElement.createSVGPoint() : null);

	const guide = atom(undefined);
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

	const guideAngle = view([L.props('start', 'end'), L.reread(({start, end}) => {
			const dx = end.x-start.x
			const dy = end.y-start.y
	
			return Math.atan2(dy, dx)
		})], guide)

	const guideDistance = view([L.props('start', 'end'), L.reread(({start, end}) => {
			const dx = end.x-start.x
			const dy = end.y-start.y
	
			return (start.x * -dy + start.y * dx) / Math.sqrt(dx*dx+dy*dy)
		})], guide)

	const guideLength = read([L.props('start', 'end'), L.reread(({start, end}) => {
		const dx = end.x-start.x
		const dy = end.y-start.y

		return Math.sqrt(dx*dx+dy*dy)
	})], guide)

	const newGuideValid = read([L.reread(g => {
		return g > minDragDistance
	}), L.valueOr(false)], guideLength)

	const guidePath = read(
		L.getter((b) =>
			b && b.start && b.end
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}L${numberSvgFormat.format(b.end.x)},${numberSvgFormat.format(b.end.y)}`
				: "",
		),
		guide,
	);
</script>

<g
	class="rubber-band-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if((evt.key === "Escape" || evt.key === "Esc")) {
			guideEnd.value = undefined;
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
		guideStart.value = { x: svgP.x, y: svgP.y };
		guideEnd.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (guideStart.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			guideEnd.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (guideStart.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);
			if(newGuideValid.value) {
				newGuide.value = {
					angle: guideAngle.value,
					distance: guideDistance.value,
				}
			}
			guideEnd.value = undefined;
		}
	}}>

	{@render frame()}
</g>

<g pointer-events="none" transform={rotationTransform.value} bind:this={rootEl.value}>

	{#if newGuideValid.value}
	<path
			fill="none"
			stroke="black"
			d={`M${Math.cos(guideAngle.value + Math.PI / 2) * guideDistance.value}, ${Math.sin(guideAngle.value + Math.PI / 2) * guideDistance.value} m ${Math.cos(guideAngle.value) * 2500}, ${Math.sin(guideAngle.value) * 2500} l ${Math.cos(guideAngle.value) * -5000}, ${Math.sin(guideAngle.value) * -5000}`}
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

	.rubber-band-surface {
		cursor: default;
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
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
	}

	.guide-handle.valid {
		stroke: cyan;
	}

	
</style>