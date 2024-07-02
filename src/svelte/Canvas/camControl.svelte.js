import * as R from "ramda";
import * as L from "partial.lenses";
import * as U from "../utils.js";
import {
	atom,
	view,
	read,
	combine,
	combineWithRest,
} from "../svatom.svelte.js";

const normRot = R.compose(R.add(-180), R.modulo(R.__, 360), R.add(180), R.add(360))

export function rotateWithPivot(delta, orig) {
	const newAngle = normRot(orig.w + delta.dw)

	const dxCam = orig.x - delta.px;
	const dyCam = orig.y - delta.py;
	const deltaSin = Math.sin(-Math.PI * delta.dw / 180)
	const deltaCos = Math.cos(-Math.PI * delta.dw / 180)

	const newX = delta.px + (deltaCos * dxCam - deltaSin * dyCam)
	const newY = delta.py + (deltaSin * dxCam + deltaCos * dyCam)

	return {
		...orig,
		w: newAngle,
		x: newX,
		y: newY,
	}
}

export function rotateWithPivotScreen(delta, orig) {
  	const dxPivot = (delta.px - orig.x);
	const dyPivot = (delta.py - orig.y);
  	const currentSin = Math.sin(-Math.PI / 180 * orig.w)
  	const currentCos = Math.cos(-Math.PI / 180 * orig.w)
  	const pivotWorldX = orig.x + (currentCos*dxPivot - currentSin*dyPivot)
    const pivotWorldY = orig.y + (currentSin*dxPivot + currentCos*dyPivot)

	return rotateWithPivot({px: pivotWorldX, py: pivotWorldY, dw: delta.dw}, orig)
}

function rotateWithPivotZeroDelta(cam) {
	return {
		dw: 0,
		px: cam.x,
		py: cam.y,
	}
}

export function zoomWithPivot(delta, orig) {
	const newZoom = R.clamp(-5, 5, orig.z + delta.dz)

	const realFactor = newZoom - orig.z;
  	const panFactor = 1 - Math.exp(-realFactor);
  	const newX = U.lerp(orig.x, delta.px, panFactor)
    const newY = U.lerp(orig.y, delta.py, panFactor)

	return {
		...orig,
		z: newZoom,
		x: newX,
		y: newY,
	}
}


export function zoomWithPivotScreen(delta, orig) {
  	const sin = Math.sin(Math.PI / 180 * orig.w)
  	const cos = Math.cos(Math.PI / 180 * orig.w)
  	const dx = (delta.px - orig.x);
	const dy = (delta.py - orig.y);

	return zoomWithPivot({
		px: orig.x + (cos*dx + sin*dy), 
		py: orig.y + (-sin*dx + cos*dy), 
		dz: delta.dz,
	}, orig)
}

function zoomWithPivotZeroDelta(cam) {
	return {
		dz: 0,
		px: cam.x,
		py: cam.y,
	}
}

export function panWithPivot(delta, orig) {
  	const newX = orig.x + delta.dx
    const newY = orig.y + delta.dy

	return {
		...orig,
		x: newX,
		y: newY,
	}
}

export function panWithPivotScreen(delta, orig) {
  	const sin = Math.sin(Math.PI / 180 * orig.w)
  	const cos = Math.cos(Math.PI / 180 * orig.w)

	return panWithPivot({
		dx: (cos*delta.dx + sin*delta.dy) * Math.exp(-orig.z), 
		dy: (-sin*delta.dx + cos*delta.dy) * Math.exp(-orig.z), 
	}, orig)
}

function panWithPivotZeroDelta(cam) {
	return {
		dx: 0,
		dy: 0,
	}
}

const pivotZoomLens = L.lens(zoomWithPivotZeroDelta, zoomWithPivot)
const pivotRotationLens =  L.lens(rotateWithPivotZeroDelta, rotateWithPivot)
const pivotZoomScreenLens = L.lens(zoomWithPivotZeroDelta, zoomWithPivotScreen)
const pivotRotationScreenLens =  L.lens(rotateWithPivotZeroDelta, rotateWithPivotScreen)
const panScreenLens =  L.lens(panWithPivotZeroDelta, panWithPivotScreen)


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

		if(Math.abs(dw) < 30) {
			rotationDelta.value = {
				px: worldPos.x,
				py: worldPos.y,
				dw: dw,
			}
		}

		if(Math.abs(dz) < 0.2) {
			zoomDelta.value = {
				px: worldPos.x,
				py: worldPos.y,
				dz: dz,
			}
		}

		if(Math.hypot(dx, dy) < 10) {
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

	let mouseGrab
	function onPointerStart(evt) {
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
	}

	function onPointerEnd(evt) {
		if(node.hasPointerCapture(evt.pointerId)) {
			mouseGrab = undefined
		}

		if(evt.pointerType !== 'touch') {
			return
		}
		removeItemOnce(pointerIds, evt.pointerId)
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
		}
	}

	function removeItemOnce(arr, value) {
	  let index = arr.indexOf(value);
	  if (index > -1) {
	    arr.splice(index, 1);
	  }
	  return arr;
	}

	node.addEventListener('wheel', onWheel, { passive:false })
	node.addEventListener('gesturestart', onGestureStart, false)
	node.addEventListener('gesturechange', onGestureChange, false)
	node.addEventListener('pointerdown', onPointerStart, true)
	node.addEventListener('pointermove', onPointerMove, true)
	node.addEventListener('pointercancel', onPointerEnd, true)
	node.addEventListener('pointerup', onPointerEnd, true)

	return () => {
		node.removeEventListener('pointerup', onPointerEnd, true)
		node.removeEventListener('pointermove', onPointerMove, true)
		node.removeEventListener('pointercancel', onPointerEnd, true)
		node.removeEventListener('pointerdown', onPointerStart, true)
		node.removeEventListener('gesturechange', onGestureStart, false)
		node.removeEventListener('gesturestart', onGestureChange, false)
		node.removeEventListener('wheel', onWheel, { passive:false })
	}
}