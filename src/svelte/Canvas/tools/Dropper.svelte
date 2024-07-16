<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read } from "../../svatom.svelte.js";
	const {children, frameBoxPath, newText, clientToCanvas, cameraScale, newNode, dragging = atom(false)} = $props()

	const onDragOver = (evt) => {
		if(evt.dataTransfer.items.length < 1) {
			dragging.value = false
			return
		}
		evt.preventDefault();
		evt.dataTransfer.dropEffect= "copy"
		dragging.value = true
	}

	const onDragEnter = (evt) => {
		if(evt.dataTransfer.items.length < 1) {
			return
		}
		evt.preventDefault();
		dragging.value = true
	}

	const onDragLeave = (evt) => {
		evt.preventDefault();
		dragging.value = false
	}

	const onDragDrop = (evt) => {
		evt.preventDefault()	
		const position = clientToCanvas(evt.clientX, evt.clientY)

		dragging.value = false

		for(let item of evt.dataTransfer.items) {
			if(item.type === 'text/plain') {
				item.getAsString((s) => {
					newText.value = {
						x: position.x,
						y: position.y,
						fontSize: 2*cameraScale.value,
						content: s,
					}
				})
			} else if(item.type === 'x-custom/node') {
				item.getAsString((s) => {
					const n = JSON.parse(s)
					newNode.value = {
						x: position.x,
						y: position.y,
					}
				})
			} else if(item.kind === 'string') {
				item.getAsString((s) => {
					alert("dropped: "+s)
				})
			} else if(item.kind === 'file') {
				alert("dropped file ")
			}
		}
	}
</script>

<g role="presentation" pointer-events="all" ondragover={onDragOver} ondragenter={onDragEnter} ondragleave={onDragLeave} ondrop={onDragDrop}>
	<path class:active={dragging.value} class:active={dragging.value} class="drop-zone-background" d={frameBoxPath.value} fill="none" pointer-events="all"/>

	{@render children()}

	<path class:active={dragging.value} class="drop-zone" d={frameBoxPath.value} fill="none" pointer-events="none"/>
</g>

<style>
	.drop-zone {
		fill: none;
		stroke-width: 1em;
		vector-effect: non-scaling-stroke;
		stroke: transparent;
	}

	.drop-zone.active {
		stroke: #22ee88;
		fill: none;
	}

	.drop-zone-background.active {
		fill-opacity: 0.05;
		fill: #11ff33;
	}
</style>