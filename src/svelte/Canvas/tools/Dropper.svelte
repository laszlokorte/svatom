<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read } from "../../svatom.svelte.js";
	const {children, frameBoxPath, newText, clientToCanvas, cameraScale, cameraOrientation, newNode, newShape, dragging = atom(0)} = $props()

	const onDragOver = (evt) => {
		if(evt.dataTransfer.items.length < 1) {
			dragging.value = 0
			return
		}
		evt.preventDefault();
		evt.dataTransfer.dropEffect= "copy"
	}

	const onDragEnter = (evt) => {
		if(evt.dataTransfer.items.length < 1) {
			return
		}
		evt.preventDefault();
		dragging.value++
	}

	const onDragLeave = (evt) => {
		if(evt.dataTransfer.items.length < 1) {
			dragging.value = 0
			return
		}
		evt.preventDefault();
		dragging.value--
	}

	const onDragDrop = (evt) => {
		evt.preventDefault()	
		const position = clientToCanvas(evt.clientX, evt.clientY)

		dragging.value = 0

		for(let item of evt.dataTransfer.items) {
			if(item.type === 'text/plain') {
				item.getAsString((s) => {
					newText.value = {
						x: position.x,
						y: position.y,
						fontSize: 4*cameraScale.value,
						content: JSON.parse(s).text,
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
			} else if(item.type === 'x-custom/shape') {
				item.getAsString((s) => {
					const n = JSON.parse(s)
					const box = n.box.split(" ")
					const w = box[2]*cameraScale.value/2
					const h = box[3]*cameraScale.value/2
					const a = -cameraOrientation.value
					const cos = Math.cos(a / 180 * Math.PI)
					const sin = Math.sin(a / 180 * Math.PI)
					newShape.value = {
						placement: {
							start: {x: position.x - (cos*w - sin*h)/2, y: position.y - (sin*w + cos*h)/2},
							size: {x: w, y: h},
							angle: a,
						},
						content: {
							box: n.box,
							paths: n.paths,
						},
					};
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

<div  class="drop-zone" role="application" pointer-events="all" ondragover={onDragOver} ondragenter={onDragEnter} ondragleave={onDragLeave} ondrop={onDragDrop} class:active={dragging.value> 0}>
	{@render children()}
	<div class="blocker" class:active={dragging.value> 0} ondragenter={onDragEnter} ondragleave={onDragLeave} role="application"></div>
</div>

<style>
	.drop-zone {
		display: block;
		position: relative;
		min-width: max-content;
		min-height: max-content;
	}

	.drop-zone.active {
		outline: 0.5em solid #22ee88;
	}

	.blocker {
		position: absolute;
		inset: 0;
		color: #22ee88;
		padding: 1em;
		font-size: 2em;
		display: none;
		font-family: sans-serif;
		pointer-events: none;
	}

	.blocker.active {
		display: grid;
		pointer-events: all;
		touch-action: none;
	}
</style>