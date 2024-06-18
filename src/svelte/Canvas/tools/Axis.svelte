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


	const {frame} = $props();
	const rootEl = atom(null);
	const gEl = view(L.setter((g) => g.ownerSVGElement), rootEl);
	const svgPoint = $derived(rootEl.value ? rootEl.value.createSVGPoint() : null);

	const axis = atom(undefined);
	const axisStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		axis,
	);
	const axisEnd = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("end"), "end", L.removable("x", "y")],
			L.zero,
		),
		axis,
	);

	const axisPath = read(
		L.getter((b) =>
			b && b.start && b.end
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}H${numberSvgFormat.format(b.end.x)}
				m${Math.sign(b.end.x-b.start.x)*(10)},0l${Math.sign(b.end.x-b.start.x)*(-10)},-10v20l${Math.sign(b.end.x-b.start.x)*(10)},-10
				M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}V${numberSvgFormat.format(b.end.y)}
				m0,${Math.sign(b.end.y-b.start.y)*(10)}l-10,${Math.sign(b.end.y-b.start.y)*(-10)}h20l-10,${Math.sign(b.end.y-b.start.y)*(10)}
				`
				: "",
		),
		axis,
	);
</script>

<g
	class="axis-surface"
	bind:this={gEl.value}
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if((evt.key === "Escape" || evt.key === "Esc")) {
			axisEnd.value = undefined;
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
		axisStart.value = { x: svgP.x, y: svgP.y };
		axisEnd.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (axisStart.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			axisEnd.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (axisStart.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			axisEnd.value = undefined;
		}
	}}>

	{@render frame()}
</g>

<path
	d={axisPath.value}
	fill="none"
	class="axis"
	pointer-events="none"
/>

<style>

	.axis-surface {
		cursor: default;
	}

	.axis {
		fill: none;
		stroke: magenta;
		fill: magenta;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	
</style>