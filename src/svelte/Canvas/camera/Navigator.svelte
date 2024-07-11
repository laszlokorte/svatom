<script>
	import {tick, untrack} from "svelte";

	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import { atom, view, during, read } from "../../svatom.svelte.js";
	import {bindEvents} from "./events";
	import {constructLenses} from "./live";
	import {frameBoxLens, panMovementLens, rotateMovementLens, zoomMovementLens} from "./lenses";

	const {
		camera,
		cameraTow,
		frameBoxPath,
		children,
		errorHandler,
	} = $props();


	const svgElement = atom(null)
	const thisElement = view(L.setter(g => g.ownerSVGElement), svgElement)

	const liveLenses = constructLenses(svgElement, camera)
	const frameBoxObject = read(frameBoxLens, camera);

	const panMovement = view(panMovementLens, camera);
	const cameraFocus = view('focus', camera);
	
	if(cameraTow) {
		during(cameraTow, v => {
			untrack(() => {
				const cameraQuad = frameBoxObject.value.worldSpace
				if(!Geo.quadContainsPoint(cameraQuad, v)) {
					tick().then(() => {
						panMovement.value = {
							x: (v.x - cameraFocus.value.x)/100,
							y: (v.y - cameraFocus.value.y)/100,
						}
						cameraTow.value = {
							x: v.x + (v.x - cameraFocus.value.x)/100,
							y: v.y + (v.y - cameraFocus.value.y)/100,
						}
					})
				}
			})
		})
	}
</script>


<g bind:this={thisElement.value} use:bindEvents={{camera, worldClientIso: liveLenses.worldClientIso, errorHandler }}>
	<path d={frameBoxPath.value}  stroke="none" fill="#ffffff00" pointer-events="all" />

	{@render children()}

</g>