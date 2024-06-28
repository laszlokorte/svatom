<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as Geo from "../geometry";
	import * as U from "../utils";
	import * as Cam from "./camControl.svelte";
	import {
		atom,
		view,
		read,
		combine,
		update,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		traverse,
	} from "../svatom.svelte.js";

	const numberFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		useGrouping: false,
	});

	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const numberLens = L.lens(
		(x) => numberFormat.format(x),
		(x) => {
			return parseFloat(x);
		},
	);

	import Scroller from "../Scroller.svelte";
	import Creator from "./tools/Creator.svelte";
	import Lasso from "./tools/Lasso.svelte";
	import Pen from "./tools/Pen.svelte";
	import Polygon from "./tools/Polygon.svelte";
	import Spline from "./tools/Spline.svelte";
	import Shape from "./tools/Shape.svelte";

	import RubberBand from "./tools/RubberBand.svelte";
	import Nodes from "./tools/Nodes.svelte";
	import Drawings from "./tools/Drawings.svelte";
	import Bounds from "./tools/Bounds.svelte";
	import Origin from "./tools/Origin.svelte";
	import TextLines from "./tools/TextLines.svelte";
	import TextBoxes from "./tools/TextBoxes.svelte";
	import TextLineTyper from "./tools/TextLineTyper.svelte";
	import TextBoxTyper from "./tools/TextBoxTyper.svelte";
	import Magnifier from "./tools/Magnifier.svelte";
	import GuideLiner from "./tools/GuideLiner.svelte";
	import Guides from "./tools/Guides.svelte";
	import Axis from "./tools/Axis.svelte";
	import ShowAxis from "./tools/ShowAxis.svelte";
	import Pan from "./tools/Pan.svelte";
	import Rotate from "./tools/Rotate.svelte";
	import Zoom from "./tools/Zoom.svelte";

	const svgElement = atom(null);

	function clientToCanvas(x, y, screen = false) {
		const screenPoint = U.screenToElementViewbox(
			x,
			y,
			svgElement.value,
			cameraToViewbox(camera.value),
		);

		if (screen) {
			return screenPoint;
		} else {
			return Geo.rotatePivotXYDegree(
				camera.value.focus.x,
				camera.value.focus.y,
				-camera.value.focus.w,
				screenPoint,
			);
		}
	}

	const debugFrames = atom(false);
	const camera = atom({
		focus: {
			x: 0,
			y: 0,
			z: 0,
			w: 20,
		},
		plane: {
			autosize: true,
			x: 1000,
			y: 1000,
		},
		frame: {
			aspect: "meet",
			alignX: "Mid",
			alignY: "Mid",
			autoPadding: true,
			size: {
				x: 100,
				y: 100,
			},
		},
	});

	const aspectRatioAlignLens = L.iso(
		({ alignX, alignY }) => `x${alignX}Y${alignY}`,
		R.compose(
			R.prop("groups"),
			R.match(/x(?<alignX>Min|Mid|Max)Y(?<alignY>Min|Mid|Max)/),
		),
	);
	const preserveAspectRatioLens = [
		"frame",
		L.props("aspect", "alignX", "alignY"),
		L.iso(
			(frame) =>
				frame.aspect
					? `x${frame.alignX}Y${frame.alignY} ${frame.aspect}`
					: "none",
			R.compose(
				R.ifElse(
					R.prop("noAspect"),
					R.compose(R.objOf("aspect"), R.prop("noAspect")),
					R.props(["alignX", "alignY", "aspect"]),
				),
				R.prop("groups"),
				R.match(
					/^((?<noAspect>none)|x(?:(?<alignX>Min|Mid|Max)Y(?<alignY>Min|Mid|Max) (?<aspect>meet|slice)))$/,
				),
			),
		),
	];
	const preserveAspectRatio = read(preserveAspectRatioLens, camera);

	const viewBoxLens = L.reread((cam) => {
		return `${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.focus.y - (cam.plane.y / 2) * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.plane.x * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.plane.y * Math.exp(-cam.focus.z))}`;
	});
	const viewBox = view(viewBoxLens, camera);

	const viewBoxPathLens = L.reread((cam) => {
		return `M${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))},
		${numberSvgFormat.format(cam.focus.y - (cam.plane.y / 2) * Math.exp(-cam.focus.z))}
		H${numberSvgFormat.format(cam.focus.x + (cam.plane.x / 2) * Math.exp(-cam.focus.z))}
		V${numberSvgFormat.format(cam.focus.y + (cam.plane.y / 2) * Math.exp(-cam.focus.z))}
		H${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))}z`;
	});

	const viewBoxPath = view(viewBoxPathLens, camera);

	const cameraToViewbox = (camera) => {
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

	const frameBoxLens = L.reread((camera) => {
		const { minX, minY, width, height } = U.scaleViewBox(
			cameraToViewbox(camera),
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

	const boxPathLens = L.reread(
		({ minX, minY, width, height }) =>
			`M${numberSvgFormat.format(minX)},${numberSvgFormat.format(minY)}h${numberSvgFormat.format(width)}v${numberSvgFormat.format(height)}h${numberSvgFormat.format(-width)}z`,
	);

	const frameBoxObject = read(frameBoxLens, camera);
	const frameBoxScreen = read([frameBoxLens, "screenSpaceAligned"], camera);
	const frameBoxPath = read(
		[frameBoxLens, "screenSpaceAligned", boxPathLens],
		camera,
	);

	const cameraRotationTransformLens = L.reread(
		(c) => `rotate(${c.focus.w}, ${c.focus.x}, ${c.focus.y})`,
	);

	const rotationTransform = read(cameraRotationTransformLens, camera);
	const rotationTransformFunction = read(
		L.reread((c) =>
			L.iso(
				({ x, y }) => {
					const cos = Math.cos((-c.focus.w / 180) * Math.PI);
					const sin = Math.sin((-c.focus.w / 180) * Math.PI);

					const dx = x - c.focus.x;
					const dy = y - c.focus.y;

					return {
						x: c.focus.x + dx * cos + dy * sin,
						y: c.focus.y + dx * -sin + dy * cos,
					};
				},
				({ x, y }) => {
					const cos = Math.cos((c.focus.w / 180) * Math.PI);
					const sin = Math.sin((c.focus.w / 180) * Math.PI);

					const dx = x - c.focus.x;
					const dy = y - c.focus.y;

					return {
						x: c.focus.x + dx * cos + dy * sin,
						y: c.focus.y + dx * -sin + dy * cos,
					};
				},
			),
		),
		camera,
	);

	const cameraScaleLens = L.reread((c) => Math.exp(-c.focus.z));
	const cameraScale = read(cameraScaleLens, camera);
	const cameraOrientationLens = L.reread((c) => c.focus.w);
	const cameraOrientation = read(cameraOrientationLens, camera);

	const affineLens = (dim, xDim, yDim, angleDim) => {
		if (dim == xDim) {
			return L.lens(
				(o) => {
					const rad = -Geo.degree2rad(o[angleDim]);
					const cos = Math.cos(rad);
					const sin = Math.sin(rad);
					return cos * o[xDim] + sin * o[yDim];
				},
				(n, o) => {
					const rad = -Geo.degree2rad(o[angleDim]);
					const cos = Math.cos(rad);
					const sin = Math.sin(rad);

					const oldX = cos * o[xDim] + sin * o[yDim];
					const delta = n - oldX;

					return {
						...o,
						[xDim]: cos * delta + o[xDim],
						[yDim]: sin * delta + o[yDim],
					};
				},
			);
		} else if (dim == yDim) {
			return L.lens(
				(o) => {
					const rad = -Geo.degree2rad(o[angleDim]);
					const cos = Math.cos(rad);
					const sin = Math.sin(rad);
					return -sin * o[xDim] + cos * o[yDim];
				},
				(n, o) => {
					const rad = -Geo.degree2rad(o[angleDim]);
					const cos = Math.cos(rad);
					const sin = Math.sin(rad);

					const oldY = -sin * o[xDim] + cos * o[yDim];
					const delta = n - oldY;

					return {
						...o,
						[xDim]: -sin * delta + o[xDim],
						[yDim]: cos * delta + o[yDim],
					};
				},
			);
		} else {
			throw "dim must be xDim or yDim";
		}
	};

	const cameraZoom = view(["focus", "z", numberLens], camera);
	const cameraZoomFormatted = view([numberLens], cameraZoom);
	const cameraAutoPadding = view(["frame", "autoPadding"], camera);

	const cameraX = view(["focus", "x"], camera);
	const cameraY = view(["focus", "y"], camera);
	const cameraXFormatted = view([numberLens], cameraX);
	const cameraYFormatted = view([numberLens], cameraY);
	const cameraAngle = view(["focus", "w", numberLens], camera);
	const cameraAngleFormatted = view([numberLens], cameraAngle);
	const cameraXScreen = view(
		["focus", affineLens("x", "x", "y", "w")],
		camera,
	);
	const cameraYScreen = view(
		["focus", affineLens("y", "x", "y", "w")],
		camera,
	);

	const cameraXScreenFormatted = view(
		["focus", affineLens("x", "x", "y", "w"), numberLens],
		camera,
	);
	const cameraYScreenFormatted = view(
		["focus", affineLens("y", "x", "y", "w"), numberLens],
		camera,
	);

	const zoomDelta = view(["focus", L.setter(Cam.zoomWithPivot)], camera);

	const cameraZoomFrameLens = [
		L.setter((frame, oldCamera) => {
			const rad = Geo.degree2rad(-frame.angle);
			const cos = Math.cos(rad);
			const sin = Math.sin(rad);

			const oldFrameX = oldCamera.plane.x * Math.exp(-oldCamera.focus.z);
			const oldFrameY = oldCamera.plane.y * Math.exp(-oldCamera.focus.z);
			const dz = Math.log(
				Math.min(
					oldFrameY / Math.abs(frame.size.y),
					oldFrameX / Math.abs(frame.size.x),
				),
			);

			return {
				...oldCamera,
				focus: {
					x:
						frame.start.x +
						(cos * frame.size.x + sin * frame.size.y) / 2,
					y:
						frame.start.y +
						(-sin * frame.size.x + cos * frame.size.y) / 2,
					z: R.clamp(-5, 5, oldCamera.focus.z + dz),
					w: -frame.angle,
				},
			};
		}),
	];

	const panMovementLens = [
		"focus",
		L.props("x", "y"),
		L.lens(R.always({ x: 0, y: 0 }), (delta, { x, y }) => {
			return {
				x: x + delta.x,
				y: y + delta.y,
			};
		}),
	];

	const rotateMovementLens = [
		"focus",
		L.props("w", "x", "y"),
		L.lens(
			R.compose(
				R.assoc("dw", 0),
				R.zipObj(["px", "py"]),
				R.props(["x", "y"]),
			),
			Cam.rotateWithPivot,
		),
	];

	const zoomMovementLens = [
		"focus",
		L.props("z", "x", "y"),
		L.lens(
			R.compose(
				R.assoc("dz", 0),
				R.zipObj(["px", "py"]),
				R.props(["x", "y"]),
			),
			Cam.zoomWithPivot,
		),
	];

	const drawing = atom({});

	const tool = atom("pen");
	const nodes = view(["nodes", L.valueOr([{ x: 200, y: 100 }])], drawing);
	const textes = view(["textes", L.valueOr([])], drawing);
	const textBoxes = view(["textBoxes", L.valueOr([])], drawing);
	const guides = view(["guides", L.valueOr([])], drawing);
	const axis = view(
		[
			"axis",
			L.valueOr({
				start: { x: 0, y: 0 },
				size: { x: 200, y: -200 },
				angle: 0,
			}),
		],
		drawing,
	);
	const drawings = view(["drawings", L.valueOr([])], drawing);
	const drafts = atom([]);
	const rubberBand = atom(undefined);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);

	const newDrawing = view(
		[L.appendTo, L.setter((n, o) => (n.length > 1 ? n : o))],
		drawings,
	);
	const newGuide = view([L.appendTo], guides);
	const newAxis = view(L.identity, axis);

	function calculateBoundingBox(padding, entities, lens) {
		const branch = L.branch(lens);
		const allEntities = combine(entities);

		const minX = traverse([branch, "x"], L.minimum, allEntities).map(
			R.compose(R.subtract(R.__, padding), R.min(0), R.defaultTo(0)),
		);
		const maxX = traverse([branch, "x"], L.maximum, allEntities).map(
			R.compose(R.add(padding), R.max(0), R.defaultTo(0)),
		);
		const minY = traverse([branch, "y"], L.minimum, allEntities).map(
			R.compose(R.subtract(R.__, padding), R.min(0), R.defaultTo(0)),
		);
		const maxY = traverse([branch, "y"], L.maximum, allEntities).map(
			R.compose(R.add(padding), R.max(0), R.defaultTo(0)),
		);

		return combine({
			minX,
			maxX,
			minY,
			maxY,
		});
	}

	const extension = calculateBoundingBox(
		100,
		{ nodes, drawings, axis, textes, textBoxes },
		{
			nodes: L.elems,
			drawings: [L.elems, L.elems],
			axis: [
				L.ifElse(
					R.is(Object),
					L.pick({
						start: "start",
						a: ({ start, size, angle }) =>
							Geo.rotatePivotDegree(start, angle, {
								x: start.x + size.x,
								y: start.y + size.y,
							}),
						b: ({ start, size, angle }) =>
							Geo.rotatePivotDegree(start, angle, {
								x: start.x,
								y: start.y + size.y,
							}),
						c: ({ start, size, angle }) =>
							Geo.rotatePivotDegree(start, angle, {
								x: start.x + size.x,
								y: start.y,
							}),
					}),
					R.always({}),
				),
				L.values,
			],
			textes: [L.elems, L.props("x", "y")],
			textBoxes: [
				L.elems,
				L.ifElse(
					R.is(Object),
					L.pick({
						start: "start",
						a: ({ start, size, angle }) =>
							Geo.rotatePivotDegree(start, angle, {
								x: start.x + size.x,
								y: start.y + size.y,
							}),
						b: ({ start, size, angle }) =>
							Geo.rotatePivotDegree(start, angle, {
								x: start.x,
								y: start.y + size.y,
							}),
						c: ({ start, size, angle }) =>
							Geo.rotatePivotDegree(start, angle, {
								x: start.x + size.x,
								y: start.y,
							}),
					}),
					R.always({}),
				),
				L.values,
			],
		},
	);

	function rotatedBounds(degree, rect) {
		const rectCenterX = (rect.maxX + rect.minX) / 2;
		const rectCenterY = (rect.maxY + rect.minY) / 2;
		const halfWidth = (rect.maxX - rect.minX) / 2;
		const halfHeight = (rect.maxY - rect.minY) / 2;

		const c1 = Geo.rotateDegree(degree, { x: halfWidth, y: halfHeight });
		const c2 = Geo.rotateDegree(degree, { x: -halfWidth, y: halfHeight });
		const c3 = Geo.rotateDegree(degree, { x: halfWidth, y: -halfHeight });
		const c4 = Geo.rotateDegree(degree, { x: -halfWidth, y: -halfHeight });

		const halfWidthRot = Math.max(
			Math.abs(c1.x),
			Math.abs(c2.x),
			Math.abs(c3.x),
			Math.abs(c4.x),
		);
		const halfHeightRot = Math.max(
			Math.abs(c1.y),
			Math.abs(c2.y),
			Math.abs(c3.y),
			Math.abs(c4.y),
		);

		return {
			angle: degree,
			minX: rectCenterX - halfWidthRot,
			maxX: rectCenterX + halfWidthRot,
			minY: rectCenterY - halfHeightRot,
			maxY: rectCenterY + halfHeightRot,
		};
	}

	function rotatedClamp(rect, pos, padding) {
		const rectCenterX = (rect.maxX + rect.minX) / 2;
		const rectCenterY = (rect.maxY + rect.minY) / 2;
		const halfWidthRot = (rect.maxX - rect.minX) / 2 + padding;
		const halfHeightRot = (rect.maxY - rect.minY) / 2 + padding;

		const posRelX = pos.x - rectCenterX;
		const posRelY = pos.y - rectCenterY;

		const posRot = Geo.rotateDegree(-rect.angle, {
			x: posRelX,
			y: posRelY,
		});
		const posRotClampedX = R.clamp(-halfWidthRot, +halfWidthRot, posRot.x);
		const posRotClampedY = R.clamp(
			-halfHeightRot,
			+halfHeightRot,
			posRot.y,
		);

		const posClamped = Geo.rotateDegree(rect.angle, {
			x: posRotClampedX,
			y: posRotClampedY,
		});

		return {
			x: rectCenterX + posClamped.x,
			y: rectCenterY + posClamped.y,
		};
	}

	const cameraBounds = read(
		({ c, e }) => {
			return rotatedBounds(c.focus.w, e);
		},
		combine({ c: camera, e: extension }),
	);

	const zoomFrame = view(cameraZoomFrameLens, camera);
	const panMovement = view(panMovementLens, camera);
	const rotateMovement = view(rotateMovementLens, camera);
	const zoomMovement = view(zoomMovementLens, camera);

	const tools = {
		select: {
			name: "Select",
			component: RubberBand,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				rotationTransform,
				cameraOrientation,
			},
		},
		create: {
			name: "Create",
			component: Creator,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				newNode,
				rotationTransform,
				cameraScale,
			},
		},
		text: {
			name: "Text Line",
			component: TextLineTyper,
			parameters: {
				textes,
				clientToCanvas,
				frameBoxPath,
				rotationTransform,
				cameraScale,
				cameraOrientation,
			},
		},
		text_box: {
			name: "Text Box",
			component: TextBoxTyper,
			parameters: {
				textes,
				clientToCanvas,
				frameBoxPath,
				rotationTransform,
				cameraScale,
				cameraOrientation,
				textBoxes,
			},
		},
		lasso: {
			name: "Lasso",
			component: Lasso,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				cameraScale,
				rotationTransform,
			},
		},
		pen: {
			name: "Pen",
			component: Pen,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				cameraScale,
				rotationTransform,
				newDrawing,
			},
		},
		polygon: {
			name: "Polygon",
			component: Polygon,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				cameraScale,
				rotationTransform,
			},
		},
		spline: {
			name: "Spline",
			component: Spline,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				cameraScale,
				rotationTransform,
			},
		},
		shape: {
			name: "Shape",
			component: Shape,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				cameraScale,
				rotationTransform,
			},
		},
		magnifier: {
			name: "Magnifier",
			component: Magnifier,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				zoomDelta,
				zoomFrame,
				rotationTransform,
				rotationTransformFunction,
				cameraOrientation,
				cameraScale,
			},
		},
		guides: {
			name: "Guides",
			component: GuideLiner,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				rotationTransform,
				frameBoxObject,
				newGuide,
				cameraScale,
			},
		},
		axis: {
			name: "Axis",
			component: Axis,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				rotationTransform,
				newAxis,
				cameraScale,
				cameraOrientation,
			},
		},
		pan: {
			name: "Pan",
			component: Pan,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				panMovement,
			},
		},
		rotate: {
			name: "Rotate",
			component: Rotate,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				rotateMovement,
				rotationTransform,
				cameraScale,
			},
		},
		zoom: {
			name: "Zoom",
			component: Zoom,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				zoomMovement,
				rotationTransform,
				cameraScale,
			},
		},
	};

	const toolGroups = [
		["select", "lasso"],
		["magnifier", "pan", "rotate", "zoom"],
		["pen", "create", "text", "text_box", "polygon", "spline", "shape"],
		["axis", "guides"],
	];

	const makeSquareLens = L.lens(R.identity, (n, o) => ({
		...n,
		x: Math.min(n.x, n.y),
		y: Math.min(n.x, n.y),
	}));

	const keepAspectLens = (xprop, yprop) =>
		L.lens(R.identity, (n, o) => {
			const oldAspect = yprop(o) / xprop(o);

			return {
				...n,
				x: xprop(n),
				y: xprop(n) * oldAspect,
			};
		});

	const makeXSquareLens = L.lens(R.identity, (n, o) => ({
		...n,
		x: n.y,
		y: n.y,
	}));

	const aspect = view(
		[
			"frame",
			L.props("alignX", "alignY", "aspect"),
			"aspect",
			L.defaults("none"),
		],
		camera,
	);
	const planeWidth = view(["plane", "x"], camera);
	const planeHeight = view(["plane", "y"], camera);
	const alignX = view(["frame", "alignX", L.normalize(U.capitalize)], camera);
	const alignY = view(["frame", "alignY", L.normalize(U.capitalize)], camera);
	const alignCombi = view(aspectRatioAlignLens, combine({ alignX, alignY }));
	const autosize = view(["plane", "autosize"], camera);
	const alignments = ["Min", "Mid", "Max"];

	const cameraJson = failableView(
		L.inverse([
			L.alternatives(
				L.dropPrefix(
					"// Or try to edit this Json (only edits that keep the structure valid are possible)\n",
				),
				L.identity,
			),
			L.json({ space: "  " }),
			L.ifElse(
				U.isPlainObject,
				L.identity,
				L.getter(R.always(new Error("fooo"))),
			),
		]),
		camera,
	);

	const drawingJson = failableView(
		L.inverse([
			L.alternatives(
				L.dropPrefix(
					"// Or try to edit this Json (only edits that keep the structure valid are possible)\n",
				),
				L.identity,
			),
			L.json({ space: "  " }),
			L.ifElse(
				U.isPlainObject,
				L.identity,
				L.getter(R.always(new Error("fooo"))),
			),
		]),
		drawing,
	);

	// This is needed to prevent a ceil/floor feedback loop between integer scroll positions of scrollbars and camera position
	const integerLens = L.lens(
		(x) => Math.round(x),
		(newV, oldV) => Math.round(newV) + (oldV - Math.round(oldV)),
	);

	const scrollWindowSize = view(
		[
			L.lens(R.prop("frame"), (newSize) => ({
				frame: newSize,
				plane: newSize,
			})),
		],
		combine({
			plane: view(
				[
					"plane",
					L.ifElse(
						R.prop("autosize"),
						L.identity,
						L.lens(R.identity, (_, o) => o),
					),
					L.props("x", "y"),
				],
				camera,
			),
			frame: view(["frame", "size"], camera),
		}),
	);

	const cameraInBounds = view(
		L.lens(
			({ x, y, s, w, b }) => {
				const rot = Geo.rotatePivotXYDegree(
					(b.minX + b.maxX) / 2,
					(b.minY + b.maxY) / 2,
					b.angle,
					{ x, y },
				);

				return {
					x: (rot.x - b.minX) / s - w.x / 2,
					y: (rot.y - b.minY) / s - w.y / 2,
				};
			},
			({ x, y }, { s, w, b }) => {
				const rot = Geo.rotatePivotXYDegree(
					(b.minX + b.maxX) / 2,
					(b.minY + b.maxY) / 2,
					-b.angle,
					{
						x: (x + w.x / 2) * s + b.minX,
						y: (y + w.y / 2) * s + b.minY,
					},
				);

				return {
					x: rot.x,
					y: rot.y,
				};
			},
		),
		combine(
			{
				x: cameraX,
				y: cameraY,
				s: cameraScale,
				w: scrollWindowSize,
				b: cameraBounds,
			},
			{ x: true, y: true },
		),
	);

	const centerLens = L.reread(({ minX, maxX, minY, maxY }) => ({
		x: (minX + maxX) / 2,
		y: (minY + maxY) / 2,
	}));
	const boundsCenter = view(centerLens, cameraBounds);

	const scrollPosition = view(
		[
			L.pick({ x: ["x", integerLens], y: ["y", integerLens] }),
			L.setter((newScroll, old) => ({
				x:
					(newScroll.atMinX && old.x < newScroll.x) ||
					(newScroll.atMaxX && old.x > newScroll.x)
						? old.x
						: newScroll.x,
				y:
					(newScroll.atMinY && old.y < newScroll.y) ||
					(newScroll.atMaxY && old.y > newScroll.y)
						? old.y
						: newScroll.y,
			})),
		],
		cameraInBounds,
	);
</script>

<fieldset>
	<legend>Frame</legend>

	<div>
		<label
			><input
				type="checkbox"
				bind:checked={autosize.value}
			/>Autofit</label
		>

		<label
			><input
				type="checkbox"
				value={true}
				bind:checked={debugFrames.value}
			/> Show Debug Frames</label
		>
	</div>

	<div>
		<label class="number-picker"
			>Camera Width:<input
				type="range"
				min="100"
				max="1500"
				bind:value={planeWidth.value}
				disabled={autosize.value}
			/></label
		><br />
		<label class="number-picker"
			>Camera Height:<input
				type="range"
				min="100"
				max="1500"
				bind:value={planeHeight.value}
				disabled={autosize.value}
			/></label
		>
	</div>

	<div>
		Aspect:
		<label
			><input
				type="radio"
				value="meet"
				bind:group={aspect.value}
				disabled={autosize.value}
			/> meet</label
		>
		<label
			><input
				type="radio"
				value="slice"
				bind:group={aspect.value}
				disabled={autosize.value}
			/> slice</label
		>
		<label
			><input
				type="radio"
				value="none"
				bind:group={aspect.value}
				disabled={autosize.value}
			/> none</label
		>
	</div>
	<!-- <div>
		Align-X:
		{#each alignments as a (a)}
			<label
				><input type="radio" value={a} bind:group={alignX.value} />
				{a}</label
			>
		{/each}
	</div>
	<div>
		Align-Y:
		{#each alignments as a (a)}
			<label
				><input type="radio" value={a} bind:group={alignY.value} />
				{a}</label
			>
		{/each}
	</div> -->

	Alignment:
	<div class="alignment-grid">
		{#each alignments as ay (ay)}
			{#each alignments as ax (ax)}
				<label tabindex="-1" class="alignment-grid-label"
					><input
						disabled={autosize.value}
						type="radio"
						value={`x${ax}Y${ay}`}
						bind:group={alignCombi.value}
					/>
					x{ax}Y{ay}</label
				>
			{/each}
		{/each}
	</div>

	Auto-Padding:
	<div>
		<label
			><input type="checkbox" bind:checked={cameraAutoPadding.value} /> Extend
			Scrollbars</label
		>
	</div>
</fieldset>

<fieldset>
	<legend>Tools</legend>

	<div class="tool-bar">
		<button
			type="button"
			onclick={() => {
				nodes.value = [];
				drawings.value = [];
				guides.value = [];
				textes.value = [];
				textBoxes.value = [];
				axis.value = undefined;
				update(
					L.set(["focus", L.props("x", "y"), L.values], 0),
					camera,
				);
			}}>Clear</button
		>
		{#each toolGroups as g}
			<hr class="tool-bar-sep" />
			{#each g as t}
				<label class="button tool-button"
					><input
						class="tool-button-radio"
						type="radio"
						bind:group={tool.value}
						value={t}
					/>
					{tools[t].name}</label
				>
			{/each}
		{/each}
	</div>
</fieldset>

<div class="prevent-selection">
	<Scroller
		extraScrollPadding={cameraAutoPadding}
		{scrollPosition}
		contentSize={view(
			({ s, w, b }) => ({
				x: (b.maxX - b.minX) / s,
				y: (b.maxY - b.minY) / s,
			}),
			combine({
				s: cameraScale,
				b: cameraBounds,
			}),
		)}
		{scrollWindowSize}
	>
		<svg
			bind:this={svgElement.value}
			use:Cam.bindEvents={camera}
			viewBox={viewBox.value}
			preserveAspectRatio={preserveAspectRatio.value}
		>
			<g class:hidden={!debugFrames.value} pointer-events="none">
				<path
					d={viewBoxPath.value}
					class="view-box"
					stroke-opacity="0.5"
					stroke="magenta"
					vector-effect="non-scaling-stroke"
					stroke-width="8px"
					fill="#ddffee"
				/>
				<path
					d={frameBoxPath.value}
					stroke="#ffaaaa"
					fill="none"
					vector-effect="non-scaling-stroke"
					stroke-width="4px"
					shape-rendering="crispEdges"
				/>
			</g>

			<g pointer-events="none">
				<Bounds
					{extension}
					{cameraBounds}
					{rotationTransform}
					{cameraScale}
				/>
				<Nodes {nodes} {rotationTransform} {cameraScale} />

				<Drawings {drawings} {rotationTransform} {cameraScale} />

				<TextBoxes
					{textBoxes}
					{clientToCanvas}
					{frameBoxPath}
					{rotationTransform}
					{cameraScale}
					{cameraOrientation}
				/>

				<TextLines
					{textes}
					{clientToCanvas}
					{frameBoxPath}
					{rotationTransform}
					{cameraScale}
					{cameraOrientation}
				/>

				<Guides
					{guides}
					{frameBoxObject}
					{rotationTransform}
					{cameraScale}
				/>
				<ShowAxis
					{axis}
					{frameBoxObject}
					{rotationTransform}
					{cameraScale}
				/>

				<Origin {rotationTransform} {cameraScale} />
			</g>

			<svelte:component
				this={tools[tool.value].component}
				{...tools[tool.value].parameters}
			></svelte:component>
		</svg>
		<div class="scroller-hud">
			<input
				type="range"
				bind:value={cameraZoom.value}
				min="-5"
				max="5"
				step="0.01"
			/>
		</div>
	</Scroller>
</div>

<fieldset>
	<legend>Focus</legend>
	<div class="button-bar">
		<button
			type="button"
			onclick={(_) => {
				update(L.set(["focus", L.values], 0), camera);
			}}>Reset all to zero</button
		><button
			type="button"
			onclick={(_) => {
				update(
					L.set(["focus", L.props("x", "y")], { x: 0, y: 0 }),
					camera,
				);
			}}>re-Center to Origin</button
		><button
			type="button"
			onclick={(_) => {
				update(
					L.set(["focus", L.props("x", "y")], boundsCenter.value),
					camera,
				);
			}}>re-Center Content</button
		><button
			type="button"
			onclick={(_) => {
				update(L.set(["focus", "w"], 0), camera);
			}}>re-Orient Upwards</button
		><button
			type="button"
			onclick={(_) => {
				update(
					L.set(["focus", L.props("z", "x", "y", "w")], {
						x:
							(cameraBounds.value.maxX +
								cameraBounds.value.minX) /
							2,
						y:
							(cameraBounds.value.maxY +
								cameraBounds.value.minY) /
							2,
						z: -Math.max(
							Math.log(
								cameraBounds.value.maxX -
									cameraBounds.value.minX,
							) - Math.log(camera.value.plane.x),
							Math.log(
								cameraBounds.value.maxY -
									cameraBounds.value.minY,
							) - Math.log(camera.value.plane.y),
						),
						w: cameraBounds.value.angle,
					}),
					camera,
				);
			}}>re-Fit to Content</button
		>
	</div>

	<hr />

	<div class="form-grid">
		<label class="number-picker"
			><span>X:</span>
			<input
				type="range"
				bind:value={cameraXFormatted.value}
				min={cameraBounds.value.minX}
				max={cameraBounds.value.maxX}
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraXFormatted.value = 0;
				}}>reset</button
			>
			<output>{cameraXFormatted.value}</output>
		</label>
		<label class="number-picker"
			><span>Y:</span>
			<input
				type="range"
				bind:value={cameraYFormatted.value}
				min={cameraBounds.value.minY}
				max={cameraBounds.value.maxY}
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraYFormatted.value = 0;
				}}>reset</button
			>
			<output>{cameraYFormatted.value}</output>
		</label>
		<label class="number-picker"
			><span>Zoom:</span>
			<input
				type="range"
				bind:value={cameraZoomFormatted.value}
				min="-5"
				max="5"
				step="0.01"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraZoomFormatted.value = 0;
				}}>reset</button
			>
			<output>{cameraZoomFormatted.value}</output>
		</label>
		<label class="number-picker"
			><span>Rotation:</span>
			<input
				type="range"
				bind:value={cameraAngleFormatted.value}
				min="-180"
				max="180"
				step="0.01"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraAngleFormatted.value = 0;
				}}>reset</button
			>
			<output>{cameraAngleFormatted.value}</output>
		</label>

		<hr />
		<label class="number-picker"
			><span>Scroll X:</span>
			<input
				type="range"
				bind:value={cameraXScreenFormatted.value}
				min={-400}
				max={400}
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraXScreenFormatted.value = 0;
				}}>reset</button
			>
			<output>{cameraXScreenFormatted.value}</output>
		</label>
		<label class="number-picker"
			><span>Scroll Y:</span>
			<input
				type="range"
				bind:value={cameraYScreenFormatted.value}
				min={-400}
				max={400}
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraYScreenFormatted.value = 0;
				}}>reset</button
			>
			<output>{cameraYScreenFormatted.value}</output>
		</label>
	</div>
</fieldset>

<h3>Camera Parameter</h3>
<textarea use:bindValue={cameraJson.stableAtom}></textarea>

<h3>Drawing</h3>
<textarea use:bindValue={drawingJson.stableAtom}></textarea>

<style>
	.scroller-hud {
		grid-area: 1/1/1/1;
		place-self: end;
		z-index: 100;
		background: none;
		font-size: 0.7em;
		margin: 0.5em 1em;
		--accent-color: #aa4466;
		--accent-color-light: #cc4466;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}

	.prevent-selection {
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}

	legend {
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}

	svg {
		display: block;
		grid-area: 1/1/1/1;
		place-self: stretch;
		width: 100%;
		height: 100%;
		position: absolute;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}

	textarea {
		min-height: 30em;
	}

	.alignment-grid {
		display: grid;
		grid-template-rows: 1fr 1fr 1fr;
		grid-template-columns: 1fr 1fr 1fr;
		width: max-content;
		gap: 2px;
		font-family: monospace;
		user-select: none;
	}

	.alignment-grid-label:has(:focus-visible) {
		outline: 2px solid #dd4e40;
	}

	.alignment-grid-label:hover {
		color: #888;
		background: #f8f8f8;
	}

	.alignment-grid-label:active {
		color: #666;
		background: #e0e0e0;
	}

	.alignment-grid-label:has(:checked) {
		background: #dd4e40;
		color: #fff;
	}

	.alignment-grid-label:has(:checked):hover {
		background: #ed5e50;
		color: #fff;
	}

	.alignment-grid-label:has(:checked):active {
		background: #cd3e30;
		color: #fff;
	}

	.alignment-grid-label:has(:disabled) {
		background: #ddd;
		color: #aaa;
		cursor: default;
	}

	.alignment-grid-label:has(:disabled):hover {
		background: #ddd;
		color: #aaa;
	}

	.alignment-grid-label {
		color: #666;
		background: #eee;
		padding: 4px;
		text-align: center;
		cursor: pointer;
	}

	.alignment-grid-label > input {
		background: transparent;
		color: transparent;
		border: none;
		opacity: 0;
		width: 0;
		height: 0;
		padding: 0;
		display: block;
		position: absolute;
	}

	.hidden {
		display: none;
	}

	.form-grid {
		display: grid;
		grid-template-columns: max-content max-content max-content max-content;
		grid-auto-rows: 1fr;
		gap: 0.25em;
	}

	.form-grid > hr {
		grid-column: 1 / -1;
		width: 100%;
		height: 0;
		height: 0;
		align-self: center;
		border: none;
		border-top: 1px solid #aaa;
	}

	.form-grid > .number-picker {
		grid-column: span 4;
		display: grid;
		grid-template-columns: subgrid;
		grid-template-rows: 1fr;
	}

	.tool-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		align-items: stretch;
		font-family: monospace;
	}

	.button-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
	}

	.tool-bar-sep {
		background: #aaa;
		flex: 2px 0 0;
		width: auto;
		height: auto;
		align-self: stretch;
		justify-self: start;
		border: none;
		margin: 2px;
	}

	.tool-button {
		background: #555;
	}

	.tool-button:has(:checked) {
		background: #cd3e30;
		color: #fff;
	}

	.tool-button-radio {
		background: transparent;
		color: transparent;
		border: none;
		opacity: 0;
		width: 0;
		height: 0;
		padding: 0;
		display: block;
		position: absolute;
	}
</style>
