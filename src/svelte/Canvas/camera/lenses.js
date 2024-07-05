import * as Geo from "../../geometry";
import * as R from "ramda";
import * as L from "partial.lenses";
import * as U from "../../utils";
import {cameraAsViewbox } from "./functions";
import {rotateWithPivot, zoomWithPivot } from "./navigation";

export const frameBoxLens = L.reread((camera) => {
	const { minX, minY, width, height } = U.scaleViewBox(
		cameraAsViewbox(camera),
		camera.frame.size.x,
		camera.frame.size.y,
		0,
	);

	return {
		screenSpaceAligned: { minX, minY, width, height },
		worldSpace: {
			a: Geo.rotatePivotXYDegree(
				camera.focus.x,
				camera.focus.y,
				-camera.focus.w,
				{ x: minX, y: minY },
			),
			b: Geo.rotatePivotXYDegree(
				camera.focus.x,
				camera.focus.y,
				-camera.focus.w,
				{ x: minX + width, y: minY },
			),
			c: Geo.rotatePivotXYDegree(
				camera.focus.x,
				camera.focus.y,
				-camera.focus.w,
				{ x: minX + width, y: minY + height },
			),
			d: Geo.rotatePivotXYDegree(
				camera.focus.x,
				camera.focus.y,
				-camera.focus.w,
				{ x: minX, y: minY + height },
			),
		},
	};
});



export const panMovementLens = [
	"focus",
	L.props("x", "y"),
	L.lens(R.always({ x: 0, y: 0 }), (delta, { x, y }) => {
		return {
			x: x + delta.x,
			y: y + delta.y,
		};
	}),
];

export const rotateMovementLens = [
	"focus",
	L.props("w", "x", "y"),
	L.lens(
		R.compose(
			R.assoc("dw", 0),
			R.zipObj(["px", "py"]),
			R.props(["x", "y"]),
		),
		rotateWithPivot,
	),
];

export const zoomMovementLens = [
	"focus",
	L.props("z", "x", "y"),
	L.lens(
		R.compose(
			R.assoc("dz", 0),
			R.zipObj(["px", "py"]),
			R.props(["x", "y"]),
		),
		zoomWithPivot,
	),
];