<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read, update  } from "../../svatom.svelte.js";

	const {children, cameraScale, selectionExtension, rotationTransform, clientToCanvas, translateSelected, scaleSelected, frameBoxPath} = $props()


	const rotationCursor = window.URL.createObjectURL(
		new Blob(
			[
				`<?xml version="1.0" encoding="utf-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24.053,17.582c0.312,-1.654 0.057,-3.422 -0.85,-4.993c-2.012,-3.484 -6.474,-4.68 -9.958,-2.668c-3.484,2.012 -4.68,6.474 -2.668,9.958c0.009,0.017 0.019,0.034 0.029,0.05l-1.099,0.635c-2.353,-4.075 -0.955,-9.293 3.12,-11.646c4.075,-2.352 9.293,-0.954 11.646,3.121c1.051,1.82 1.353,3.868 1.003,5.788l3.926,0.354l-6.285,4.707l-2.843,-6.587l3.979,1.281Z" fill="white" stroke="black" paint-order="stroke" stroke-width="2px"/>
</svg>`,
			],
			{ type: "image/svg+xml" },
		),
	);

	const cameraScaleValue = $derived(cameraScale.value)
	const padding = $derived(cameraScaleValue * 4)
	const selectionExtensionValue = $derived(selectionExtension.value)

	const handles = [
		{wx: -1, wy:-1, cursor: 'nw-resize',r:5, rx: 0, ry:0},
		{wx: -1, wy:1, cursor: 'ne-resize',r:5, rx: 0, ry:0},
		{wx: 1, wy:1, cursor: 'se-resize',r:5, rx: 0, ry:0},
		{wx: 1, wy:-1, cursor: 'sw-resize',r:5, rx: 0, ry:0},


		{wx: -1, wy:0, cursor: 'w-resize',r:3, ry: 1, rx: 0},
		{wx: 0, wy:1, cursor: 's-resize',r:3, rx: 1, ry: 0},
		{wx: 0, wy:-1, cursor: 'n-resize',r:3, rx: 1, ry: 0},
		{wx: 1, wy:0, cursor: 'e-resize',r:3, ry: 1, rx: 0},
	]

	const transformation = atom({});
	const activeGrab = view([L.removable('grab'), 'grab'], transformation);
	const activeHandle = view(['handle'], transformation);
	const activePivot = view(['pivot'], transformation);
	const translationAccum = view(['translationAccum', L.defaults({x:0,y:0})], transformation);
	const scaleAccum = view(['scaleAccum', L.defaults({x:1,y:1})], transformation);
	const moved = view(['moved', L.defaults(false)], transformation);
	const offset = view(['offset', L.defaults({x:0,y:0})], transformation);

	const isGrabbing = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		activeGrab,
	);

	let preventNextClick = $state(false)
</script>

{#if selectionExtensionValue !== null}
<g pointer-events="all"
tabindex="-1"
role="button"
onpointerdown={evt => {
	if (!evt.isPrimary || !U.isLeftButton(evt, true)) {
		return;
	}

	const handle = evt.target.getAttribute('data-handle')
	const translate = evt.target.getAttribute('data-translate')
	const pivot = evt.target.hasAttribute('data-resize-pivot') ? JSON.parse(evt.target.getAttribute('data-resize-pivot')) : null

	if(handle || translate) {
		evt.currentTarget.setPointerCapture(evt.pointerId);
		activeGrab.value = clientToCanvas(evt.clientX, evt.clientY)

		activeHandle.value = pivot ? {wx: pivot.wx, wy: pivot.wy} : null
		activePivot.value = pivot

		const worldPos = clientToCanvas(evt.clientX, evt.clientY)
		if(pivot) {
			offset.value = {x: worldPos.x - (pivot.cx||0),y: worldPos.y - (pivot.cy||0)}
		}
	} 
}}
onpointermove={evt => {
	if (!evt.isPrimary) {
			return;
		}
		if (!isGrabbing.value) {
			return;
		}

		const newPos = clientToCanvas(evt.clientX, evt.clientY)
		
		if(translateSelected && !activePivot.value) {
			const dx = newPos.x - offset.value.x - activeGrab.value.x
			const dy = newPos.y - offset.value.y - activeGrab.value.y
			translateSelected({dx, dy}, moved.value)
			update(({x,y}) => ({x:x+dx, y:y+dy}), translationAccum)
		} else if(scaleSelected && activePivot.value) {

			//TODO fix calculating to be more precise
			const dxNew = (newPos.x - offset.value.x - activePivot.value.x)
			const dyNew = (newPos.y - offset.value.y - activePivot.value.y)
			const dxOld = (activeGrab.value.x - offset.value.x - activePivot.value.x)
			const dyOld = (activeGrab.value.y - offset.value.y - activePivot.value.y)
			const fx = U.lerp(dxOld?dxNew/dxOld:0, 1, activePivot.value.rx)
			const fy = U.lerp(dyOld?dyNew/dyOld:0, 1, activePivot.value.ry)
			scaleSelected({x: fx, y:  fy}, activePivot.value, moved.value)
			update(({x,y}) => ({x:x*fx, y:y*fy}), scaleAccum)
		}
		

		activeGrab.value = newPos
		moved.value = true

}}
onpointerup={evt => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isGrabbing.value) {
			return;
		}

		isGrabbing.value = false
		preventNextClick = true
}}
onpointercancel={evt => {
	isGrabbing.value = false;
}}
onclick={evt => {
	if(preventNextClick) {
		preventNextClick = false
		evt.preventDefault()
	}
}}
oncontextmenu={(evt) => {
	evt.preventDefault();
	isGrabbing.value = false;
}}
onkeydown={evt => {
	if (evt.key === "Escape" || evt.key === "Esc") {
		if (isGrabbing.value) {
			if(translationAccum.value) {
				translateSelected({dx:-translationAccum.value.x, dy:-translationAccum.value.y})
				preventNextClick = true
			} 
			if(scaleAccum.value && activePivot.value) {
				scaleSelected({x: 1/scaleAccum.value.x, y:1/scaleAccum.value.y}, activePivot.value)
				preventNextClick = true
			}
			evt.stopPropagation();
		}
		isGrabbing.value = false;
	}
}}
>

<path onpointerdown={evt => {evt.stopPropagation()}} tabindex="-1" role="button"  d={frameBoxPath.value} fill="none" pointer-events="all" />
<g
	transform={rotationTransform.value}
>
<line x1={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} y1={selectionExtensionValue.minY-padding} x2={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} y2="{selectionExtensionValue.minY-padding - 40*Math.min(cameraScaleValue, 2)}" stroke="RoyalBlue" vector-effect="non-scaling-stroke" />

<rect data-translate="true" x={selectionExtensionValue.minX-padding} y="{selectionExtensionValue.minY-padding}" width={selectionExtensionValue.maxX+padding - (selectionExtensionValue.minX-padding)} height="{(selectionExtensionValue.maxY+padding) - (selectionExtensionValue.minY-padding)}" class="box" pointer-events="all" fill="none"
tabindex="-1"
role="button"
onpointerdown={evt => {
}}
onpointermove={evt => {
}}
onpointerup={evt => {
}}
onpointercancel={evt => {
}}
onclick={evt => {
	evt.preventDefault()
}}
onkeydown={evt => { 
	evt.preventDefault()
}}

/>


{#each handles as handle,i (i)}
{@const cx = U.lerp((selectionExtensionValue.minX), (selectionExtensionValue.maxX), (handle.wx+1)/2)}
{@const cy = U.lerp((selectionExtensionValue.minY), (selectionExtensionValue.maxY), (handle.wy+1)/2)}
{@const cxpadded = U.lerp((selectionExtensionValue.minX-padding), (selectionExtensionValue.maxX+padding), (handle.wx+1)/2)}
{@const cypadded = U.lerp((selectionExtensionValue.minY-padding), (selectionExtensionValue.maxY+padding), (handle.wy+1)/2)}
{@const px = U.lerp((selectionExtensionValue.minX), (selectionExtensionValue.maxX), 1-(handle.wx+1)/2)}
{@const py = U.lerp((selectionExtensionValue.minY), (selectionExtensionValue.maxY), 1-(handle.wy+1)/2)}
<g class:active={activeHandle.value && activeHandle.value.wx === handle.wx * Math.sign(scaleAccum.value.x) && activeHandle.value.wy == handle.wy * Math.sign(scaleAccum.value.y)}>	
	<circle data-handle={i} data-resize-pivot={`{"x": ${px}, "y": ${py}, "rx": ${handle.rx}, "ry":${handle.ry}, "cx": ${cx}, "cy": ${cy}, "wx": ${handle.wx}, "wy": ${handle.wy}}`} cx={cxpadded} cy={cypadded} r="{handle.r * cameraScaleValue}" class="handle-background" cursor={handle.cursor}  />
	<circle data-handle={i} data-resize-pivot={`{"x": ${px}, "y": ${py}, "rx": ${handle.rx}, "ry":${handle.ry}, "cx": ${cx}, "cy": ${cy}, "wx": ${handle.wx}, "wy": ${handle.wy}}`} cx={cxpadded} cy={cypadded} r="{handle.r * cameraScaleValue}" class="handle" cursor={handle.cursor}  />
</g>
{/each}
<g style:--cursor-url="url({rotationCursor})" class="rotator-handle">
	<circle cx={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} cy="{selectionExtensionValue.minY-padding - 40*Math.min(cameraScaleValue, 2)}" r="{5 *cameraScaleValue}" pointer-events="all" class="handle-background" />
	<circle cx={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} cy="{selectionExtensionValue.minY-padding - 40*Math.min(cameraScaleValue, 2)}" r="{5 *cameraScaleValue}" pointer-events="all" class="handle"  />
</g>
</g>



</g>
{/if}

{@render children()}

<style>
	.box {
		stroke: RoyalBlue;
		fill-opacity: 0.1; 
		fill: DodgerBlue; 
		cursor: move; 
		pointer-events: all; 
		stroke-width: 1px; 
		vector-effect: non-scaling-stroke;
		outline: none;

		-webkit-touch-callout: none;
		-webkit-user-callout: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-modify: none;
		-webkit-highlight: none;
		user-select: none;
	}

	.handle {
		fill: white; 
		stroke: RoyalBlue;
		pointer-events: all; 
		stroke-width: 1px; 
		vector-effect: non-scaling-stroke;
		outline: none;

		-webkit-touch-callout: none;
		-webkit-user-callout: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-modify: none;
		-webkit-highlight: none;
		user-select: none;
	}

	.rotator-handle {
		cursor: var(--cursor-url)  16 16, auto;
	}

	.handle-background {
		pointer-events: all;
		stroke: transparent;
		stroke-width: 0.5em;
		vector-effect: non-scaling-stroke;
	}

	g:hover > .handle {
		stroke-width: 3px;
	}
	g.active > .handle {
		stroke-width: 3px;
		fill: RoyalBlue;
	}
</style>