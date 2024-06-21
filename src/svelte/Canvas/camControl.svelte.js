import * as R from "ramda";
import * as L from "partial.lenses";
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
	const deltaSin = Math.sin(Math.PI * delta.dw / 180)
	const deltaCos = Math.cos(Math.PI * delta.dw / 180)

	const newX = delta.px + (deltaCos * dxCam + deltaSin * dyCam)
	const newY = delta.py + (-deltaSin * dxCam + deltaCos * dyCam)

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
  	const currentSin = Math.sin(Math.PI / 180 * orig.w)
  	const currentCos = Math.cos(Math.PI / 180 * orig.w)
  	const pivotWorldX = orig.x + (currentCos*dxPivot + currentSin*dyPivot)
    const pivotWorldY = orig.y + (-currentSin*dxPivot + currentCos*dyPivot)

	return rotateWithPivot({px: pivotWorldX, py: pivotWorldY, dw: delta.dw}, orig)
}

function rotateWithPivotZeroDelta(cam) {
	return {
		dw: 0,
		px: cam.x,
		py: cam.y,
	}
}

function lerp(a,b,t) {
	return a + (b-a)*t
}


export function zoomWithPivot(delta, orig) {
	const newZoom = R.clamp(-3, 3, orig.z + delta.dz)

	const realFactor = newZoom - orig.z;
  	const panFactor = 1 - Math.exp(-realFactor);
  	const newX = lerp(orig.x, delta.px, panFactor)
    const newY = lerp(orig.y, delta.py, panFactor)

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

const pivotZoomLens = L.lens(zoomWithPivotZeroDelta, zoomWithPivotScreen)
const pivotRotationLens =  L.lens(rotateWithPivotZeroDelta, rotateWithPivotScreen)


export function bindEvents(node, cam) {
	const zoomDelta = view(['focus', pivotZoomLens], cam)
	const rotationDelta = view(['focus', pivotRotationLens], cam)

	const svgPoint = node.createSVGPoint()


	function onWheel(evt) {
		if(evt.shiftKey || evt.altKey) {
			return
		}

		evt.preventDefault()
		
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

	node.addEventListener('wheel', onWheel)

	return () => {
		node.removeEventListener('wheel', onWheel)
	}
}