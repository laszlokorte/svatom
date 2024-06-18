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

	const newGuideRayPath = read(L.reread(({angle, dist, frame}) => {
		const cx = frame.minX + frame.width / 2
		const cy = frame.minY + frame.height / 2
		const len = Math.sqrt(frame.width*frame.width + frame.height*frame.height) 

		const supX = Math.cos(angle + Math.PI / 2) * dist
		const supY = Math.sin(angle + Math.PI / 2) * dist
		const dirX = Math.cos(angle)
		const dirY = Math.sin(angle)
		
		const sides = [
			//TOP
			[frame.minX, frame.minY, frame.minX+frame.width, frame.minY],
			//LEFT
			[frame.minX, frame.minY, frame.minX, frame.minY+frame.height],
			//BOTTOM
			[frame.minX, frame.minY+frame.height, frame.minX+frame.width, frame.minY+frame.height],
			// RIGHT
			[frame.minX+frame.width, frame.minY, frame.minX+frame.width, frame.minY+frame.height],
		]

		const intersectionA = R.compose(R.head, R.filter(R.identity), R.map((s) => RayToLineSegment(supX, supY, dirX, dirY, ...s)))(sides)
		const intersectionB = R.compose(R.head, R.filter(R.identity), R.map((s) => RayToLineSegment(supX, supY, -dirX, -dirY, ...s)))(sides)

		return `M${intersectionA.x},${intersectionA.y}L${intersectionB.x},${intersectionB.y}`
	}), combine({
		angle: guideAngle,
		dist: guideDistance,
		frame: frameBoxObject,
	}))

	function RayToLineSegment(x, y, dx, dy, x1, y1, x2, y2)
	{
	    let r, s;
        const d = ((dx * (y2 - y1)) - dy * (x2 - x1));
        if (d != 0)
        {
            r = (((y - y1) * (x2 - x1)) - (x - x1) * (y2 - y1)) / d;
            s = (((y - y1) * dx) - (x - x1) * dy) / d;
            if (r >= 0 && s >= 0 && s <= 1)
            {
                return { x: x + r * dx, y: y + r * dy };
            }
        }
	    return null;
	}
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