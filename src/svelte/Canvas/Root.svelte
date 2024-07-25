<script>
	import * as L from "partial.lenses";
	import * as H from "partial.lenses.history";
	import * as R from "ramda";
	import * as Geo from "../geometry";
	import * as U from "../utils";
	import Navigator from "./camera/Navigator.svelte";
	import ClickPicker from "./tools/ClickPicker.svelte";
	import AffineTansformer from "./tools/AffineTansformer.svelte";
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
		animateWith,
		adjustSize,
		isFullscreen,
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
	import ShapesDef from "./tools/ShapesDef.svelte";
	//import ShapesUse from "./tools/ShapesUse.svelte";
	import LayeredUse from "./tools/LayeredUse.svelte";

	import RubberBand from "./tools/RubberBand.svelte";
	import NodesDef from "./tools/NodesDef.svelte";
	//import NodesUse from "./tools/NodesUse.svelte";
	import EdgesDef from "./tools/EdgesDef.svelte";
	import DrawingsDef from "./tools/DrawingsDef.svelte";
	import SplinesDef from "./tools/SplinesDef.svelte";
	import Bounds from "./tools/Bounds.svelte";
	import Origin from "./tools/Origin.svelte";
	import TextLinesDef from "./tools/TextLinesDef.svelte";
	import TextBoxesDef from "./tools/TextBoxesDef.svelte";
	import TextLineTyper from "./tools/TextLineTyper.svelte";
	import TextBoxTyper from "./tools/TextBoxTyper.svelte";
	import Magnifier from "./tools/Magnifier.svelte";
	import GuideLiner from "./tools/GuideLiner.svelte";
	import Guides from "./tools/Guides.svelte";
	import Grid from "./tools/Grid.svelte";
	import Ruler from "./tools/Ruler.svelte";
	import Axis from "./tools/Axis.svelte";
	import PlotCreator from "./tools/PlotCreator.svelte";
	import ShowAxis from "./tools/ShowAxis.svelte";
	import ShowAlert from "./tools/ShowAlert.svelte";
	import ShowPlots from "./tools/ShowPlots.svelte";
	import Pan from "./tools/Pan.svelte";
	import Rotate from "./tools/Rotate.svelte";
	import Zoom from "./tools/Zoom.svelte";
	import Dropper from "./tools/Dropper.svelte";
	import Minimap from "./tools/Minimap.svelte";

	import Droppables from "./toolbars/Droppables.svelte";
	import Bookmarker from "./toolbars/Bookmarker.svelte";
	import History from "./toolbars/History.svelte";
	import Tabs from "./toolbars/Tabs.svelte";
	import Properties from "./toolbars/Properties.svelte";

	const svgElement = atom(undefined);
	const bitmapCanvas = atom(undefined);
	const cameraTow = atom(undefined);
	const currentToolElement = atom(undefined);
	const fullScreenContainer = atom(undefined);

	const debugFrames = atom(false);
	const showBounds = atom(false);
	const fullPageCanvas = atom(false);
	const isFullScreen = isFullscreen();
	const bookmarks = atom([
		{ label: "Origin", value: { x: 0, y: 0, z: 0, w: 0 } },
	]);

	const defaultProperties = atom({});

	const HISTORY_SETTINGS = {
		replacePeriod: 1000,
	};
	animateWith(
		read(
			L.reread((el) =>
				el ? { el, ctx: el.getContext("2d") } : undefined,
			),
			bitmapCanvas,
		),
		({ el, ctx }) => {
			ctx.clearRect(0, 0, el.width, el.height);

			ctx.fillStyle = "black";
			ctx.font = "20px arial";
			ctx.fillText("Hello World", 100, 100);
		},
	);

	const allTabs = atom({
		current: 0,
		tabs: [
			{
				document: H.init(HISTORY_SETTINGS, {
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
						drawings: [
							{
								path: [
									{
										x: -132.61747643672365,
										y: 109.08733736410684,
									},
									{
										x: -140.48048863977536,
										y: 99.17910648797863,
									},
									{
										x: -148.00148069950131,
										y: 90.21056823263632,
									},
									{
										x: -156.1201452366876,
										y: 82.52374274140558,
									},
									{
										x: -165.77617487211992,
										y: 76.46065015761206,
									},
									{
										x: -175.68785684168685,
										y: 72.61896295871607,
									},
									{
										x: -187.39255624363452,
										y: 72.62241405215482,
									},
									{
										x: -198.66886769306544,
										y: 76.72665577206284,
									},
									{
										x: -207.03973347094748,
										y: 82.96593506767724,
									},
									{
										x: -213.7868663413923,
										y: 90.74257946153779,
									},
									{
										x: -218.48187835188318,
										y: 104.1573795801138,
									},
									{
										x: -220.27144469082518,
										y: 119.70721727439619,
									},
									{
										x: -218.7306284991403,
										y: 129.7881837689066,
									},
									{
										x: -215.22405925669253,
										y: 142.3462079824491,
									},
									{
										x: -210.52214505932423,
										y: 152.34080666776842,
									},
									{
										x: -203.5988254770585,
										y: 162.59105768722233,
									},
									{
										x: -196.07783341733247,
										y: 171.55959594256464,
									},
									{
										x: -187.27512859349494,
										y: 181.1258066753672,
									},
									{
										x: -178.81444391298302,
										y: 189.75232478738386,
									},
									{
										x: -168.81639413422502,
										y: 196.75510999196325,
									},
									{
										x: -159.5023846421183,
										y: 201.87850995497084,
									},
									{
										x: -148.90666238590003,
										y: 207.59958239543866,
									},
									{
										x: -137.7132676522215,
										y: 212.03894207179493,
									},
									{
										x: -125.23816015443137,
										y: 217.07597422561142,
									},
									{
										x: -115.58213051899898,
										y: 223.1390668094049,
									},
									{
										x: -104.38873578532045,
										y: 227.57842648576113,
									},
									{
										x: -92.59766857418171,
										y: 230.7360733980058,
									},
									{
										x: -94.1384847658666,
										y: 220.6551069034954,
									},
									{
										x: -87.7333720387474,
										y: 211.93876988884895,
									},
									{
										x: -78.85120159259623,
										y: 201.25667982343955,
									},
									{
										x: -72.44608886547707,
										y: 192.54034280879307,
									},
									{
										x: -65.78532380422334,
										y: 181.6026004092491,
									},
									{
										x: -61.003943984541394,
										y: 171.3488982963565,
									},
									{
										x: -56.222564164859506,
										y: 161.09519618346386,
									},
									{
										x: -52.380876965963466,
										y: 151.18351421389696,
									},
									{
										x: -47.68586495547265,
										y: 137.76871409532092,
									},
									{
										x: -43.33287308830751,
										y: 123.414221355959,
									},
									{
										x: -41.712591274309005,
										y: 113.2468870522575,
									},
									{
										x: -40.17867726950155,
										y: 99.91845474287257,
									},
									{
										x: -41.463841127051865,
										y: 87.61608286346467,
									},
									{
										x: -44.28637008284832,
										y: 76.93744389149401,
									},
									{
										x: -48.390611802756354,
										y: 65.6611324420631,
									},
									{
										x: -51.81081323601302,
										y: 56.26420623420401,
									},
									{
										x: -59.58745762987357,
										y: 49.51707336375918,
									},
									{
										x: -68.90146712198029,
										y: 44.393673400751595,
									},
									{
										x: -80.60616652392795,
										y: 44.39712449419032,
									},
									{
										x: -92.56651826001016,
										y: 46.62198097252653,
									},
									{
										x: -101.9634444678693,
										y: 50.04218240578324,
									},
									{
										x: -112.21369548732318,
										y: 56.96550198804897,
									},
									{
										x: -121.77990622012572,
										y: 65.76820681188653,
									},
									{
										x: -127.84299880391919,
										y: 75.4242364473189,
									},
									{
										x: -132.6243786236011,
										y: 85.67793856021152,
									},
									{
										x: -135.18435305838554,
										y: 96.18729300723871,
									},
									{
										x: -133.64353686670066,
										y: 106.26825950174913,
									},
								],
							},
						],
					},
				}),
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

	const cameraRotationInverseTransformLens = L.reread(
		(c) => `rotate(${-c.focus.w}, ${c.focus.x}, ${c.focus.y})`,
	);

	const rotationTransform = read(cameraRotationTransformLens, camera);
	const rotationInverseTransform = read(
		cameraRotationInverseTransformLens,
		camera,
	);
	const cameraRotationLens = L.iso(
		({ x, y }) => {
			const c = camera.value;
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
			const c = camera.value;
			const cos = Math.cos((c.focus.w / 180) * Math.PI);
			const sin = Math.sin((c.focus.w / 180) * Math.PI);

			const dx = x - c.focus.x;
			const dy = y - c.focus.y;

			return {
				x: c.focus.x + dx * cos + dy * sin,
				y: c.focus.y + dx * -sin + dy * cos,
			};
		},
	);

	const cameraScaleLens = L.reread((c) => Math.exp(-c.focus.z));
	const cameraScale = read(cameraScaleLens, camera);
	const cameraOrientationLens = L.reread((c) => c.focus.w);
	const cameraOrientation = read(cameraOrientationLens, camera);
	const gridDistance = atom(128);

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
	const cameraZoomMin = atom(-5);
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

	const canvasDocumentHistory = view(
		[
			L.choose(({ current, docs }) => [
				"tabs",
				current,
				"document",
				L.defaults(H.init(HISTORY_SETTINGS, {})),
			]),
		],
		allTabs,
	);

	const canvasDocument = view(H.present, canvasDocumentHistory);

	const canvasDocumentMut = view(H.presentMut, canvasDocumentHistory);

	const canvasUndoIndex = view(H.undoIndex, canvasDocumentHistory);

	const canvasRedoIndex = view(H.redoIndex, canvasDocumentHistory);

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

	const tool = atom("select");
	const currentDocumentContent = view(["content"], canvasDocument);
	const currentDocumentContentMut = view(["content"], canvasDocumentMut);

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
	const splines = view(["splines", L.defaults([])], currentDocumentContent);
	const shapes = view(["shapes", L.defaults([])], currentDocumentContent);
	const plots = view(["plots", L.defaults([])], currentDocumentContent);
	const alerts = view(["alerts", L.defaults([])], currentDocumentContent);
	const rubberBand = atom(undefined);
	const newAlert = view([L.appendTo], alerts);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);
	const newEdge = view([L.appendTo, L.required("x", "y")], edges);
	const newEdgeNode = view(
		L.setter(({ source, newTarget }, { e, n }) => ({
			e: [...e, { source, target: n.length }],
			n: [...n, newTarget],
		})),
		combine({ e: edges, n: nodes }),
	);

	const zLayers = view(
		[
			L.partsOf(
				L.branch({
					shapes: [
						L.defaults([]),
						L.elems,
						L.lens(
							(s, i) => ({
								id: "shape-" + i,
								zIndex: s.zIndex,
							}),
							(newVal, old) => ({
								...old,
								zIndex: newVal.zIndex,
							}),
						),
					],
					edges: [
						L.defaults([]),
						L.elems,
						L.lens(
							(s, i) => ({
								id: "edge-" + i,
								zIndex: s.zIndex,
							}),
							(newVal, old) => ({
								...old,
								zIndex: newVal.zIndex,
							}),
						),
					],
					nodes: [
						L.defaults([]),
						L.elems,
						L.lens(
							(s, i) => ({
								id: "node-" + i,
								zIndex: s.zIndex,
							}),
							(newVal, old) => ({
								...old,
								zIndex: newVal.zIndex,
							}),
						),
					],
					textes: [
						L.defaults([]),
						L.elems,
						L.lens(
							(s, i) => ({
								id: "textline-" + i,
								zIndex: s.zIndex,
							}),
							(newVal, old) => ({
								...old,
								zIndex: newVal.zIndex,
							}),
						),
					],
					textBoxes: [
						L.defaults([]),
						L.elems,
						L.lens(
							(s, i) => ({
								id: "textbox-" + i,
								zIndex: s.zIndex,
							}),
							(newVal, old) => ({
								...old,
								zIndex: newVal.zIndex,
							}),
						),
					],
					splines: [
						L.defaults([]),
						L.elems,
						L.lens(
							(s, i) => ({
								id: "spline-" + i,
								zIndex: s.zIndex,
							}),
							(newVal, old) => ({
								...old,
								zIndex: newVal.zIndex,
							}),
						),
					],
					drawings: [
						L.defaults([]),
						L.elems,
						L.lens(
							(s, i) => ({
								id: "drawing-" + i,
								zIndex: s.zIndex,
							}),
							(newVal, old) => ({
								...old,
								zIndex: newVal.zIndex,
							}),
						),
					],
				}),
			),
			L.lens(R.sortBy(R.propOr(Infinity, "zIndex")), (newZ, olds) => {
				if (newZ.length !== olds.length) {
					return olds;
				}

				const sortedNew = R.sortBy(R.propOr(Infinity, "zIndex"), newZ);

				return R.map(
					(o) => ({
						id: o.id,
						zIndex: R.findIndex(
							R.compose(R.equals(o.id), R.prop("id")),
							sortedNew,
						),
					}),
					olds,
				);
			}),
		],
		currentDocumentContent,
	);

	const zValues = view(L.partsOf([L.elems, "zIndex"]), zLayers);
	const layerCount = $derived(zValues.value.length);
	let layerCountPrev = $state(0);

	$effect(() => {
		if (layerCount !== layerCountPrev) {
			zValues.value = R.range(0, layerCount);
			layerCountPrev = layerCount;
		}
	});

	const selectionInternal = atom([]);
	const selection = view(L.normalize(R.uniq), selectionInternal);

	const hitAreas = view(
		({ scale, doc }) => {
			return L.get(
				[
					L.partsOf(
						L.branch({
							nodes: [
								L.elems,
								L.reread((n, i) => ({
									type: "circle",
									cx: n.x,
									cy: n.y,
									r: 25 * Math.min(1, scale),
									id: "node-" + i,
									allowedTransform: {
										translation: true,
										scale: "multiple",
										rotate: "multiple",
									},
								})),
							],
							edges: [
								L.elems,
								L.reread((e, i) => ({
									type: "polyline",
									id: "edge-" + i,
									points: [
										{
											x: doc.nodes[e.source].x,
											y: doc.nodes[e.source].y,
										},
										{
											x: doc.nodes[e.target].x,
											y: doc.nodes[e.target].y,
										},
									],
									allowedTransform: {
										translation: false,
										scale: false,
										rotate: false,
									},
								})),
							],
							shapes: [
								L.elems,
								L.reread((sp, i) => {
									const cos = Math.cos(
										(-sp.placement.angle / 180) * Math.PI,
									);
									const sin = Math.sin(
										(-sp.placement.angle / 180) * Math.PI,
									);

									return {
										type: "polygon",
										points: [
											{
												x: sp.placement.start.x,
												y: sp.placement.start.y,
											},
											{
												x:
													sp.placement.start.x +
													cos * sp.placement.size.x,
												y:
													sp.placement.start.y +
													-sin * sp.placement.size.x,
											},
											{
												x:
													sp.placement.start.x +
													cos * sp.placement.size.x +
													sin * sp.placement.size.y,
												y:
													sp.placement.start.y +
													-sin * sp.placement.size.x +
													cos * sp.placement.size.y,
											},
											{
												x:
													sp.placement.start.x +
													sin * sp.placement.size.y,
												y:
													sp.placement.start.y +
													cos * sp.placement.size.y,
											},
										],
										id: "shape-" + i,
										allowedTransform: {
											translation: true,
											scale: false,
											rotate: true,
										},
									};
								}),
							],
							textBoxes: [
								L.elems,
								L.reread((sp, i) => {
									const cos = Math.cos(
										(-sp.angle / 180) * Math.PI,
									);
									const sin = Math.sin(
										(-sp.angle / 180) * Math.PI,
									);

									return {
										type: "polygon",
										points: [
											{
												x: sp.start.x,
												y: sp.start.y,
											},
											{
												x: sp.start.x + cos * sp.size.x,
												y:
													sp.start.y +
													-sin * sp.size.x,
											},
											{
												x:
													sp.start.x +
													cos * sp.size.x +
													sin * sp.size.y,
												y:
													sp.start.y +
													-sin * sp.size.x +
													cos * sp.size.y,
											},
											{
												x: sp.start.x + sin * sp.size.y,
												y: sp.start.y + cos * sp.size.y,
											},
										],
										id: "textbox-" + i,
										allowedTransform: {
											translation: true,
											scale: true,
											rotate: true,
										},
									};
								}),
							],
							drawings: [
								L.elems,
								L.reread((drawing, i) => ({
									type: "polyline",
									id: "drawing-" + i,
									points: drawing.path,
									allowedTransform: {
										translation: true,
										scale: true,
										rotate: true,
									},
								})),
							],
						}),
					),
				],
				doc,
			);
		},
		combine({ scale: cameraScale, doc: currentDocumentContent }),
	);

	const selectionExtension = view(
		({ hit, sel }) => {
			let minX = +Infinity;
			let maxX = -Infinity;
			let minY = +Infinity;
			let maxY = -Infinity;
			let minXPadded = +Infinity;
			let maxXPadded = -Infinity;
			let minYPadded = +Infinity;
			let maxYPadded = -Infinity;
			let allowedTransform = {
				translation: true,
				scale: true,
				rotate: true,
			};

			for (let h = 0; h < hit.length; h++) {
				const ha = hit[h];
				if (sel.indexOf(ha.id) < 0) {
					continue;
				}

				allowedTransform.translation &&=
					ha.allowedTransform.translation === true ||
					(ha.allowedTransform.translation === "multiple" &&
						sel.length > 1);
				allowedTransform.scale &&=
					ha.allowedTransform.scale === true ||
					(ha.allowedTransform.scale === "multiple" &&
						sel.length > 1);
				allowedTransform.rotate &&=
					ha.allowedTransform.rotate === true ||
					(ha.allowedTransform.rotate === "multiple" &&
						sel.length > 1);

				switch (ha.type) {
					case "circle":
						// TODO
						minX = Math.min(minX, ha.cx);
						maxX = Math.max(maxX, ha.cx);
						minY = Math.min(minY, ha.cy);
						maxY = Math.max(maxY, ha.cy);
						minXPadded = Math.min(minXPadded, ha.cx - ha.r);
						maxXPadded = Math.max(maxXPadded, ha.cx + ha.r);
						minYPadded = Math.min(minYPadded, ha.cy - ha.r);
						maxYPadded = Math.max(maxYPadded, ha.cy + ha.r);
						break;
					case "polygon":
						for (let p = 0; p < ha.points.length; p++) {
							minX = Math.min(minX, ha.points[p].x);
							maxX = Math.max(maxX, ha.points[p].x);
							minY = Math.min(minY, ha.points[p].y);
							maxY = Math.max(maxY, ha.points[p].y);
							minXPadded = Math.min(minXPadded, ha.points[p].x);
							maxXPadded = Math.max(maxXPadded, ha.points[p].x);
							minYPadded = Math.min(minYPadded, ha.points[p].y);
							maxYPadded = Math.max(maxYPadded, ha.points[p].y);
						}
						break;
					case "polyline":
						for (let p = 0; p < ha.points.length; p++) {
							minX = Math.min(minX, ha.points[p].x);
							maxX = Math.max(maxX, ha.points[p].x);
							minY = Math.min(minY, ha.points[p].y);
							maxY = Math.max(maxY, ha.points[p].y);
							minXPadded = Math.min(minXPadded, ha.points[p].x);
							maxXPadded = Math.max(maxXPadded, ha.points[p].x);
							minYPadded = Math.min(minYPadded, ha.points[p].y);
							maxYPadded = Math.max(maxYPadded, ha.points[p].y);
						}
						break;
					default:
						return false;
				}
			}

			if (isFinite(minX)) {
				return {
					minX,
					maxX,
					minY,
					maxY,
					minXPadded,
					maxXPadded,
					minYPadded,
					maxYPadded,
					allowedTransform,
				};
			} else {
				return null;
			}
		},
		combine({ hit: hitAreas, sel: selection }),
	);

	const translators = {
		nodes: ({ dx, dy }, nodes, sel) =>
			nodes.map((n, i) =>
				sel.indexOf(`node-${i}`) < 0
					? n
					: {
							...n,
							x: n.x + dx,
							y: n.y + dy,
						},
			),
		drawings: ({ dx, dy }, drawings, sel) =>
			drawings.map((d, i) =>
				sel.indexOf(`drawing-${i}`) < 0
					? d
					: {
							...d,
							path: d.path.map(({ x, y }) => ({
								x: x + dx,
								y: y + dy,
							})),
						},
			),
		shapes: ({ dx, dy }, shapes, sel) =>
			shapes.map((s, i) =>
				sel.indexOf(`shape-${i}`) < 0
					? s
					: L.modify(
							["placement", "start"],
							({ x, y }) => ({ x: x + dx, y: y + dy }),
							s,
						),
			),
	};

	function translateSelected(delta, transient = false) {
		const sel = selection.value;
		update(
			(doc) => {
				return R.mapObjIndexed((entries, key) => {
					if (translators[key]) {
						return translators[key](delta, entries, sel);
					} else {
						return entries;
					}
				}, doc);
			},
			transient ? currentDocumentContentMut : currentDocumentContent,
		);
	}

	const scalers = {
		nodes: (factor, pivot, nodes, sel) =>
			nodes.map((n, i) =>
				sel.indexOf(`node-${i}`) < 0
					? n
					: {
							...n,
							x: (n.x - pivot.x) * factor.x + pivot.x,
							y: (n.y - pivot.y) * factor.y + pivot.y,
						},
			),
		drawings: (factor, pivot, drawings, sel) =>
			drawings.map((d, i) =>
				sel.indexOf(`drawing-${i}`) < 0
					? d
					: {
							...d,
							path: d.path.map(({ x, y }) => ({
								x: (x - pivot.x) * factor.x + pivot.x,
								y: (y - pivot.y) * factor.y + pivot.y,
							})),
						},
			),
		shapes: (factor, pivot, shapes, sel) =>
			shapes.map((s, i) => {
				return sel.indexOf(`shape-${i}`) < 0
					? s
					: L.modify(
							["placement", "start"],
							({ x, y }) => ({
								x: (x - pivot.x) * factor.x + pivot.x,
								y: (y - pivot.y) * factor.y + pivot.y,
							}),
							L.modify(
								["placement", "size"],
								({ x, y }) => ({
									x: x * factor.x || 0.001,
									y: y * factor.y || 0.001,
								}),
								s,
							),
						);
			}),
	};

	function scaleSelected(factor, pivot, transient = false) {
		const sel = selection.value;
		update(
			(doc) => {
				return R.mapObjIndexed((entries, key) => {
					if (scalers[key]) {
						return scalers[key](factor, pivot, entries, sel);
					} else {
						return entries;
					}
				}, doc);
			},
			transient ? currentDocumentContentMut : currentDocumentContent,
		);
	}

	const rotators = {
		nodes: (angle, pivot, nodes, sel) =>
			nodes.map((n, i) =>
				sel.indexOf(`node-${i}`) < 0
					? n
					: {
							...n,
							...Geo.rotatePivotDegree(pivot, angle, {
								x: n.x,
								y: n.y,
							}),
						},
			),
		drawings: (angle, pivot, drawings, sel) =>
			drawings.map((d, i) =>
				sel.indexOf(`drawing-${i}`) < 0
					? d
					: {
							...d,
							path: d.path.map((p) =>
								Geo.rotatePivotDegree(pivot, angle, p),
							),
						},
			),
		shapes: (angle, pivot, shapes, sel) =>
			shapes.map((s, i) => {
				return sel.indexOf(`shape-${i}`) < 0
					? s
					: L.modify(
							["placement", "start"],
							(p) => Geo.rotatePivotDegree(pivot, angle, p),
							L.modify(
								["placement", "angle"],
								(a) => a + angle,
								s,
							),
						);
			}),
	};

	function rotateSelected(angle, pivot, transient = false) {
		const sel = selection.value;
		update(
			(doc) => {
				return R.mapObjIndexed((entries, key) => {
					if (scalers[key]) {
						return rotators[key](angle, pivot, entries, sel);
					} else {
						return entries;
					}
				}, doc);
			},
			transient ? currentDocumentContentMut : currentDocumentContent,
		);
	}

	const newDrawing = view(
		[
			L.appendTo,
			L.removable("path"),
			"path",
			L.setter((n, o) => (n.length > 1 ? n : o)),
		],
		drawings,
	);
	const newSpline = view([L.appendTo, "path"], splines);
	const newShape = view([L.appendTo], shapes);
	const newGuide = view([L.appendTo], guides);
	const newAxis = view(L.identity, axis);
	const newPlot = view([L.appendTo], plots);

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
		alerts: L.elems,
		drawings: [L.elems, "path", L.elems],
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
		plots: [
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
		splines: [
			L.elems,
			"path",
			L.elems,
			L.ifElse(
				R.is(Object),
				L.pick({
					point: "point",
					front: "front",
					back: "back",
				}),
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
		affineTansformer: {
			name: "Transform",
			component: AffineTansformer,
			parameters: {
				cameraScale,
				selectionExtension,
				rotationTransform,
				clientToCanvas,
				translateSelected,
				scaleSelected,
				rotateSelected,
				frameBoxPath,
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
				newSpline,
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
				cameraRotationLens,
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
				cameraOrientation,
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
		plot: {
			name: "Plot",
			component: PlotCreator,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				rotationTransform,
				newPlot,
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
		["select", "lasso", "affineTansformer"],
		["magnifier", "pan", "rotate", "zoom"],
		["pen", "polygon", "spline"],
		["createNode", "createEdge"],
		["text", "text_box", "shape"],
		["axis", "plot", "guides"],
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

	$effect(() => {
		document.body.classList.toggle("noScroll", fullPageCanvas.value);
	});

	function requestFullScreen() {
		fullScreenContainer.value.requestFullscreen().catch((err) => {
			alert(
				`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
			);
		});
	}
</script>

<div class="container">
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
				<br />

				<div class:fullPageCorner={fullPageCanvas.value}>
					<label
						><input
							type="checkbox"
							bind:checked={fullPageCanvas.value}
						/> Stretch to Page</label
					>

					<button
						type="button"
						disabled={!fullScreenContainer.value}
						onclick={requestFullScreen}>Full Screen</button
					>
				</div>
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
							L.set(
								["focus", L.props("x", "y")],
								boundsCenter.value,
							),
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

			<div>
				<label class="number-picker"
					><span>Grid Size:</span>
					<input
						type="range"
						bind:value={gridDistance.value}
						min={0}
						max={512}
						step="32"
					/>
					<button
						type="button"
						onclick={(_) => {
							gridDistance.value = 32;
						}}>reset</button
					>
					<output>{gridDistance.value}</output>
				</label>
			</div>
		</fieldset>
	</div>

	<Tabs {newTab} {tabIds} {closeTab} {currentTabId} {allTabs} />

	<History {canvasUndoIndex} {canvasRedoIndex} />

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
			<button
				type="button"
				class="button tool-button"
				onclick={() =>
					(newAlert.value = {
						...cameraFocus.value,
						msg: "Test Error",
					})}>Error</button
			>
		</div>
	</fieldset>

	<fieldset>
		<legend>{tools[tool.value].name}</legend>

		<div>
			{#if currentToolElement.value && currentToolElement.value.canCancel && currentToolElement.value.cancel}
				<button
					type="button"
					class="tool-action"
					disabled={!currentToolElement.value.canCancel.value}
					onpointerdown={(evt) => {
						if (!evt.isPrimary) {
							evt.currentTarget.click();
						}
					}}
					onclick={() => {
						currentToolElement.value.cancel();
					}}>Cancel</button
				>
			{/if}
		</div>
	</fieldset>

	<Properties properties={defaultProperties} />

	<div
		class="prevent-selection"
		bind:this={fullScreenContainer.value}
		class:fullPageFill={fullPageCanvas.value || isFullScreen.value}
	>
		<Dropper
			{newText}
			{clientToCanvas}
			{cameraScale}
			{cameraOrientation}
			{newNode}
			{newShape}
		>
			<Scroller
				allowOverscroll={false}
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
					tabindex="-1"
					role="button"
					onkeydown={(evt) => {
						if (evt.key === "Escape") {
							selection.value = [];
						}
					}}
				>
					<Navigator
						{camera}
						{frameBoxPath}
						{cameraTow}
						errorHandler={newAlert}
					>
						<ClickPicker
							{hitAreas}
							{selection}
							{rotationTransform}
							{clientToCanvas}
							{cameraScale}
							{frameBoxPath}
						>
							<g
								class:hidden={!debugFrames.value}
								pointer-events="none"
							>
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
									{gridDistance}
								/>
								<EdgesDef
									{nodes}
									{edges}
									{rotationTransform}
									{cameraScale}
								/>
								<NodesDef {nodes} {cameraScale} />

								<DrawingsDef
									{drawings}
									{rotationTransform}
									{cameraScale}
								/>

								<SplinesDef
									{splines}
									{rotationTransform}
									{cameraScale}
								/>

								<TextBoxesDef
									{textBoxes}
									{clientToCanvas}
									{frameBoxPath}
									{rotationTransform}
									{cameraScale}
									{cameraOrientation}
								/>

								<TextLinesDef
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
								<ShapesDef
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
								<ShowPlots
									{plots}
									{frameBoxObject}
									{rotationTransform}
									{cameraScale}
								/>

								<!-- <NodesUse {nodes} {rotationTransform} />
							<ShapesUse {shapes} {rotationTransform} /> -->
								<g
									pointer-events="none"
									transform={rotationTransform.value}
								>
									<LayeredUse {zLayers} {rotationTransform} />
								</g>

								<Origin {rotationTransform} {cameraScale} />
							</g>

							<svelte:component
								this={tools[tool.value].component}
								bind:this={currentToolElement.value}
								{...tools[tool.value].parameters}
							></svelte:component>

							{#if currentToolElement.value?.allowAffineTransform}
								<AffineTansformer
									{cameraScale}
									{selectionExtension}
									{rotationTransform}
									{clientToCanvas}
									{translateSelected}
									{scaleSelected}
									{rotateSelected}
									{frameBoxPath}
								/>
							{/if}

							<Ruler
								{frameBoxPath}
								{frameBoxObject}
								{rotationTransform}
								{cameraScale}
							/>

							<ShowAlert
								{alerts}
								{frameBoxObject}
								{rotationTransform}
								{cameraOrientation}
								{cameraScale}
								{cameraFocus}
							/>
						</ClickPicker>
					</Navigator>
				</svg>
				<!-- 
		<canvas
			bind:this={bitmapCanvas.value}
			class="canvas bitmap-canvas"
			use:adjustSize={read(
				R.map(R.multiply(window.devicePixelRatio)),
				scrollWindowSize,
			)}
		></canvas>
 -->
				<div class="scroller-hud">
					<input
						type="range"
						bind:value={cameraZoom.value}
						min={cameraZoomMin.value}
						max="5"
						step="0.01"
					/>
				</div>

				<div class="scroller-hud-minimap">
					<Minimap
						{extension}
						{frameBoxPath}
						{cameraFocus}
						{rotationInverseTransform}
						{rotationTransform}
					>
						<LayeredUse {zLayers} {rotationTransform} />
					</Minimap>
				</div>
			</Scroller>
		</Dropper>
	</div>

	<div class="beside">
		<Droppables properties={defaultProperties} />
		<Bookmarker current={cameraFocus} entries={bookmarks} />
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
		touch-action: manipulation;

		-webkit-touch-callout: none;
		-webkit-user-callout: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-modify: none;
		-webkit-highlight: none;
	}

	.scroller-hud-minimap {
		position: absolute; /*needed for SVG overflow, not sure why yet*/
		grid-area: 1/1/1/1;
		align-self: start;
		justify-self: end;
		width: 30%;
		height: 30%;
		z-index: 100;
		background: none;
		font-size: 0.7em;
		margin: 0.5em;
		margin-top: 2em;
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
		pointer-events: none;

		-webkit-touch-callout: none;
		-webkit-user-callout: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-modify: none;
		-webkit-highlight: none;
	}

	.prevent-selection {
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	legend {
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
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

		-webkit-touch-callout: none;
		-webkit-user-callout: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-modify: none;
		-webkit-highlight: none;
	}

	.bitmap-canvas {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
		background: none;
		border: none;
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

	output {
		font-size: 1em;
		font-family: monospace;
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
		-webkit-user-select: none;
		user-select: none;
		--webkit-user-callout: none;
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
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.tool-button:has(:checked):not(:disabled),
	.tool-button:has(:checked):not(:disabled):active,
	.tool-button:has(:checked):not(:disabled):focus-visible,
	.tool-button:has(:checked):not(:disabled):focus,
	.tool-button:has(:checked):disabled,
	.tool-button:has(:checked):disabled:active,
	.tool-button:has(:checked):disabled:focus-visible,
	.tool-button:has(:checked):disabled:focus {
		background: #cd3e30 !important;
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

	.tool-action:disabled,
	.tool-action:disabled:active,
	.tool-action:disabled:focus-visible,
	.tool-action:disabled:focus {
		background: #999;
	}

	.tool-action,
	.tool-action:active,
	.tool-action:focus-visible,
	.tool-action:focus {
		user-select: none;
		touch-action: manipulation;
		background: #333;
		color: #fff;
		-webkit-tap-highlight-color: transparent;
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
	.container {
		user-select: none;
		-webkit-user-select: none;
		touch-action: pan-x pan-y;
	}
	.fullPageCorner {
		position: fixed;
		top: 1em;
		left: 1em;
		z-index: 90000;
	}

	.fullPageFill {
		background: white;
		position: fixed;
		inset: 0;
		display: grid;
		place-content: stretch;
		place-items: stretch;
		z-index: 10000;
	}

	.fullPageFill :global(.scroller) {
		resize: none !important;
		height: 100% !important;
		border: 0;
	}

	:global(.noScroll) {
		overflow: hidden;
		touch-action: none;
	}
</style>
