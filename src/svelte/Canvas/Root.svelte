<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as Geo from "../geometry";
	import * as U from "../utils";
	import Navigator from "./camera/Navigator.svelte";
	import * as CamNavigation from "./camera/navigation";
	import { cameraAsViewbox } from "./camera/functions";
	import {
		frameBoxLens,
		panMovementLens,
		rotateMovementLens,
		zoomMovementLens,
	} from "./camera/lenses";

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
	import { constructLenses } from "./camera/live.js";

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
	import NodeCreator from "./tools/NodeCreator.svelte";
	import EdgeCreator from "./tools/EdgeCreator.svelte";
	import Lasso from "./tools/Lasso.svelte";
	import Pen from "./tools/Pen.svelte";
	import Polygon from "./tools/Polygon.svelte";
	import Spline from "./tools/Spline.svelte";
	import Shape from "./tools/Shape.svelte";
	import Shapes from "./tools/Shapes.svelte";

	import RubberBand from "./tools/RubberBand.svelte";
	import Nodes from "./tools/Nodes.svelte";
	import Edges from "./tools/Edges.svelte";
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
	import Grid from "./tools/Grid.svelte";
	import Axis from "./tools/Axis.svelte";
	import ShowAxis from "./tools/ShowAxis.svelte";
	import Pan from "./tools/Pan.svelte";
	import Rotate from "./tools/Rotate.svelte";
	import Zoom from "./tools/Zoom.svelte";

	const svgElement = atom(null);
	const cameraTow = atom(null);
	let currentToolElement = atom(null);

	const debugFrames = atom(false);
	const showBounds = atom(false);

	const allTabs = atom({
		current: 0,
		tabs: [
			{
				document: {
					content: {
						axis: {
							start: { x: 0, y: 0 },
							size: { x: 200, y: -200 },
							angle: 0,
						},
						nodes: [
							{ x: 200, y: 100 },
							{
								x: 266,
								y: -217,
							},
							{
								x: -110,
								y: -10,
							},
						],
						textes: [
							{
								x: 119.35297908638951,
								y: -70.289311950847,
								fontSize: 0.8922579558824082,
								content: "Hello World",
							},
						],
					},
				},
				camera: { x: 100, y: -50, z: 0, w: 20 },
			},
		],
	});

	const cameraSettings = atom({
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

	const cameraFocus = view(
		[
			L.choose(({ current, docs }) => [
				"tabs",
				L.defaults([]),
				L.choices(current, L.appendTo),
				"camera",
				L.valueOr({ x: 0, y: 0, z: 0, w: 0 }),
			]),
		],
		allTabs,
	);

	const camera = view(
		[
			L.pick({
				focus: "focus",
				frame: ["settings", "frame"],
				plane: ["settings", "plane"],
			}),
			L.valueOr({
				focus: { x: 0, y: 0, z: 0, w: 0 },
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
			}),
		],
		combine({ focus: cameraFocus, settings: cameraSettings }),
	);

	const {
		clientToCanvas,
		canvasToClient,
		clientToPage,
		pageToClient,
		worldPageIso,
		worldClientIso,
	} = constructLenses(svgElement, camera);

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

	const zoomDelta = view(
		["focus", L.setter(CamNavigation.zoomWithPivot)],
		camera,
	);

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

	const canvasDocument = view(
		[
			L.choose(({ current, docs }) => ["tabs", current, "document"]),
			L.valueOr({}),
		],
		allTabs,
	);

	const newTab = view(
		L.setter((n, prev) => ({
			tabs: [...prev.tabs, n],
			current: prev.tabs.length,
		})),
		allTabs,
	);

	const tabIds = read(
		["tabs", L.valueOr([]), L.reread(R.compose(R.range(0), R.length))],
		allTabs,
	);

	const closeTab = view(
		L.setter((r, old) => ({
			current:
				old.current > r ? Math.max(0, old.current - 1) : old.current,
			tabs: R.addIndex(R.filter)((v, i) => i !== r, old.tabs),
		})),
		allTabs,
	);

	const currentTabId = view("current", allTabs);

	const tool = atom("pen");
	const currentDocumentContent = view(["content"], canvasDocument);

	const nodes = view(["nodes", L.define([])], currentDocumentContent);
	const edges = view(["edges", L.define([])], currentDocumentContent);
	const textes = view(["textes", L.defaults([])], currentDocumentContent);
	const newText = view(L.appendTo, textes);
	const textBoxes = view(
		["textBoxes", L.defaults([])],
		currentDocumentContent,
	);
	const newTextBox = view(L.appendTo, textBoxes);
	const guides = view(["guides", L.defaults([])], currentDocumentContent);
	const axis = view(["axis"], currentDocumentContent);
	const drawings = view(["drawings", L.defaults([])], currentDocumentContent);
	const shapes = view(["shapes", L.defaults([])], currentDocumentContent);
	const rubberBand = atom(undefined);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);
	const newEdge = view([L.appendTo, L.required("x", "y")], edges);
	const newEdgeNode = view(
		L.setter(({ source, newTarget }, { e, n }) => ({
			e: [...e, { source, target: n.length }],
			n: [...n, newTarget],
		})),
		combine({ e: edges, n: nodes }),
	);

	const newDrawing = view(
		[L.appendTo, L.setter((n, o) => (n.length > 1 ? n : o))],
		drawings,
	);
	const newShape = view([L.appendTo], shapes);
	const newGuide = view([L.appendTo], guides);
	const newAxis = view(L.identity, axis);

	function calculateBoundingBox(padding, allEntities, lens) {
		const branch = L.branch(lens);

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

	const extension = calculateBoundingBox(100, currentDocumentContent, {
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
		shapes: [
			L.elems,
			L.ifElse(
				R.is(Object),
				[
					"placement",
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
				],
				R.always({}),
			),
			L.values,
		],
	});

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
		createNode: {
			name: "Node",
			component: NodeCreator,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				newNode,
				rotationTransform,
				cameraScale,
				cameraTow,
			},
		},
		createEdge: {
			name: "Edge",
			component: EdgeCreator,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				rotationTransform,
				cameraScale,
				cameraTow,
				nodes,
				newEdge,
				newEdgeNode,
			},
		},
		text: {
			name: "Text Line",
			component: TextLineTyper,
			parameters: {
				newText,
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
				newTextBox,
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
				newDrawing,
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
				cameraOrientation,
				newShape,
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
		["pen", "polygon", "spline"],
		["createNode", "createEdge"],
		["text", "text_box", "shape"],
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

	const canvasJson = failableView(
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
		canvasDocument,
	);

	// This is needed to prevent a ceil/floor feedback loop between integer scroll positions of scrollbars and camera position
	const integerLens = L.lens(
		(x) => Math.floor(x),
		(newV, oldV) => Math.ceil(newV) + (oldV - Math.floor(oldV)),
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

	const scrollContentSize = view(
		({ s, w, b }) => ({
			x: (b.maxX - b.minX) / s,
			y: (b.maxY - b.minY) / s,
		}),
		combine({
			s: cameraScale,
			b: cameraBounds,
		}),
	);

	const camClient = view(["focus", L.props("x", "y"), worldPageIso], camera);
	const camClientX = view("x", camClient);
	const camClientY = view("y", camClient);
</script>

<div class="beside">
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

			<label
				><input
					type="checkbox"
					value={true}
					bind:checked={showBounds.value}
				/> Show Paper Bounds</label
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
				><input
					type="checkbox"
					bind:checked={cameraAutoPadding.value}
				/> Extend Scrollbars</label
			>
		</div>
	</fieldset>

	<fieldset>
		<legend>Focus</legend>

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
					min={cameraBounds.value.minX - cameraBounds.value.maxX}
					max={cameraBounds.value.maxX - cameraBounds.value.minX}
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
					min={cameraBounds.value.minY - cameraBounds.value.maxY}
					max={cameraBounds.value.maxY - cameraBounds.value.minY}
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

		<hr />
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
	</fieldset>
</div>

<fieldset>
	<legend>Documents</legend>

	<div class="tool-bar">
		<button
			class="doc-tab-action"
			type="button"
			onclick={() => (newTab.value = {})}
			><svg width="32" height="32" viewBox="-16 -16 32 32">
				<title>New</title>
				<path
					d="M-12,0L12,0M0,12L0,-12"
					stroke="currentColor"
					stroke-width="2px"
					vector-effect="non-scaling-stroke"
					stroke-linecap="round"
					shape-rendering="crispEdges"
				/>
			</svg></button
		>
		<hr class="tool-bar-sep" />
		{#each tabIds.value as d}
			{@const docName = view(
				["tabs", d, "document", "title", L.defaults("")],
				allTabs,
			)}
			{@const fallbackName = view(
				[
					"tabs",
					d,
					"document",
					"content",
					L.choices(
						["textes", L.first, "content"],
						["textBoxes", L.first, "content"],
					),
					L.valueOr(""),
					L.ifElse(
						R.isEmpty,
						L.inverse(L.dropPrefix("untitled")),
						L.inverse(L.dropPrefix("untitled - ")),
					),
				],
				allTabs,
			)}
			<span class="doc-tab-group" class:active={d === currentTabId.value}>
				{#if d === currentTabId.value}
					<input
						placeholder={fallbackName.value}
						class="doc-tab-titel"
						class:untitled={!docName.value}
						bind:value={docName.value}
						class:active={true}
					/>
				{:else}
					<button
						class="doc-tab-titel"
						class:active={false}
						class:untitled={!docName.value}
						onclick={() => (currentTabId.value = d)}
						>{docName.value || fallbackName.value}</button
					>
				{/if}
				<button
					type="button"
					class="doc-tab-del"
					onclick={() => {
						closeTab.value = d;
					}}
					class:active={d === currentTabId.value}
					title="Close"
				>
					<svg width="10" height="10" viewBox="-16 -16 32 32">
						<title>Delete</title>
						<path
							d="M-8,-8L8,8M-8,8L8,-8"
							stroke="currentColor"
							stroke-width="4px"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</span>
		{/each}
	</div>
</fieldset>

<fieldset>
	<legend>Tools</legend>

	<div class="tool-bar">
		<button
			type="button"
			onclick={() => {
				currentDocumentContent.value = {};

				if (
					currentToolElement.value &&
					currentToolElement.value.cancel
				) {
					currentToolElement.value.cancel();
				}

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

<fieldset>
	<legend>{tools[tool.value].name}</legend>

	<div>
		{#if currentToolElement.value && currentToolElement.value.canCancel && currentToolElement.value.cancel}
			<button
				type="button"
				disabled={!currentToolElement.value.canCancel.value}
				onclick={() => {
					currentToolElement.value.cancel();
				}}>Cancel</button
			>
		{/if}
	</div>
</fieldset>

<div class="prevent-selection">
	<Scroller
		alignment="center"
		extraScrollPadding={cameraAutoPadding}
		{scrollPosition}
		contentSize={scrollContentSize}
		{scrollWindowSize}
	>
		<svg
			class="canvas"
			bind:this={svgElement.value}
			viewBox={viewBox.value}
			preserveAspectRatio={preserveAspectRatio.value}
		>
			<Navigator {camera} {frameBoxPath} {cameraTow}>
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
						stroke="#ff88cc"
						fill="none"
						vector-effect="non-scaling-stroke"
						stroke-width="14px"
						shape-rendering="crispEdges"
					/>
				</g>

				<g pointer-events="none">
					<Bounds
						show={showBounds}
						{extension}
						{cameraBounds}
						{rotationTransform}
						{cameraScale}
					/>
					<Grid
						{frameBoxPath}
						{frameBoxObject}
						{rotationTransform}
						{cameraScale}
					/>
					<Edges {nodes} {edges} {rotationTransform} {cameraScale} />
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
					<Shapes
						{shapes}
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
					bind:this={currentToolElement.value}
					{...tools[tool.value].parameters}
				></svelte:component>
			</Navigator>
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

{#if debugFrames.value}
	<div
		class="debug-dot"
		style:left="{Math.round(camClientX.value)}px"
		style:top="{Math.round(camClientY.value)}px"
	></div>
{/if}

<div class="beside">
	<div>
		<h3>Camera Parameter</h3>
		<textarea use:bindValue={cameraJson.stableAtom}></textarea>
	</div>

	<div>
		<h3>Drawing</h3>
		<textarea use:bindValue={canvasJson.stableAtom}></textarea>
	</div>
</div>

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

	.canvas {
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
		user-select: none;
		touch-action: none;
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

	.debug-dot {
		z-index: 1000;
		pointer-events: none;
		opacity: 0.5;
		position: absolute;
		width: 6px;
		height: 6px;
		margin: -4px 0 0 -4px;
		background: magenta;
		border: 1px solid white;
	}

	.doc-tab-action {
		display: grid;
		place-content: stretch;
		place-items: stretch;
		text-align: left;
		height: 2.4em;
		width: 2.4em;
		padding: 0.5em;
		box-sizing: border-box;
	}

	.doc-tab-action > svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	.doc-tab-group {
		display: flex;
		flex-basis: 15em;
		justify-items: stretch;
		background: #eee;
		border-bottom: 2px solid #333;
		flex-shrink: 0;
		flex-grow: 0;
	}

	.doc-tab-group.active {
		border-bottom-color: #cd3e30;
	}

	.doc-tab-titel {
		display: block;
		font: inherit;
		border: none;
		font-family: monospace;
		text-align: left;
		border: 2px solid white;
		background: none;
		border: none;
		color: #333;
		flex-grow: 1;
		flex-shrink: 0;
		padding: 0.5em;
		width: 12em;
		outline: none;
		white-space: pre;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: default;
		-webkit-appearance: none;
		appearance: none;
		-webkit-border-radius: 0px;
		border-radius: none;
		box-sizing: border-box;
		border: 2px solid transparent;
		border-bottom-width: 0;
	}

	input.doc-tab-titel:focus {
		cursor: text;
		background: white;
		color: #cd3e30;
		border-color: #cd3e30;
		text-overflow: initial;
	}

	@media (hover) {
		.doc-tab-titel:hover {
			color: #cd3e30;
		}
	}

	.doc-tab-titel:focus-visible {
		color: #cd3e30;
	}
	.doc-tab-titel.active {
		background: #cd3e30;
		color: white;
	}
	.untitled {
		font-style: italic;
		color: #333a;
	}

	.untitled.active::placeholder {
		font-style: italic;
		color: #fffa;
	}

	.doc-tab-del {
		flex-grow: 0;
		flex-shrink: 0;
		display: grid;
		width: 2em;
		place-items: center;
		place-content: center;
		text-align: center;
		box-sizing: border-box;
		color: #333;
		background: none;
		padding: 0.5em;
		overflow: hidden;
		align-self: stretch;
		font-weight: bold;
		visibility: hidden;
		border-radius: none;
	}

	.doc-tab-del > svg {
		width: 100%;
		height: 100%;
	}

	.doc-tab-del.active {
		color: #444;
		visibility: visible;
	}

	.doc-tab-del:hover {
		color: white;
		background: #aa3333;
	}

	.doc-tab-del.active:hover,
	.doc-tab-del.active:focus-visible {
		background: #aa3333;
		color: white;
	}
	.doc-tab-del:active {
		background: #773333;
	}

	@media (hover) {
		.doc-tab-group:hover > .doc-tab-del {
			display: grid;
			visibility: visible;
		}
	}
</style>
