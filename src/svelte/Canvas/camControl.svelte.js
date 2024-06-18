import * as R from "ramda";
import * as L from "partial.lenses";
import {
	atom,
	view,
	read,
	combine,
	combineWithRest,
} from "../svatom.svelte.js";

export function bindEvents(node, cam) {
	const zoom = view(['focus', 'z', L.normalize(R.clamp(-3,3))], cam)
	const rotation = view(['focus', 'w', L.normalize(R.compose(R.add(-180), R.modulo(R.__, 360), R.add(360)))], cam)

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