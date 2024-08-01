<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { untrack, tick } from "svelte";
	import * as Geo from "../geometry";
	import Navigator from "../Canvas/camera/Navigator.svelte";

	import { frameBoxLens } from "../Canvas/camera/lenses";

	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindScrollMax,
		bindSize,
		string,
		bindBoundingBox,
		update,
	} from "../svatom.svelte.js";

	import {
		parserAutoDetect,
		serializerV11,
		stringify,
		hierarchyV11,
		tryDeref,
	} from "../../renew/index.js";
	import Scroller from "../Scroller.svelte";

	import exampleActor from "./actors.rnw?raw";
	import exampleCloseDoor from "./closedoor.rnw?raw";
	import exampleRenew from "./example.rnw?raw";
	import exampleAip from "./example.aip?raw";
	import exampleAip2 from "./example2.aip?raw";
	import exampleTextLines from "./textLineStyles.rnw?raw";
	import exampleDoubleArrow from "./doublearrow.rnw?raw";
	import exampleColors from "./colors.rnw?raw";

	const examples = [
		exampleActor,
		exampleCloseDoor,
		exampleRenew,
		exampleAip,
		exampleAip2,
		exampleTextLines,
		exampleDoubleArrow,
		exampleColors,
	];
	const moreExamples = fetch("http://127.0.0.1:8080/").then((x) => x.json());

	function loadExample(name) {
		return fetch(
			"http://127.0.0.1:8080/?" + new URLSearchParams([["file", name]]),
		).then((x) => x.json());
	}

	const kindKey = "__kind";
	const selfKey = "__self";
	const refKey = "__ref";

	const renewDocument = atom({ string: undefined, json: undefined });
	const renewSerialized = failableView(
		[
			L.rewrite((x) => {
				try {
					return {
						string: x,
						json: parserAutoDetect(x, false, {
							kind: kindKey,
							ref: refKey,
							self: selfKey,
						}),
						cachedSizes: undefined,
					};
				} catch (e) {
					return e;
				}
			}),
			L.reread((x) => x.string),
			L.defaults(""),
		],
		renewDocument,
	);

	// const reserialized = view(
	// 	[
	// 		"json",
	// 		L.reread((j) => {
	// 			const s = serializerV11(j.refMap);
	// 			s.context.writeVersion();
	// 			s.context.writeStorable(j.drawing);
	// 			return s.output.join(" ");
	// 		}),
	// 	],
	// 	renewDocument,
	// );

	const sizeCache = view(["cachedSizes", L.defaults({})], renewDocument);

	const jsonLens = L.lens(
		(x) => x.json,
		(newJson, old) => {
			const s = serializerV11(newJson.refMap, {
				kind: kindKey,
				ref: refKey,
				self: selfKey,
			});
			s.context.writeVersion();
			s.context.writeStorable(newJson.drawing);
			return {
				selection: old.selection,
				string: s.output.join(" "),
				json: {
					version: 11,
					doctype: newJson.doctype,
					drawing: newJson.drawing,
					refMap: newJson.refMap,
				},
				cachedSizes: undefined,
			};
		},
	);

	const renewJsonCurrent = view(jsonLens, renewDocument);

	const renewJson = view(
		L.inverse(L.json({ space: "  " })),
		renewJsonCurrent,
	);

	const drawingTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.standard.StandardDrawing",
	);

	const rectTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.RectangleFigure",
		"CH.ifa.draw.figures.RoundRectangleFigure",
	);

	const ellipseTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.EllipseFigure",
	);
	const diagramTypes = hierarchyV11.descendantsOf(
		"de.renew.diagram.DiagramFigure",
	);

	const groupTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.GroupFigure",
	);

	const lineTypes = hierarchyV11.implementorsOf(
		"CH.ifa.draw.figures.PolyLineable",
	);
	const textTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.TextFigure",
	);
	const lineDecorationTypes = hierarchyV11.implementorsOf(
		"CH.ifa.draw.figures.LineDecoration",
	);

	const boxDecorationTypes = hierarchyV11.implementorsOf(
		"de.renew.diagram.FigureDecoration",
	);

	const renderedTypes = [
		...rectTypes,
		...ellipseTypes,
		...lineTypes,
		...textTypes,
		...diagramTypes,
		...groupTypes,
	];

	const selectableTypes = [
		...rectTypes,
		...ellipseTypes,
		...lineTypes,
		...textTypes,
		...diagramTypes,
		...groupTypes,
		...lineDecorationTypes,
		...boxDecorationTypes,
	];

	//console.log(boxDecorationTypes);

	//console.log(renderedTypes);

	const allRoots = [
		"CH.ifa.draw.figures.AbstractLocator",
		"CH.ifa.draw.figures.ArrowTip",
		"de.renew.gui.CircleDecoration",
		"CH.ifa.draw.standard.AbstractConnector",
		"de.renew.diagram.SplitDecoration",
	];

	// currently FigureIds are not GUARANTEED to be unique
	// const ids = view(
	// 	[
	// 		"json",
	// 		"drawing",
	// 		"figures",
	// 		L.partsOf(
	// 			L.elems,
	// 			L.when(R.prop("FigureWithID")),
	// 			"FigureWithID",
	// 		),
	// 	],
	// 	renewDocument,
	// );

	const rectangles = view(
		[
			"json",
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.compose(R.includes(R.__, rectTypes), R.prop(kindKey))),
			),
		],
		renewDocument,
	);

	const diagramFigs = view(
		[
			"json",
			"refMap",
			L.partsOf(
				L.elems,
				L.when(
					R.compose(R.includes(R.__, diagramTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const groupFigs = view(
		[
			"json",
			"refMap",
			L.partsOf(
				L.elems,
				L.when(
					R.compose(R.includes(R.__, groupTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const ellipses = view(
		[
			"json",
			"refMap",
			L.partsOf(
				L.elems,
				L.when(
					R.compose(R.includes(R.__, ellipseTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const lines = view(
		[
			"json",
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.compose(R.includes(R.__, lineTypes), R.prop(kindKey))),
			),
		],
		renewDocument,
	);

	const textes = view(
		[
			"json",
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.compose(R.includes(R.__, textTypes), R.prop(kindKey))),
			),
		],
		renewDocument,
	);

	const boundsLens = L.branch({
		sizeCache: [
			L.values,
			L.pick({
				minX: "x",
				maxX: (r) => r.x + r.width,
				minY: "y",
				maxY: (r) => r.y + r.height,
			}),
		],
		rectangles: [
			L.elems,
			L.pick({
				minX: "x",
				maxX: (r) => r.x + r.w,
				minY: "y",
				maxY: (r) => r.y + r.h,
			}),
		],
		ellipses: [
			L.elems,
			L.pick({
				minX: "x",
				maxX: (r) => r.x + r.w,
				minY: "y",
				maxY: (r) => r.y + r.h,
			}),
		],
		diagramFigs: [
			L.elems,
			"displayBox",
			L.pick({
				minX: "x",
				maxX: (r) => r.x + r.w,
				minY: "y",
				maxY: (r) => r.y + r.h,
			}),
		],
		textes: [
			L.elems,
			L.pick({
				minX: "fOriginX",
				maxX: "fOriginX",
				minY: "fOriginY",
				maxY: "fOriginY",
			}),
		],
		lines: [
			L.elems,
			L.pick({
				minX: [
					L.foldTraversalLens(L.minimum, ["points", L.elems, "x"]),
				],
				maxX: [
					L.foldTraversalLens(L.maximum, ["points", L.elems, "x"]),
				],
				minY: [
					L.foldTraversalLens(L.minimum, ["points", L.elems, "y"]),
				],
				maxY: [
					L.foldTraversalLens(L.maximum, ["points", L.elems, "y"]),
				],
			}),
		],
	});

	const extension = read(
		[
			L.pick({
				minX: [
					L.foldTraversalLens(L.minimum, [boundsLens, "minX"]),
					L.reread((x) => (isNaN(x) ? 0 : x)),
				],
				maxX: [
					L.foldTraversalLens(L.maximum, [boundsLens, "maxX"]),
					L.reread((x) => (isNaN(x) ? 0 : x)),
				],
				minY: [
					L.foldTraversalLens(L.minimum, [boundsLens, "minY"]),
					L.reread((x) => (isNaN(x) ? 0 : x)),
				],
				maxY: [
					L.foldTraversalLens(L.maximum, [boundsLens, "maxY"]),
					L.reread((x) => (isNaN(x) ? 0 : x)),
				],
			}),
		],
		combine({
			rectangles,
			textes,
			lines,
			ellipses,
			diagramFigs,
			sizeCache,
		}),
	);

	const extensionCurrentValue = $derived(extension.value);

	// const viewBox = view(
	// 	L.reread(
	// 		({ minX, minY, maxX, maxY }) =>
	// 			`${minX - 50} ${minY - 50} ${Math.max(600, maxX - minX) + 100} ${Math.max(200, maxY - minY) + 100}`,
	// 	),
	// 	worldBounds,
	// );

	const camera = atom({
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
	});
	const cameraScaleLens = L.reread((c) => Math.exp(-c.focus.z));

	const cameraX = view(["focus", "x"], camera);
	const cameraY = view(["focus", "y"], camera);
	const cameraScale = read(cameraScaleLens, camera);

	const scrollWindowSize = view(
		[
			L.lens(R.prop("frame"), (newSize) => ({
				frame: newSize,
				plane: newSize,
			})),
		],
		combine({
			plane: view(["plane", L.props("x", "y")], camera),
			frame: view(["frame", "size"], camera),
		}),
	);

	function rotatedBounds(degree, rect) {
		if (!rect) {
			return {
				angle: 0,
				minX: 0,
				maxX: 0,
				minY: 0,
				maxY: 0,
			};
		}
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

	const cameraBounds = read(
		({ c, e }) => {
			return rotatedBounds(c.focus.w, e);
		},
		combine({ c: camera, e: extension }),
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

	const integerLens = L.lens(
		(x) => Math.floor(x),
		(newV, oldV) => Math.ceil(newV) + (oldV - Math.floor(oldV)),
	);

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

	const boxPathLens = L.reread(
		({ minX, minY, width, height }) =>
			`M${numberSvgFormat.format(minX)},${numberSvgFormat.format(minY)}h${numberSvgFormat.format(width)}v${numberSvgFormat.format(height)}h${numberSvgFormat.format(-width)}z`,
	);

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

	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const viewBoxLens = L.reread((cam) => {
		return `${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.focus.y - (cam.plane.y / 2) * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.plane.x * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.plane.y * Math.exp(-cam.focus.z))}`;
	});
	const viewBox = view(viewBoxLens, camera);

	const version = view(["json", "version"], renewDocument);
	const doctype = view(["json", "doctype"], renewDocument);
	const refMap = view([jsonLens, "refMap"], renewDocument);

	// const renderedRefMap = view((map) => {
	// 	return map
	// 		.map(
	// 			(ref, i) =>
	// 				renderedTypes.indexOf(ref[kindKey]) > -1 ? i : null /*&&
	// 			!ref.attributes?.attrs.FigureWithID*/,
	// 		)
	// 		.filter((i) => i !== false && i !== null);
	// }, refMap);

	const renderedRefMap = view(
		[
			jsonLens,
			L.reread((x) => x.refMap[x.drawing["__ref"]]["figures"]),
			L.partsOf(
				L.elems,
				L.choices(
					(e) => e[selfKey],
					(e) => e.ref,
				),
			),
		],
		renewDocument,
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

	const dragging = atom(0);
	const debug = atom(false);
	const searchTerm = atom("");
	const selection = view(["selection", L.defaults([])], renewDocument);

	const currentSelection = $derived(selection.value);

	const onDragOver = (evt) => {
		if (evt.dataTransfer.items.length < 1) {
			dragging.value = 0;
			return;
		}
		evt.preventDefault();
		evt.dataTransfer.dropEffect = "copy";
	};

	const onDragEnter = (evt) => {
		if (evt.dataTransfer.items.length < 1) {
			return;
		}
		evt.preventDefault();
		dragging.value += 1;
	};

	const onDragLeave = (evt) => {
		evt.preventDefault();
		dragging.value -= 1;
	};

	async function refitCamera() {
		await tick();
		await tick();
		update(
			L.set(["focus", L.props("z", "x", "y", "w")], {
				x: (cameraBounds.value.maxX + cameraBounds.value.minX) / 2,
				y: (cameraBounds.value.maxY + cameraBounds.value.minY) / 2,
				z: -Math.max(
					Math.log(
						cameraBounds.value.maxX - cameraBounds.value.minX,
					) - Math.log(camera.value.plane.x),
					Math.log(
						cameraBounds.value.maxY - cameraBounds.value.minY,
					) - Math.log(camera.value.plane.y),
				),
				w: cameraBounds.value.angle,
			}),
			camera,
		);
	}

	const reader = new FileReader();
	reader.onload = (evt) => {
		renewSerialized.value = evt.target.result;
		refitCamera();
	};

	const onDragDrop = (evt) => {
		evt.preventDefault();
		dragging.value = 0;

		if (evt.dataTransfer.files.length === 1) {
			reader.readAsText(evt.dataTransfer.files[0]);
		}
	};

	function renewToRgba(color) {
		const NONE = { r: 255, g: 199, b: 158, a: 255 }; //WTF?
		if (!color) {
			return "rgba(0,0,0,0)";
		}
		if (Object.prototype.hasOwnProperty.call(color, "a")) {
			if (
				NONE.r == color.r &&
				NONE.g == color.g &&
				NONE.b == color.b &&
				NONE.a == color.a
			) {
				return "rgba(0,0,0,0)";
			}
			return `rgba(${color.r},${color.g},${color.b},${color.a / 255})`;
		} else if (
			Object.prototype.hasOwnProperty.call(color, "r") &&
			Object.prototype.hasOwnProperty.call(color, "g") &&
			Object.prototype.hasOwnProperty.call(color, "b")
		) {
			if (NONE.r == color.r && NONE.g == color.g && NONE.b == color.b) {
				return "rgba(0,0,0,0)";
			}
			return `rgb(${color.r},${color.g},${color.b})`;
		} else {
			return "rgb(0,0,0)";
		}
	}

	const defaultsAttributes = {
		FrameColor: { r: 0, g: 0, b: 0, a: 255 },
		FillColor: { r: 112, g: 219, b: 147 }, // new Color(0x70DB93),
		TextColor: { r: 0, g: 0, b: 0, a: 255 },
		TextAlignment: 0,
		ArrowMode: 0,
		FontName: "Helvetica",
		LineWidth: 1,
		LineStyle: "",
		FontSize: 12,
		FontStyle: 0,
		LineShape: 0,
		BSplineSegments: 15,
		BSplineDegree: 12,
		ArcScale: false,
	};

	function readAttribute(obj, attr) {
		return obj.attributes?.attrs[attr] ?? defaultsAttributes[attr] ?? null;
	}

	const textLineStyles = {
		"de.renew.gui.fs.ConceptFigure": {
			replace: (lineIndex, lineContent) => {
				const firstChar = lineContent[0];
				return ["_", "\\"].indexOf(firstChar) > -1
					? lineContent.substr(1)
					: lineContent;
			},
			attributes: (lineIndex, lineContent) => {
				const firstChar = lineContent[0];
				return {
					"font-weight": lineIndex == 0 ? "bold" : "normal",
					"font-style": firstChar == "\\" ? "italic" : "normal",
					"text-decoration":
						firstChar == "_" ? "underline" : "normal",
				};
			},
			backgroundAttributes: (
				x,
				y,
				width,
				height,
				lineIndex,
				lineContent,
			) => {
				return {};
			},
			backgroundPath: (x, y, width, height, lineIndex, lineContent) => {
				return lineIndex > 0 ? `M${x},${y}h${width}` : "";
			},
		},
	};

	const lineDecorations = {
		"de.renew.gui.AssocArrowTip": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 5;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}M${to.x},${to.y}l${(-dxn - orthoX * width) * size},${(-dyn - orthoY * width) * size}`;
			},
			attributes: () => ({
				fill: "none",
				stroke: "black",
			}),
		},
		"de.renew.gui.IsaArrowTip": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 10;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}l${-2 * orthoX * width * size},${-2 * orthoY * width * size}z`;
			},
			attributes: () => ({
				fill: "white",
				stroke: "black",
			}),
		},
		"de.renew.gui.fs.IsaArrowTip": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 10;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}l${-2 * orthoX * width * size},${-2 * orthoY * width * size}z`;
			},
			attributes: () => ({
				fill: "white",
				stroke: "black",
			}),
		},
		"de.renew.gui.fs.AssocArrowTip": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}M${to.x},${to.y}l${(-dxn - orthoX * width) * size},${(-dyn - orthoY * width) * size}`;
			},
			attributes: () => ({
				fill: "none",
				stroke: "black",
			}),
		},
		"de.renew.diagram.SynchronousMessageArrowTip": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.7;

				return `M${to.x},${to.y}l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}M${to.x},${to.y}l${(-dxn - orthoX * width) * size},${(-dyn - orthoY * width) * size}`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},
		"de.renew.gui.CircleDecoration": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 4;
				const width = 1;
				const angle = (180 / Math.PI) * Math.atan2(dy, dx);

				return `M${to.x},${to.y}
				m${-dxn * size},${-dyn * size}
				m${-orthoX * size * width},${-orthoY * size * width}
				a${size},${size * width}
				${angle} 1 1
				${2 * orthoX * size * width},${2 * orthoY * size * width}
				a${size},${size * width}
				${angle} 1 1
				${-2 * orthoX * size * width},${-2 * orthoY * size * width}
				`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},
		"CH.ifa.draw.figures.ArrowTip": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.4;
				const indent = -0.15;

				return `M${to.x},${to.y}
				l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}
				l${-orthoX * width * size + dxn * indent * size},${-orthoY * width * size + dyn * indent * size}
				l${-orthoX * width * size - dxn * indent * size},${-orthoY * width * size - dyn * indent * size}
				z`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},

		"de.renew.gui.DoubleArrowTip": {
			path: (from, to) => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dl = Math.hypot(dx, dy);

				const dxn = dx / dl;
				const dyn = dy / dl;
				const orthoX = -dyn;
				const orthoY = dxn;

				const size = 6;
				const width = 0.4;
				const indent = -0.15;

				return `M${to.x},${to.y}
				l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}
				l${-orthoX * width * size + dxn * indent * size},${-orthoY * width * size + dyn * indent * size}
				l${-orthoX * width * size - dxn * indent * size},${-orthoY * width * size - dyn * indent * size}
				z
				m${-dxn * size},${-dyn * size}
				l${(-dxn + orthoX * width) * size},${(-dyn + orthoY * width) * size}
				l${-orthoX * width * size + dxn * indent * size},${-orthoY * width * size + dyn * indent * size}
				l${-orthoX * width * size - dxn * indent * size},${-orthoY * width * size - dyn * indent * size}
				z`;
			},
			attributes: () => ({
				fill: "black",
				stroke: "black",
			}),
		},
	};

	const boxDecorations = {
		"de.renew.diagram.ANDDecoration": {
			path: (x, y, { size, halfSize }) => {
				return `M${x},${y}m${-halfSize},0l${halfSize},${halfSize}l${halfSize},${-halfSize}l${-halfSize},${-halfSize}z`;
			},
			attributes: () => {
				return {
					fill: "black",
				};
			},
		},
		"de.renew.diagram.XORDecoration": {
			path: (x, y, { size, halfSize }) => {
				return `M${x},${y}
				l${halfSize / 2},${halfSize / 2}l${halfSize / 2},${-halfSize / 2}l${-halfSize / 2},${-halfSize / 2}z
				l${-halfSize / 2},${-halfSize / 2}l${-halfSize / 2},${halfSize / 2}l${halfSize / 2},${halfSize / 2}z
				l${-halfSize / 2},${-halfSize / 2}l${halfSize / 2},${-halfSize / 2}l${halfSize / 2},${halfSize / 2}z
				l${halfSize / 2},${halfSize / 2}l${-halfSize / 2},${halfSize / 2}l${-halfSize / 2},${-halfSize / 2}z`;
			},
			attributes: () => {
				return {
					fill: "white",
					stroke: "black",
				};
			},
		},
	};

	const currentRefMap = $derived(refMap.value);
</script>

<h1>Renew File</h1>

<p>Load a renew file into the left text field.</p>
<p>
	It will be parsed and output as JSON on the right and rendered as SVG below.
</p>

<div style="display: flex; gap: 0.2em; align-items: baseline; flex-wrap: wrap;">
	{#each examples as example, e (e)}
		<button
			type="button"
			onclick={(e) => {
				renewSerialized.value = example;
				refitCamera();
			}}>File #{e + 1}</button
		>
	{/each}
	{#await moreExamples then filenames}
		<select
			oninput={(e) =>
				loadExample(e.currentTarget.value).then((x) => {
					renewSerialized.value = x.content;
					refitCamera();
				})}
		>
			{#each filenames as name}
				<option>{name}</option>
			{/each}
		</select>
	{:catch}
		<em style="color: #aaa"
			>Or Drop Renew Files from your own PC into the text field</em
		>
	{/await}
</div>

<div
	ondragover={onDragOver}
	ondragenter={onDragEnter}
	ondragleave={onDragLeave}
	ondrop={onDragDrop}
	role="application"
>
	<div class="beside" style="height: 15em">
		<textarea
			class="drop-target"
			placeholder="// Drop a renew file here"
			class:has-error={renewSerialized.hasError}
			bind:value={renewSerialized.value}
			class:dragging={dragging.value > 0}
		></textarea>
		<textarea bind:value={renewJson.value}></textarea>

		<div
			style="display: grid; flex-direction: column; align-items: stretch; align-content: stretch;flex-grow: 1; grid-template-rows: auto 1fr;"
		>
			<input
				type="search"
				placeholder="Search..."
				bind:value={searchTerm.value}
				style="flex-grow: 0; height: 2em;"
			/>
			<select size="10" bind:value={selection.value} multiple="multiple">
				{#each currentRefMap as ref, r (r)}
					{#if !searchTerm.value.length || ref[kindKey].indexOf(searchTerm.value) > -1}
						<option
							value={r}
							disabled={selectableTypes.indexOf(ref[kindKey]) < 0}
							>#{r} {ref[kindKey]}</option
						>
					{/if}
				{/each}
			</select>
		</div>
	</div>

	<div class="error-message" hidden={!renewSerialized.hasError}>
		<button type="button" onclick={renewSerialized.reset}>Reset</button>
		{renewSerialized.error}
	</div>

	<div class="error-message" hidden={!renewJson.hasError}>
		<button type="button" onclick={renewJson.reset}>Reset</button>
		{renewJson.error}
	</div>

	<label><input type="checkbox" bind:checked={debug.value} /> Debug</label>
	<div
		class:hidden={selection.value.length == 0}
		style=" position: fixed; top: 1em; left: 1em;z-index: 10000; max-height: 70vh; overflow: auto; color: #fff; "
	>
		<div
			style="display: flex; flex-direction: column; background: #333d; gap: 1em; padding: 0.5em"
		>
			<button
				type="button"
				onclick={(e) => {
					selection.value = [];
				}}>Clear Selection</button
			>
			{#each selection.value as s}
				{@const attrsSelected = read(
					[s, "attributes", "attrs", L.partsOf(L.keys)],
					refMap,
				)}
				{@const propsSelected = read(
					[
						s,
						L.partsOf(
							L.keys,
							L.when((x) => x != "attributes" && x[0] !== "_"),
						),
					],
					refMap,
				)}
				{@const selectedKind = read([s, kindKey], refMap)}
				<fieldset>
					<legend># {s} ({selectedKind.value})</legend>

					<h4>Props</h4>
					<dl>
						{#each propsSelected.value as prop}
							{@const isNumeric =
								[
									"x",
									"y",
									"w",
									"h",
									"fCurrentFontSize",
									"fCurrentFontStyle",
									"fOriginX",
									"fOriginY",
									"rotation",
								].indexOf(prop) > -1}
							{@const propValue = view(
								[
									s,
									prop,
									prop === "lines"
										? L.inverse(L.split("\n"))
										: L.identity,
									isNumeric
										? [L.setter((x) => parseFloat(x) || 0)]
										: L.identity,
								],
								refMap,
							)}
							<dt>{prop}</dt>
							<dd>
								{#if prop === "lines"}
									<textarea bind:value={propValue.value}
									></textarea>
								{:else}
									<input
										type={isNumeric ? "number" : "text"}
										bind:value={propValue.value}
									/>
								{/if}
							</dd>
						{/each}
					</dl>
					<h4>Attributes</h4>
					<dl>
						{#each attrsSelected.value as attr}
							{@const isColor = attr.indexOf("Color") > -1}
							{@const attrValue = view(
								[
									s,
									"attributes",
									"attrs",
									attr,
									isColor
										? [
												L.props("r", "g", "b"),
												L.lens(
													(x) =>
														`#${R.props(
															["r", "g", "b"],
															x,
														)
															.map((v) =>
																(
																	"0" +
																	v.toString(
																		16,
																	)
																)
																	.slice(-2)
																	.toUpperCase(),
															)
															.join("")}`,
													(hex) =>
														R.map(
															(c) =>
																parseInt(c, 16),
															hex.match(
																/#(?<r>[a-f0-9]{2})(?<g>[a-f0-9]{2})(?<b>[a-f0-9]{2})/,
															).groups,
														),
												),
											]
										: L.identity,
								],
								refMap,
							)}
							<dt>{attr}</dt>
							<dd>
								<input
									type={isColor ? "color" : "text"}
									bind:value={attrValue.value}
								/>
								{#if isColor}
									{@const alphaValue = view(
										[
											s,
											"attributes",
											"attrs",
											attr,
											"a",
											L.divide(255),
										],
										refMap,
									)}
									<input
										type={"number"}
										min="0"
										max="1"
										step="0.05"
										bind:value={alphaValue.value}
									/>
								{/if}
							</dd>
						{/each}
					</dl>
				</fieldset>
			{/each}
		</div>
	</div>

	{#if doctype.value}
		<h2>{doctype.value} (version: {version.value})</h2>
	{/if}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<Scroller
		allowOverscroll={false}
		alignment="center"
		extraScrollPadding={atom(true)}
		{scrollPosition}
		contentSize={scrollContentSize}
		{scrollWindowSize}
	>
		<svg
			class="canvas"
			viewBox={viewBox.value}
			preserveAspectRatio={preserveAspectRatio.value}
			tabindex="-1"
			role="button"
			onclick={(evt) => {
				if (evt.target.id && R.startsWith("ref-", evt.target.id)) {
					selection.value = evt.target.id.slice(4);
				} else if (
					evt.target.href &&
					evt.target.href.baseVal &&
					R.startsWith("#ref-", evt.target.href.baseVal)
				) {
					selection.value = [
						parseInt(evt.target.href.baseVal.slice(5), 10),
					];
				} else {
					selection.value = [];
				}
			}}
		>
			{#key currentRefMap}
				<defs>
					<g name="lines">
						{#each lines.value as line, i (line[selfKey])}
							{@const startDecoration = tryDeref(
								line,
								currentRefMap,
								["startDecoration"],
							)}
							{@const startConnector = tryDeref(
								line,
								currentRefMap,
								["start"],
							)}
							{@const startOwner = tryDeref(
								startConnector,
								currentRefMap,
								["owner"],
							)}

							{@const endDecoration = tryDeref(
								line,
								currentRefMap,
								["endDecoration"],
							)}
							{@const endConnector = tryDeref(
								line,
								currentRefMap,
								["end"],
							)}
							{@const endOwner = tryDeref(
								endConnector,
								currentRefMap,
								["owner"],
							)}
							<g
								class:selected={currentSelection.indexOf(
									line[selfKey],
								) > -1}
								id={/*line.attributes?.attrs.FigureWithID ??*/
								"ref-" + line[selfKey]}
							>
								<polyline
									points={R.join(
										" ",
										R.map(
											R.compose(
												R.join(" "),
												R.props(["x", "y"]),
											),
											line.points,
										),
									)}
									fill="none"
									class="clickarea"
									pointer-events="all"
									stroke={"transparent"}
									stroke-linecap="none"
									stroke-width={15}
									vector-effect="non-scaling-stroke"
								/>

								<polyline
									points={R.join(
										" ",
										R.map(
											R.compose(
												R.join(" "),
												R.props(["x", "y"]),
											),
											line.points,
										),
									)}
									fill="none"
									stroke={renewToRgba(
										readAttribute(line, "FrameColor"),
									)}
									stroke-width={readAttribute(
										line,
										"LineWidth",
									)}
									stroke-dasharray={readAttribute(
										line,
										"LineStyle",
									)}
								/>

								{#if endDecoration}
									{@const decorationType =
										endDecoration[kindKey]}
									{@const endPoint = R.last(line.points)}
									{@const preEndPoint = R.nth(
										-2,
										line.points,
									)}
									<g
										class:selected={currentSelection.indexOf(
											endDecoration[selfKey],
										) > -1}
									>
										{#if lineDecorations[decorationType]}
											<path
												d={lineDecorations[
													decorationType
												].path(preEndPoint, endPoint)}
												{...lineDecorations[
													decorationType
												].attributes()}
											/>
										{:else}
											<circle
												r="10"
												fill="red"
												fill-opacity="0.3"
												cx={endPoint.x}
												cy={endPoint.y}
											></circle>
											<text x={endPoint.x} y={endPoint.y}
												>{endDecoration[kindKey]}</text
											>
										{/if}
									</g>
								{/if}

								{#if startDecoration}
									{@const decorationType =
										startDecoration[kindKey]}
									{@const firstPoint = R.nth(0, line.points)}
									{@const secondPoint = R.nth(1, line.points)}

									<g
										pointer-events="all"
										class:selected={currentSelection.indexOf(
											startDecoration[selfKey],
										) > -1}
									>
										{#if lineDecorations[decorationType]}
											<path
												d={lineDecorations[
													decorationType
												].path(secondPoint, firstPoint)}
												{...lineDecorations[
													decorationType
												].attributes()}
											/>
										{:else}
											<circle
												r="10"
												fill="red"
												fill-opacity="0.3"
												cx={firstPoint.x}
												cy={firstPoint.y}
											></circle>
											<text
												x={firstPoint.x}
												y={firstPoint.y}
												>{decorationType}</text
											>
										{/if}
									</g>
								{/if}
							</g>
						{/each}
					</g>

					<g name="rects">
						{#each rectangles.value as rect, i (rect[selfKey])}
							<g
								class:selected={currentSelection.indexOf(
									rect[selfKey],
								) > -1}
								id={/*rect.attributes?.attrs.FigureWithID ??*/
								"ref-" + rect[selfKey]}
							>
								<g
									fill={renewToRgba(
										readAttribute(rect, "FillColor"),
									)}
									stroke={renewToRgba(
										readAttribute(rect, "FrameColor"),
									)}
									stroke-width={readAttribute(
										rect,
										"LineWidth",
									)}
									stroke-dasharray={readAttribute(
										rect,
										"LineStyle",
									)}
									text-rendering="geometricPrecision"
								>
									{#if rect[kindKey] === "CH.ifa.draw.contrib.DiamondFigure"}
										<polygon
											points="{rect.x +
												rect.w / 2} {rect.y}
						{rect.x + rect.w} {rect.y + rect.h / 2}
						{rect.x + rect.w / 2} {rect.y + rect.h}
						{rect.x} {rect.y + rect.h / 2}"
											fill="none"
											class="clickarea"
											pointer-events="all"
											stroke={"transparent"}
											stroke-linecap="none"
											stroke-width={15}
											vector-effect="non-scaling-stroke"
										/>
										<polygon
											points="{rect.x +
												rect.w / 2} {rect.y}
						{rect.x + rect.w} {rect.y + rect.h / 2}
						{rect.x + rect.w / 2} {rect.y + rect.h}
						{rect.x} {rect.y + rect.h / 2}"
										/>
									{:else if rect[kindKey] === "CH.ifa.draw.contrib.TriangleFigure"}
										{@const corners = [
											{
												x: rect.x + rect.w / 2,
												y: rect.y,
											},
											{
												x: rect.x + rect.w,
												y: rect.y,
											},
											{
												x: rect.x + rect.w,
												y: rect.y + rect.h / 2,
											},
											{
												x: rect.x + rect.w,
												y: rect.y + rect.h,
											},
											{
												x: rect.x + rect.w / 2,
												y: rect.y + rect.h,
											},
											{
												x: rect.x,
												y: rect.y + rect.h,
											},
											{
												x: rect.x,
												y: rect.y + rect.h / 2,
											},
											{ x: rect.x, y: rect.y },
										]}
										{@const i1 =
											((rect.rotation % 8) + 8) % 8}
										{@const i2 = (i1 + 3 - (i1 % 2)) % 8}
										{@const i3 = (i1 + 5 + (i1 % 2)) % 8}
										<polygon
											points="{corners[i1].x} {corners[i1]
												.y}
									{corners[i2].x} {corners[i2].y}
									{corners[i3].x} {corners[i3].y}"
											fill="none"
											class="clickarea"
											pointer-events="all"
											stroke={"transparent"}
											stroke-linecap="none"
											stroke-width={15}
											vector-effect="non-scaling-stroke"
										/>
										<polygon
											points="{corners[i1].x} {corners[i1]
												.y}
									{corners[i2].x} {corners[i2].y}
									{corners[i3].x} {corners[i3].y}"
										/>
									{:else}
										<rect
											x={rect.x}
											y={rect.y}
											rx={rect.arcWidth ?? 0 / 2}
											ry={rect.arcHeight ?? 0 / 2}
											width={rect.w}
											height={rect.h}
										/>
									{/if}
								</g>
								<text
									class:hidden={!debug.value}
									text-rendering="geometricPrecision"
									x={rect.x + rect.w / 2}
									y={rect.y}
									text-anchor="middle"
									font-size="7"
									fill="royalblue"
									font-family="monospace"
									title={rect[kindKey]}
								>
									{rect[kindKey]}</text
								>
							</g>
						{/each}
					</g>

					<g name="ellipses">
						{#each ellipses.value as ellipse, i (ellipse[selfKey])}
							<g
								class:selected={currentSelection.indexOf(
									ellipse[selfKey],
								) > -1}
								id={/*ellipse.attributes?.attrs.FigureWithID ??*/
								"ref-" + ellipse[selfKey]}
							>
								<g
									fill={renewToRgba(
										readAttribute(ellipse, "FillColor"),
									)}
									stroke={renewToRgba(
										readAttribute(ellipse, "FrameColor"),
									)}
									stroke-width={readAttribute(
										ellipse,
										"LineWidth",
									)}
									stroke-dasharray={readAttribute(
										ellipse,
										"LineStyle",
									)}
									text-rendering="geometricPrecision"
								>
									<ellipse
										cx={ellipse.x + ellipse.w / 2}
										cy={ellipse.y + ellipse.h / 2}
										rx={ellipse.w / 2}
										ry={ellipse.h / 2}
									/>
								</g>

								<text
									class:hidden={!debug.value}
									text-rendering="geometricPrecision"
									x={ellipse.x + ellipse.w / 2}
									y={ellipse.y}
									text-anchor="middle"
									font-size="7"
									fill="royalblue"
									font-family="monospace"
									title={ellipse[kindKey]}
									>{R.last(ellipse[kindKey].split("."))}</text
								>
							</g>
						{/each}
					</g>

					<g name="diagramFigs">
						{#each diagramFigs.value as diag, i (diag[selfKey])}
							{@const decoration = tryDeref(
								diag,
								currentRefMap,
								["decoration"],
								diag[kindKey] ===
									"de.renew.diagram.HSplitFigure",
							)}
							<g
								class:selected={currentSelection.indexOf(
									diag[selfKey],
								) > -1}
								id={/*diag.attributes?.attrs.FigureWithID ??*/
								"ref-" + diag[selfKey]}
							>
								<g
									fill={renewToRgba(
										readAttribute(diag, "FillColor"),
									)}
									stroke={renewToRgba(
										readAttribute(diag, "FrameColor"),
									)}
									stroke-width={readAttribute(
										diag,
										"LineWidth",
									)}
									stroke-dasharray={readAttribute(
										diag,
										"LineStyle",
									)}
								>
									<rect
										x={diag.displayBox.x}
										y={diag.displayBox.y}
										width={diag.displayBox.w}
										height={diag.displayBox.h}
									/>
								</g>

								{#if decoration}
									{@const decorationKind =
										decoration[kindKey]}
									<g
										pointer-events="all"
										class:selected={currentSelection.indexOf(
											decoration[selfKey],
										) > -1}
									>
										{#if boxDecorations[decorationKind]}
											{@const x =
												diag.displayBox.x +
												diag.displayBox.w / 2}
											{@const y =
												diag.displayBox.y +
												diag.displayBox.h / 2}

											<path
												d={boxDecorations[
													decorationKind
												].path(x, y, decoration)}
												{...boxDecorations[
													decorationKind
												].attributes()}
											/>
										{:else}
											<text
												class:hidden={!debug.value}
												shape-rendering="geometricPrecision"
												x={diag.displayBox.x}
												y={diag.displayBox.y}
												text-anchor="middle"
												font-size="17"
												fill="red"
												font-family="monospace"
												>{decorationKind}</text
											>
										{/if}
									</g>
								{/if}

								<text
									class:hidden={!debug.value}
									text-rendering="geometricPrecision"
									x={diag.displayBox.x +
										diag.displayBox.w / 2}
									y={diag.displayBox.y}
									text-anchor="middle"
									font-size="12"
									fill="royalblue"
									font-family="monospace"
									title={diag[kindKey]}
									>{R.last(diag[kindKey].split("."))}</text
								>
							</g>
						{/each}
					</g>

					<g name="groupFigs">
						{#each groupFigs.value as group, i (group[selfKey])}
							{@const id =
								/*text.attributes?.attrs.FigureWithID ??*/
								"ref-" + group[selfKey]}
							<g
								{id}
								class:selected={currentSelection.indexOf(
									group[selfKey],
								) > -1}
							>
								{#each group.figures as f}
									<use href="#ref-{f[selfKey] || f.ref}" />
								{/each}
							</g>
						{/each}
					</g>

					<g name="textes">
						{#each textes.value as text, i (text[selfKey])}
							{@const id =
								/*text.attributes?.attrs.FigureWithID ??*/
								"ref-" + text[selfKey]}
							{@const measuredSize = view(
								[
									"id" + id,
									L.props("x", "y", "width", "height"),
								],
								sizeCache,
							)}
							{@const fontSize =
								text.fCurrentFontSize ??
								readAttribute(text, "FontSize")}
							{@const fontStyle =
								text.fCurrentFontStyle ??
								readAttribute(text, "FontStyle")}
							{@const fontFamily =
								text.fCurrentFontName ??
								readAttribute(text, "FontName")}
							{@const textColor = renewToRgba(
								readAttribute(text, "TextColor"),
							)}
							{@const textAlignment = readAttribute(
								text,
								"TextAlignment",
							)}
							{@const measureValue = measuredSize.value}
							{@const lineCount = R.count(
								R.isNotEmpty,
								text.lines,
							)}
							{@const textX =
								1 * text.fOriginX +
								(measureValue
									? (measureValue.width * textAlignment) / 2
									: 0)}
							{@const lines = text.lines}
							{@const textLineStyle =
								textLineStyles[text[kindKey]]}
							<g
								{id}
								class:selected={currentSelection.indexOf(
									text[selfKey],
								) > -1}
							>
								{#if measureValue}
									<g
										fill={renewToRgba(
											readAttribute(text, "FillColor"),
										)}
										stroke={renewToRgba(
											readAttribute(text, "FrameColor"),
										)}
										stroke-width={readAttribute(
											text,
											"LineWidth",
										)}
										stroke-dasharray={readAttribute(
											text,
											"LineStyle",
										)}
									>
										<rect
											width={measureValue.width + 2}
											height={measureValue.height + 2}
											x={text.fOriginX - 1}
											y={text.fOriginY - 1}
										/>

										{#if lineCount && textLineStyle}
											{#each R.reject(R.isEmpty, lines) as line, l}
												{@const width =
													measureValue.width + 2}}
												{@const height =
													(measureValue.height + 2) /
													lineCount}
												{@const x =
													1 * text.fOriginX - 1}
												{@const y =
													1 * text.fOriginY +
													l *
														((measureValue.height +
															2) /
															lineCount)}
												<path
													d={textLineStyle.backgroundPath(
														x,
														y,
														width,
														height,
														l,
														line,
													)}
													{...textLineStyle.backgroundAttributes(
														x,
														y,
														width,
														height,
														l,
														line,
													)}
												/>
											{/each}
										{/if}
									</g>
								{/if}

								<text
									x={textX}
									y={text.fOriginY + fontSize}
									fill={textColor}
									font-family={fontFamily.replace(
										"SansSerif",
										"sans-serif",
									)}
									font-weight={fontStyle == 1
										? "bold"
										: "normal"}
									font-style={fontStyle == 2
										? "italic"
										: "normal"}
									text-anchor={measureValue
										? ["start", "middle", "end"][
												textAlignment
											]
										: "start"}
									font-size={fontSize}
									text-rendering="geometricPrecision"
								>
									{#each lines as line, l (l)}
										{@const replacedLine = textLineStyle
											? textLineStyles[
													text[kindKey]
												].replace(l, line)
											: line}
										<tspan
											x={textX}
											dy={l ? "1.2em" : "0"}
											{...textLineStyle?.attributes(
												l,
												line,
											)}
											text-anchor={measureValue
												? ["start", "middle", "end"][
														textAlignment
													]
												: "start"}>{replacedLine}</tspan
										>
									{/each}
								</text>

								<text
									class:hidden={!debug.value}
									text-rendering="geometricPrecision"
									x={textX}
									y={text.fOriginY}
									text-anchor="middle"
									font-size="7"
									fill="royalblue"
									font-family="monospace"
									title={text[kindKey]}
								>
									{text[kindKey]} ({lines.length})</text
								>
							</g>
						{/each}
					</g>
				</defs>
			{/key}
			<!-- {#each ids.value as id, i (i)}
					{@const measuredSize = view(
						[
							"id" + id,
							L.removable("x", "y", "width", "height"),
							L.props("x", "y", "width", "height"),
						],
						sizeCache,
					)}
					<use href="#{id}" use:bindBoundingBox={measuredSize} />
				{/each} -->

			<Navigator {camera} {frameBoxPath}>
				<g pointer-events="none" transform={rotationTransform.value}>
					{#if extensionCurrentValue}
						<rect
							x={extensionCurrentValue.minX}
							y={extensionCurrentValue.minY}
							width={extensionCurrentValue.maxX -
								extensionCurrentValue.minX}
							height={extensionCurrentValue.maxY -
								extensionCurrentValue.minY}
							fill="#ffeeee"
						/>
					{/if}
					{#key currentRefMap}
						{#each renderedRefMap.value as ref, i}
							{@const id = "ref-" + ref}
							{@const measuredSize = view(
								[
									"id" + id,
									L.removable("x", "y", "width", "height"),
									L.props("x", "y", "width", "height"),
								],
								sizeCache,
							)}
							<use
								href="#{id}"
								use:bindBoundingBox={measuredSize}
							/>
						{/each}
					{/key}
				</g>
			</Navigator>
		</svg>
	</Scroller>
</div>

<style>
	h2 {
		word-break: break-word;
	}

	svg {
		-webkit-user-callout: none;
		width: 100%;
		resize: both;
		shape-rendering: geometricPrecision;

		position: absolute;
		display: block;
		grid-area: 1/1/1/1;
		place-self: stretch;
		width: 100%;
		height: 100%;

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

	.drop-target {
		border: 0.5em solid gray;
	}

	.drop-target.dragging {
		border-color: lime;
	}

	textarea {
		outline: none;
	}

	.hidden {
		display: none;
	}

	.selected rect {
		stroke: #ff6666aa;
		stroke-width: 5;
		pointer-events: none;
	}
	.selected ellipse {
		stroke: #ff6666aa;
		stroke-width: 5;
		pointer-events: none;
	}
	.selected path {
		stroke: #ff6666aa;
		pointer-events: none;
		stroke-width: 5;
	}
	.selected polyline.clickarea {
		stroke: #ff6666aa;
		pointer-events: none;
	}
	.selected polygon.clickarea {
		stroke: #ff6666aa;
		pointer-events: none;
	}
	.selected:has(use) {
		stroke: #ff6666aa;
		pointer-events: none;
		outline: 2px solid #ff6666aa;
	}

	.selected > use {
		stroke: #ff666633;
		pointer-events: none;
		outline: 2px solid #ff666633;
	}

	.selected {
		transform: scale(1, 1);
		transform-origin: center center;
		transform-box: fill-box;
	}
	use {
		pointer-events: all;
	}

	dl {
		display: grid;
		grid-template-columns: auto auto;
	}

	dt,
	dd {
		margin: 0;
		padding: 0;
	}
</style>
