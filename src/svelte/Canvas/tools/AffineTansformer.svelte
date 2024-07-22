<script>
	import * as U from '../../utils'

	const {children, cameraScale, selectionExtension, rotationTransform} = $props()


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
		{wx: 0, wy:0, cursor: 'nw-resize',r:5},
		{wx: 0, wy:1, cursor: 'nw-resize',r:5},
		{wx: 1, wy:1, cursor: 'nw-resize',r:5},
		{wx: 1, wy:0, cursor: 'nw-resize',r:5},


		{wx: 0, wy:0.5, cursor: 'nw-resize',r:3},
		{wx: 0.5, wy:1, cursor: 'nw-resize',r:3},
		{wx: 0.5, wy:0, cursor: 'nw-resize',r:3},
		{wx: 1, wy:0.5, cursor: 'nw-resize',r:3},
	]
</script>
<g
	transform={rotationTransform.value}
>
{#if selectionExtensionValue !== null}
<g pointer-events="all"
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
onkeypress={evt => {
	evt.preventDefault()
}}
>
<line x1={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} y1={selectionExtensionValue.minY-padding} x2={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} y2="{selectionExtensionValue.minY-padding - 40*Math.min(cameraScaleValue, 2)}" stroke="RoyalBlue" vector-effect="non-scaling-stroke" />

<rect x={selectionExtensionValue.minX-padding} y="{selectionExtensionValue.minY-padding}" width={selectionExtensionValue.maxX+padding - (selectionExtensionValue.minX-padding)} height="{(selectionExtensionValue.maxY+padding) - (selectionExtensionValue.minY-padding)}" class="box" pointer-events="all" fill="none"
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
onkeypress={evt => {
	evt.preventDefault()
}}

/>


{#each handles as handle,i (i)}
{@const cx = U.lerp((selectionExtensionValue.minX-padding), (selectionExtensionValue.maxX+padding), handle.wx)}
{@const cy = U.lerp((selectionExtensionValue.minY-padding), (selectionExtensionValue.maxY+padding), handle.wy)}
<g>	
	
	<circle cx={cx} cy={cy} r="{handle.r * cameraScaleValue}" class="handle-background" cursor={handle.cursor}  />
	<circle cx={cx} cy={cy} r="{handle.r * cameraScaleValue}" class="handle" cursor={handle.cursor}  />
</g>
{/each}
</g>

<g style:--cursor-url="url({rotationCursor})" class="rotator-handle">
	<circle cx={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} cy="{selectionExtensionValue.minY-padding - 40*Math.min(cameraScaleValue, 2)}" r="{5 *cameraScaleValue}" pointer-events="all" class="handle-background" />
	<circle cx={(selectionExtensionValue.minX-padding + selectionExtensionValue.maxX+padding)/2} cy="{selectionExtensionValue.minY-padding - 40*Math.min(cameraScaleValue, 2)}" r="{5 *cameraScaleValue}" pointer-events="all" class="handle"  />
</g>
{/if}

</g>

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
	}

	.handle {
		fill: white; 
		stroke: RoyalBlue;
		pointer-events: all; 
		stroke-width: 1px; 
		vector-effect: non-scaling-stroke;
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
	g:active > .handle {
		stroke-width: 3px;
		fill: RoyalBlue;
	}
</style>