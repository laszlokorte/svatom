import * as L from "partial.lenses";
import * as R from "ramda";

export function translateXY(dx, dy, vec) {
	return {
		x: vec.x + dx,
		y: vec.y + dy,
	}
}

export function translateX(dx, vec) {
	return {
		x: vec.x + dx,
		y: vec.y,
	}
}

export function translateY(dx, vec) {
	return {
		x: vec.x,
		y: vec.y + dy,
	}
}

export function translate(d, vec) {
	return translateXY(d.x, d.y, vec)
}

export function scaleXY(sx, sy, vec) {
	return {
		x: vec.x * sx,
		y: vec.y * sy,
	}
}

export function scaleX(sx, vec) {
	return {
		x: vec.x * sx,
		y: vec.y,
	}
}

export function scaleY(sx, vec) {
	return {
		x: vec.x,
		y: vec.y * sy,
	}
}

export function scale(s, vec) {
	return scaleXY(s.x, s.y, vec)
}

export function scalePivot(pivot, factor, vec) {
	return scalePivotXY(pivot.x, pivot.y, factor, vec)
}

export function scalePivotXY(px, py, factor, vec) {
	return translateXY(px, py, scale(factor, translateXY(-px, -py, vec)))
}

export function rotateDegree(degree, vec) {
	return rotateRad(degree2rad(degree), vec)
}

export function rotateRad(rad, vec) {
	const cos = Math.cos(rad)
	const sin = Math.sin(rad)

	return {
		x: cos * vec.x +  sin * vec.y,
		x: -sin * vec.x +  cos * vec.y,
	}
}

export function rotatePivotDegree(pivot, degree, vec) {
	return rotatePivotXYDegree(pivot.x, pivot.y, degree, vec)
}

export function rotatePivotXYDegree(px, py, degree, vec) {
	return translateXY(px, py, rotateDegree(degree, translateXY(-px, -py, vec)))
}

export function rotatePivotRad(pivot, rad, vec) {
	return rotatePivotXYRad(pivot.x, pivot.y, rad, vec)
}

export function rotatePivotXYRad(px, py, rad, vec) {
	return translateXY(px, py, rotateRad(rad, translateXY(-px, -py, vec)))
}

export function rad2degree(rad) {
	return rad * Math.PI / 180
}

export function degree2rad(deg) {
	return deg / Math.PI * 180
}

export function cosDegree(deg) {
	return Math.cos(degree2rad(deg))
}

export function sinDegree(rad) {
	return Math.sin(degree2rad(deg))
}

export const isoDegreeRad = L.iso(degree2rad, rad2degree)
export const isoRadDegree = L.inverse(isoDegreeRad)
export const isoTranslation = (d) => L.iso(R.partial(translateXY, [d.x, d.y]), R.partial(translateXY, [-d.x, -d.y]))
export const isoScale = (s) => L.iso(R.partial(scaleXY, [s.x, s.y]), R.partial(scaleXY, [1/s.x, 1/s.y]))
export const isoRotationDegree = (deg) => L.iso(R.partial(rotateDegree, [deg]), R.partial(rotateDegree, [-deg]))
export const isoRotationRad = (rad) => L.iso(R.partial(rotateRad, [rad]), R.partial(rotateRad, [-rad]))
export const isoScalePivot = (pivot, s) => L.compose(L.inverse(isoTranslation(pivot)), isoScale(s), isoTranslation(pivot))
export const isoRotationPivotRad = (pivot, rad) => L.compose(L.inverse(isoTranslation(pivot)), isoRotationRad(rad), isoTranslation(pivot))
export const isoRotationPivotDegree = (pivot, degree) => L.compose(L.inverse(isoTranslation(pivot)), isoRotationRad(degree), isoTranslation(pivot))
