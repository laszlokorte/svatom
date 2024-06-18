import * as R from "ramda";
import * as L from "partial.lenses";
import {
	atom,
	view,
	read,
	combine,
	combineWithRest,
} from "../svatom.svelte.js";

const normRot = R.compose(R.add(-180), R.modulo(R.__, 360), R.add(180))

function rotateWithPivot(delta, orig) {
	const newAngle = normRot(orig.w + delta.dw)

  	const dxPivot = (delta.px - orig.x);
	const dyPivot = (delta.py - orig.y);
  	const currentSin = Math.sin(Math.PI / 180 * orig.w)
  	const currentCos = Math.cos(Math.PI / 180 * orig.w)
  	const pivotWorldX = orig.x + (currentCos*dxPivot + currentSin*dyPivot)
    const pivotWorldY = orig.y + (-currentSin*dxPivot + currentCos*dyPivot)

	const dxCam = orig.x - pivotWorldX;
	const dyCam = orig.y - pivotWorldY;
	const deltaSin = Math.sin(Math.PI * delta.dw / 180)
	const deltaCos = Math.cos(Math.PI * delta.dw / 180)

	const newX = pivotWorldX + (deltaCos * dxCam + deltaSin * dyCam)
	const newY = pivotWorldY + (-deltaSin * dxCam + deltaCos * dyCam)

	return {
		...orig,
		w: newAngle,
		x: newX,
		y: newY,
	}
}

function rotateWithPivotZeroDelta(cam) {
	return {
		dw: 0,
		px: cam.x,
		py: cam.y,
	}
}


function zoomWithPivot(delta, orig) {
	const newZoom = R.clamp(-3, 3, orig.z + delta.dz)

	const realFactor = newZoom - orig.z;
  	const panFactor = 1 - Math.exp(-realFactor);
  	const sin = Math.sin(Math.PI / 180 * orig.w)
  	const cos = Math.cos(Math.PI / 180 * orig.w)
  	const dx = (delta.px - orig.x);
	const dy = (delta.py - orig.y);
  	const newX = orig.x + (cos*dx + sin*dy) * panFactor
    const newY = orig.y + (-sin*dx + cos*dy) * panFactor

	return {
		...orig,
		z: newZoom,
		x: newX,
		y: newY,
	}
}

function zoomWithPivotZeroDelta(cam) {
	return {
		dz: 0,
		px: cam.x,
		py: cam.y,
	}
}

const pivotZoomLens = L.lens(zoomWithPivotZeroDelta, zoomWithPivot)
const pivotRotationLens =  L.lens(rotateWithPivotZeroDelta, rotateWithPivot)


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