
import * as L from "partial.lenses";

import {
	atom,
	view,
	read,
	combine,
	combineWithRest,
} from "../../svatom.svelte.js";

import {pivotZoomLens,
pivotRotationLens,
panScreenLens} from './navigation'

export function bindEvents(node, {camera, worldClientIso}) {
	const eventWorld = [L.props('clientX', 'clientY'), L.pick({x: 'clientX', y: 'clientY'}), L.inverse(worldClientIso), L.props('x','y')]

	const zoomDelta = view(['focus', pivotZoomLens], camera)
	const rotationDelta = view(['focus', pivotRotationLens], camera)
	const panScreenDelta = view(['focus', panScreenLens], camera)

	function onWheel(evt) {
		if(evt.shiftKey || evt.altKey) {
			return
		}

		evt.preventDefault()
		evt.stopPropagation()

		const worldPos = L.get(eventWorld, evt)

		if(evt.ctrlKey) {
			rotationDelta.value = {
				px: worldPos.x,
				py: worldPos.y,
				dw: -evt.deltaY/1000 * 90,
			}
		} else {
			zoomDelta.value = {
				px: worldPos.x,
				py: worldPos.y,
				dz: -evt.deltaY/1000,
			}
		}
	}

	let baseRot
	let baseScale
	let basePivot
	let prevTouchCount
	function onGestureChange(evt) {
		const worldPos = L.get(eventWorld, evt)


		const dw = Math.atan2(Math.sin((evt.rotation - baseRot)/180*Math.PI), Math.cos((evt.rotation - baseRot)/180*Math.PI))*180/Math.PI
		const dz = Math.log(evt.scale / baseScale)
		const dx = basePivot.x - evt.clientX
		const dy = basePivot.y - evt.clientY

		const suddenAngle = Math.abs(dw) > 30
		const suddenZoom = Math.abs(dz) > 0.2
		const suddenPan = Math.hypot(dx, dy) > 15 * window.devicePixelRatio

		if(!suddenAngle && !suddenZoom && !suddenPan) {
			rotationDelta.value = {
				px: worldPos.x,
				py: worldPos.y,
				dw: dw,
			}
			zoomDelta.value = {
				px: worldPos.x,
				py: worldPos.y,
				dz: dz,
			}
			panScreenDelta.value = {
				dx,
				dy,
			}
		}

		baseScale = evt.scale
		baseRot = evt.rotation
		basePivot = {
			x: evt.clientX,
			y: evt.clientY,
		}
	};

	function onGestureStart(evt) {
		baseRot = evt.rotation
		baseScale = evt.scale

		basePivot = {
			x: evt.clientX,
			y: evt.clientY,
		}

	};

	const pointerIds = []
	let primaryPointer = null

	let mouseGrab
	function onPointerStart(evt) {
		if(evt.isPrimary) {
			primaryPointer = evt.pointerId
		}

		if(evt.pointerType === 'mouse' && evt.button === 1 && evt.shiftKey) {
			node.setPointerCapture(evt.pointerId)
			mouseGrab = {
				x: evt.clientX,
				y: evt.clientY,
			}
		}

		if(evt.pointerType !== 'touch') {
			return
		}
		pointerIds.push(evt.pointerId)

		if(pointerIds.length >= 2) {
			node.setPointerCapture(evt.pointerId)
		}
	}

	function onPointerEnd(evt) {
		if(evt.isPrimary) {
			primaryPointer = null
		}

		if(node.hasPointerCapture(evt.pointerId)) {
			mouseGrab = undefined
		}

		if(evt.pointerType !== 'touch') {
			return
		}
		removeItemOnce(pointerIds, evt.pointerId)

		if(pointerIds.length <= 2) {
			if(primaryPointer) {
				node.releasePointerCapture(primaryPointer)
			}
			for (let j=pointerIds.length-1;j>=0;j--) {
				node.releasePointerCapture(
				pointerIds[j])
			}
		}
	}

	function onPointerMove(evt) {
		if(node.hasPointerCapture(evt.pointerId)) {
			
			const dx = mouseGrab.x - evt.clientX
			const dy = mouseGrab.y - evt.clientY

			panScreenDelta.value = {
				dx,
				dy,
			}
			mouseGrab = {
				x: evt.clientX,
				y: evt.clientY,
			}
		}

		if(evt.pointerType !== 'touch') {
			return
		}
		if(pointerIds.length > 1) {
			evt.stopImmediatePropagation()
			evt.stopPropagation()

			if(!node.hasPointerCapture(primaryPointer)) {
				node.setPointerCapture(primaryPointer)
			}
		}
	}

	function removeItemOnce(arr, value) {
	  let index = arr.indexOf(value);
	  if (index > -1) {
	    arr.splice(index, 1);
	  }
	  return arr;
	}

	node.addEventListener('wheel', onWheel, { passive:false, capture: false })
	node.addEventListener('gesturestart', onGestureStart, true)
	node.addEventListener('gesturechange', onGestureChange, true)
	node.addEventListener('pointerdown', onPointerStart, true)
	node.addEventListener('pointermove', onPointerMove, true)
	node.addEventListener('pointercancel', onPointerEnd, true)
	node.addEventListener('pointerup', onPointerEnd, true)

	return () => {
		node.removeEventListener('pointerup', onPointerEnd, true)
		node.removeEventListener('pointermove', onPointerMove, true)
		node.removeEventListener('pointercancel', onPointerEnd, true)
		node.removeEventListener('pointerdown', onPointerStart, true)
		node.removeEventListener('gesturechange', onGestureStart, true)
		node.removeEventListener('gesturestart', onGestureChange, true)
		node.removeEventListener('wheel', onWheel, { passive:false, capture: false })
	}
}