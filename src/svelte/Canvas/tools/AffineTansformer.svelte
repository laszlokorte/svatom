<script>

	const {children, cameraScale} = $props()


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
</script>


<rect x="30" y="120" width="300" height="200" class="box" pointer-events="all" fill="none" />
<line x1="180" y1="120" x2="180" y2="{120 - 40*Math.min(cameraScaleValue, 2)}" stroke="RoyalBlue" vector-effect="non-scaling-stroke" />



<g>
	<circle cx="180" cy="120" r="{3 *cameraScaleValue}" class="handle-background" cursor="n-resize"  />
	<circle cx="180" cy="120" r="{3 *cameraScaleValue}" class="handle" cursor="n-resize"  />
</g>
<g>
	<circle cx="330" cy="220" r="{3 *cameraScaleValue}" class="handle-background" cursor="e-resize"  />
	<circle cx="330" cy="220" r="{3 *cameraScaleValue}" class="handle" cursor="e-resize"  />
</g>
<g>
	<circle cx="180" cy="320" r="{3 *cameraScaleValue}" class="handle-background" cursor="s-resize" />
	<circle cx="180" cy="320" r="{3 *cameraScaleValue}" class="handle" cursor="s-resize" />
</g>
<g>
	<circle cx="30" cy="220" r="{3 *cameraScaleValue}" class="handle-background" cursor="w-resize"   />
	<circle cx="30" cy="220" r="{3 *cameraScaleValue}" class="handle" cursor="w-resize"   />
</g>

<g>
	<circle cx="30" cy="120" r="{5 *cameraScaleValue}" class="handle-background"  cursor="nw-resize" />
	<circle cx="30" cy="120" r="{5 *cameraScaleValue}" class="handle"  cursor="nw-resize" />
</g>
<g>
	<circle cx="330" cy="120" r="{5 *cameraScaleValue}" class="handle-background" cursor="ne-resize" />
	<circle cx="330" cy="120" r="{5 *cameraScaleValue}" class="handle" cursor="ne-resize" />
</g>
<g>
	<circle cx="330" cy="320" r="{5 *cameraScaleValue}" class="handle-background" cursor="se-resize" />
	<circle cx="330" cy="320" r="{5 *cameraScaleValue}" class="handle" cursor="se-resize" />
</g>
<g>
	<circle cx="30" cy="320" r="{5 *cameraScaleValue}" class="handle-background" cursor="sw-resize" />
	<circle cx="30" cy="320" r="{5 *cameraScaleValue}" class="handle" cursor="sw-resize" />
</g>


<g>
	<circle cx="180" cy="{120 - 40*Math.min(cameraScaleValue, 2)}" r="{5 *cameraScaleValue}" pointer-events="all" class="handle-background" />
	<circle cx="180" cy="{120 - 40*Math.min(cameraScaleValue, 2)}" r="{5 *cameraScaleValue}" pointer-events="all" class="handle rotator-handle" style:--cursor-url="url({rotationCursor}) " />
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
</style>