import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
	} from "../svatom.svelte.js";

export function bindEvents(node, cam) {
	const zoom = view(['focus', 'z'], cam)
	const rotation = view(['focus', 'w'], cam)

	function onWheel(evt) {
		if(evt.shiftKey || evt.altKey) {
			return
		}

		evt.preventDefault()
		if(evt.ctrlKey) {
			rotation.value -= evt.deltaY/1000 * 90
		} else {
			zoom.value -= evt.deltaY/1000
		}
	}

	node.addEventListener('wheel', onWheel)

	return () => {
		node.removeEventListener('wheel', onWheel)
	}
}