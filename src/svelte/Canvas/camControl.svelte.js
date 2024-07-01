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

const pivotZoomLens = L.lens(zoomWithPivotZeroDelta, zoomWithPivotScreen)
const pivotRotationLens =  L.lens(rotateWithPivotZeroDelta, rotateWithPivotScreen)
const panLens =  L.lens(panWithPivotZeroDelta, panWithPivotScreen)


export function bindEvents(node, cam) {
	const zoomDelta = view(['focus', pivotZoomLens], cam)
	const rotationDelta = view(['focus', pivotRotationLens], cam)
	const panDelta = view(['focus', panLens], cam)

	const svgPoint = node.createSVGPoint()


	function onWheel(evt) {
		if(evt.shiftKey || evt.altKey) {
			return
		}

		evt.preventDefault()
		evt.stopPropagation()
		
		svgPoint.x = evt.clientX
		svgPoint.y = evt.clientY

		const svgP = svgPoint.matrixTransform(
			node.getScreenCTM().inverse(),
		)

		if(evt.ctrlKey) {
			rotationDelta.value = {
				px: svgP.x,
				py: svgP.y,
				dw: -evt.deltaY/1000 * 90,
			}
		} else {
			zoomDelta.value = {
				px: svgP.x,
				py: svgP.y,
				dz: -evt.deltaY/1000,
			}
		}
	}

	let baseRot
	let baseScale
	let basePivot
	let prevTouchCount
	function onGestureChange(evt) {
		// if(fingerCount !== prevTouchCount) {
		// 	baseRot = evt.rotation
		// 	baseScale = evt.scale
		// 	basePivot = {
		// 		x: evt.clientX,
		// 		y: evt.clientY,
		// 	}
		// 	prevTouchCount = fingerCount
		// } 
		svgPoint.x = evt.clientX
		svgPoint.y = evt.clientY

		const {x:px,y:py} = svgPoint.matrixTransform(
			node.getScreenCTM().inverse(),
		)

		rotationDelta.value = {
			px: px,
			py: py,
			dw: (evt.rotation - baseRot) % 360,
		}

		baseRot = evt.rotation
	
		zoomDelta.value = {
			px: px,
			py: py,
			dz: Math.log(evt.scale / baseScale),
		}

		baseScale = evt.scale


		if(fingerCount < 3) {
		panDelta.value = {
			dx: basePivot.x - evt.clientX,
			dy: basePivot.y - evt.clientY,
		}
		}

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

	function onPointerStart(evt) {
		pointerIds.push(evt.pointerId)

		// if(pointerIds.length > 1) {
		// 	for(let i of pointerIds) {
		// 		node.setPointerCapture(i)
		// 	}
		// }
	}

	function onPointerEnd(evt) {
		removeItemOnce(pointerIds, evt.pointerId)
		// node.releasePointerCapture(evt.pointerId)

		// if(pointerIds.length < 2) {
		// 	for(let i of pointerIds) {
		// 		node.releasePointerCapture(i)
		// 	}
		// }
	}

	function onPointerMove(evt) {
		if(pointerIds.length > 1) {
			evt.stopImmediatePropagation()
			evt.stopPropagation()
		}
	}

	let fingerCount = 0
	function onTouchStart(evt) {
		fingerCount += evt.changedTouches.length
	}

	function onTouchEnd(evt) {
		fingerCount -= evt.changedTouches.length
	}
	function onTouchCancel(evt) {
		fingerCount -= evt.changedTouches.length
	}

	function onTouchMove(evt) {
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
	node.addEventListener('touchstart', onTouchStart, true)
	node.addEventListener('touchmove', onTouchMove, true)
	node.addEventListener('touchcancel', onTouchCancel, true)
	node.addEventListener('touchend', onTouchEnd, true)

	return () => {
		node.removeEventListener('touchstart', onTouchStart, true)
		node.removeEventListener('touchmove', onTouchMove, true)
		node.removeEventListener('touchcancel', onTouchCancel, true)
		node.removeEventListener('touchend', onTouchEnd, true)
		node.removeEventListener('pointerup', onPointerEnd, true)
		node.removeEventListener('pointermove', onPointerMove, true)
		node.removeEventListener('pointercancel', onPointerEnd, true)
		node.removeEventListener('pointerdown', onPointerStart, true)
		node.removeEventListener('gesturechange', onGestureStart, false)
		node.removeEventListener('gesturestart', onGestureChange, false)
		node.removeEventListener('wheel', onWheel, { passive:false })
	}
}