
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

	let gestureBaseRot
	let gestureBaseScale
	let gestureBasePivot = null
	let prevTouchCount
	function onGestureChange(evt) {
		const worldPos = L.get(eventWorld, evt)


		const dw = Math.atan2(Math.sin((evt.rotation - gestureBaseRot)/180*Math.PI), Math.cos((evt.rotation - gestureBaseRot)/180*Math.PI))*180/Math.PI
		const dz = Math.log(evt.scale / gestureBaseScale)
		const dx = gestureBasePivot.x - evt.clientX
		const dy = gestureBasePivot.y - evt.clientY

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

		gestureBaseScale = evt.scale
		gestureBaseRot = evt.rotation
		gestureBasePivot = {
			x: evt.clientX,
			y: evt.clientY,
		}
	};


	function onGestureStart(evt) {
		gestureBaseRot = evt.rotation
		gestureBaseScale = evt.scale

		gestureBasePivot = {
			x: evt.clientX,
			y: evt.clientY,
		}
	};

	function onGestureEnd(evt) {
		gestureBaseRot = null
		gestureBaseScale = null
		gestureBasePivot = null

	};

	let mouseGrab
	function onPointerStart(evt) {
		if(evt.pointerType === 'mouse' && evt.button === 1 && evt.shiftKey) {
			node.setPointerCapture(evt.pointerId)
		}

	}

	function onPointerEnd(evt) {
	}

	function onPointerGotCapture(evt) {
	}

	function onPointerLostCapture(evt) {
		if(mouseGrab && mouseGrab.pointerId == evt.pointerId) {
			mouseGrab = undefined
		}
	}

	function onPointerMove(evt) {
		if(mouseGrab && mouseGrab.pointerId === evt.pointerId) {
			const dx = mouseGrab.x - evt.clientX
			const dy = mouseGrab.y - evt.clientY

			panScreenDelta.value = {
				dx,
				dy,
			}
			mouseGrab = {
				pointerId: evt.pointerId,
				x: evt.clientX,
				y: evt.clientY,
			}
		}
	}

	window.addEventListener('error', (e) => {
		alert(e.message)
	})


	node.addEventListener('wheel', onWheel, { passive:false, capture: true })
	node.addEventListener('gesturestart', onGestureStart, false)
	node.addEventListener('gestureend', onGestureEnd, false)
	node.addEventListener('gesturechange', onGestureChange, false)
	node.addEventListener('pointerdown', onPointerStart, true)
	node.addEventListener('pointermove', onPointerMove, true)
	node.addEventListener('pointercancel', onPointerEnd, true)
	node.addEventListener('lostpointercapture', onPointerLostCapture, true)
	node.addEventListener('getpointercapture', onPointerGotCapture, true)
	node.addEventListener('pointerup', onPointerEnd, true)

	return () => {
		node.removeEventListener('pointerup', onPointerEnd, true)
		node.removeEventListener('pointermove', onPointerMove, true)
		node.removeEventListener('lostpointercapture', onPointerLostCapture, true)
		node.removeEventListener('getpointercapture', onPointerGotCapture, true)
		node.removeEventListener('pointercancel', onPointerEnd, true)
		node.removeEventListener('pointerdown', onPointerStart, true)
		node.removeEventListener('gesturechange', onGestureStart, false)
		node.removeEventListener('gesturestart', onGestureChange, false)
		node.removeEventListener('gestureend', onGestureEnd, false)
		node.removeEventListener('wheel', onWheel, { passive:false, capture: true })
	}
}