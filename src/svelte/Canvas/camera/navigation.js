import * as R from "ramda";
import * as L from "partial.lenses";
import * as U from "../../utils.js";
import {
	atom,
	view,
	read,
	combine,
	combineWithRest,
} from "../../svatom.svelte.js";

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
	const newZoom = R.clamp(-8, 8, orig.z + delta.dz)

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

export const pivotZoomLens = L.lens(zoomWithPivotZeroDelta, zoomWithPivot)
export const pivotRotationLens =  L.lens(rotateWithPivotZeroDelta, rotateWithPivot)
export const pivotZoomScreenLens = L.lens(zoomWithPivotZeroDelta, zoomWithPivotScreen)
export const pivotRotationScreenLens =  L.lens(rotateWithPivotZeroDelta, rotateWithPivotScreen)
export const panScreenLens =  L.lens(panWithPivotZeroDelta, panWithPivotScreen)