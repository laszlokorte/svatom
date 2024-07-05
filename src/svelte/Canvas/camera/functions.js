
export const cameraAsViewbox = (camera) => {
	return {
		alignmentX: camera.frame.alignX,
		alignmentY: camera.frame.alignY,
		width: camera.plane.x * Math.exp(-camera.focus.z),
		height: camera.plane.y * Math.exp(-camera.focus.z),
		minX:
			camera.focus.x -
			(camera.plane.x / 2) * Math.exp(-camera.focus.z),
		minY:
			camera.focus.y -
			(camera.plane.y / 2) * Math.exp(-camera.focus.z),
		scaling: camera.frame.aspect,
	};
};