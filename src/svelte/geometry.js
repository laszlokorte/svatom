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
		x: cos * vec.x - sin * vec.y,
		y: sin * vec.x + cos * vec.y,
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
	return rad / Math.PI * 180
}

export function degree2rad(deg) {
	return deg * Math.PI / 180
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

export function rayInsideQuad(angle, dist, quad) {
	const supX = Math.cos(angle + Math.PI / 2) * dist;
	const supY = Math.sin(angle + Math.PI / 2) * dist;

	const dirX = Math.cos(angle);
	const dirY = Math.sin(angle);

	const sides = [
		[quad.a, quad.b],
		[quad.b, quad.c],
		[quad.d, quad.c],
		[quad.a, quad.d],
	];
	const [intersectionA, intersectionB] = R.compose(
		R.take(2),
		R.reject(R.isNil),
		R.map(([from, to]) => RayToLineSegment(supX, supY, dirX, dirY, from, to)),
	)(sides);

	return (intersectionA && intersectionB) ? ({a: intersectionA, b: intersectionB, sup: {x: supX, y:supY, dx: dirX, dy: dirY}}) : undefined
};


function RayToLineSegment(
	x,
	y,
	dx,
	dy,
	{ x: x1, y: y1 },
	{ x: x2, y: y2 }
) {
	const d = dx * (y2 - y1) - dy * (x2 - x1);
	if (d != 0) {
		const r = ((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)) / d;
		const s = ((y - y1) * dx - (x - x1) * dy) / d;
		if (s >= 0 && s <= 1) {
			return { x: x + r * dx, y: y + r * dy };
		}
	}
	return null;
}

export function angleRadBetweenXY(ax,ay,bx,by,cx,cy) {
	const BAx = ax - bx;
	const BAy = ay - by;
	const BCx = cx - bx;
	const BCy = cy - by;

	const dot = BCx * BAx + BCy * BAy;
	const det = BCx * BAy - BCy * BAx;

	return Math.atan2(det, dot);
}

export function angleRadBetween(a,b,c) {
	return angleRadBetweenXY(a.x,a.y, b.x,b.y, c.x,c.y)
}

export function angleDegreeBetween(a,b,c) {
	return rad2degree(angleRadBetween(a,b,c))
}
export function angleDegreeBetweenXY(ax,ay,bx,by,cx,cy) {
	return rad2degree(angleRadBetweenXY(ax,ay,bx,by,cx,cy))
}