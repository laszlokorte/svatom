<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
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
	} from "../svatom.svelte.js";

	import {
		parserAutoDetect,
		stringify,
		hierarchyV11,
		kindKey,
		tryDeref,
		selfKey,
	} from "../../renew/index.js";

	import exampleActor from "./actors.rnw?raw";
	import exampleCloseDoor from "./closedoor.rnw?raw";
	import exampleRenew from "./example.rnw?raw";
	import exampleAip from "./example.aip?raw";

	const examples = [exampleActor, exampleCloseDoor, exampleRenew, exampleAip];

	const renewDocument = atom({ string: undefined, json: undefined });
	const renewSerialized = failableView(
		[
			L.rewrite((x) => {
				try {
					return {
						string: x,
						json: parserAutoDetect(x, false, "__kind"),
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

	const sizeCache = view(["cachedSizes", L.defaults({})], renewDocument);

	const renewJson = read(
		[
			"json",
			L.props("version", "doctype", "drawing"),
			L.inverse(L.json({ space: "  " })),
		],
		renewDocument,
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
	];

	const selectableTypes = [
		...rectTypes,
		...ellipseTypes,
		...lineTypes,
		...textTypes,
		...diagramTypes,
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
	// 			L.satisfying(R.prop("FigureWithID")),
	// 			"FigureWithID",
	// 		),
	// 	],
	// 	renewDocument,
	// );

	const rectangles = view(
		[
			"json",
			"drawing",
			"figures",
			L.partsOf(
				L.elems,
				L.satisfying(
					R.compose(R.includes(R.__, rectTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const diagramFigs = view(
		[
			"json",
			"drawing",
			"figures",
			L.partsOf(
				L.elems,
				L.satisfying(
					R.compose(R.includes(R.__, diagramTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const ellipses = view(
		[
			"json",
			"drawing",
			"figures",
			L.partsOf(
				L.elems,
				L.satisfying(
					R.compose(R.includes(R.__, ellipseTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const lines = view(
		[
			"json",
			"drawing",
			"figures",
			L.partsOf(
				L.elems,
				L.satisfying(
					R.compose(R.includes(R.__, lineTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const textes = view(
		[
			"json",
			"drawing",
			"figures",
			L.partsOf(
				L.elems,
				L.satisfying(
					R.compose(R.includes(R.__, textTypes), R.prop(kindKey)),
				),
			),
		],
		renewDocument,
	);

	const boundsLens = L.branch({
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

	const worldBounds = read(
		[
			L.pick({
				minX: [L.foldTraversalLens(L.minimum, [boundsLens, "minX"])],
				maxX: [L.foldTraversalLens(L.maximum, [boundsLens, "maxX"])],
				minY: [L.foldTraversalLens(L.minimum, [boundsLens, "minY"])],
				maxY: [L.foldTraversalLens(L.maximum, [boundsLens, "maxY"])],
			}),
		],
		combine({ rectangles, textes, lines, ellipses, diagramFigs }),
	);

	const viewBox = view(
		L.reread(
			({ minX, minY, maxX, maxY }) =>
				`${minX - 50} ${minY - 50} ${Math.max(600, maxX - minX) + 100} ${Math.max(200, maxY - minY) + 100}`,
		),
		worldBounds,
	);
	const version = view(["json", "version"], renewDocument);
	const doctype = view(["json", "doctype"], renewDocument);
	const refMap = view(["json", "refMap"], renewDocument);

	const renderedRefMap = view((map) => {
		return map
			.map(
				(ref, i) =>
					renderedTypes.indexOf(ref[kindKey]) > -1 ? i : null /*&&
				!ref.attributes?.attrs.FigureWithID*/,
			)
			.filter((i) => i !== false && i !== null);
	}, refMap);

	const dragging = atom(0);
	const debug = atom(false);
	const selection = view(["selection", L.defaults([])], renewDocument);

	const currentSelection = $derived(selection.value);

	const onDragOver = (evt) => {
		if (evt.dataTransfer.items.length < 1) {
			dragging.value = 0;
			return;
		}
		evt.preventDefault();
		evt.dataTransfer.dropEffect = "copy";
		dragging.value += 1;
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

	const reader = new FileReader();
	reader.onload = (evt) => {
		renewSerialized.value = evt.target.result;
	};

	const onDragDrop = (evt) => {
		evt.preventDefault();
		dragging.value = 0;

		if (evt.dataTransfer.files.length === 1) {
			reader.readAsText(evt.dataTransfer.files[0]);
		}
	};

	function renewToRgba(color) {
		const NONE = [255, 199, 158, 255]; //WTF?
		if (!color) {
			return "rgba(0,0,0,0)";
		}
		if (color.length == 4) {
			if (
				NONE[0] == color[0] &&
				NONE[1] == color[1] &&
				NONE[2] == color[2] &&
				NONE[3] == color[3]
			) {
				return "rgba(0,0,0,0)";
			}
			return `rgba(${color[0]},${color[1]},${color[2]},${color[3] / 255})`;
		} else if (color.length == 3) {
			if (
				NONE[0] == color[0] &&
				NONE[1] == color[1] &&
				NONE[2] == color[2]
			) {
				return "rgba(0,0,0,0)";
			}
			return `rgb(${color[0]},${color[1]},${color[2]})`;
		} else {
			return "rgb(0,0,0)";
		}
	}

	const defaultsAttributes = {
		FrameColor: [0, 0, 0, 255],
		FillColor: [112, 219, 147], // new Color(0x70DB93),
		TextColor: [0, 0, 0, 255],
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
				const width = 0.6;
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
	};

	const boxDecorations = {
		"de.renew.diagram.ANDDecoration": {
			path: (x, y, { size, halfSize }) => {
				return `M${x},${y}m${-halfSize},0l${halfSize},${halfSize}l${halfSize},${-halfSize}l${-halfSize},${-halfSize}z`;
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

<div style="display: flex; gap: 0.2em">
	{#each examples as example, e (e)}
		<button
			type="button"
			onclick={(e) => {
				renewSerialized.value = example;
			}}>File #{e + 1}</button
		>
	{/each}
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
		<textarea readonly>{renewJson.value}</textarea>

		<select size="10" bind:value={selection.value} multiple="multiple">
			{#each currentRefMap as ref, r (r)}
				<option
					value={r}
					disabled={selectableTypes.indexOf(ref[kindKey]) < 0}
					>#{r} {ref[kindKey]}</option
				>
			{/each}
		</select>
	</div>

	<div class="error-message" hidden={!renewSerialized.hasError}>
		<button type="button" onclick={renewSerialized.reset}>Reset</button>
		{renewSerialized.error}
	</div>

	<label><input type="checkbox" bind:checked={debug.value} /> Debug</label>

	{#if viewBox.value}
		<h2>{doctype.value} (version: {version.value})</h2>
		{#key currentRefMap}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<svg
				tabindex="-1"
				role="button"
				viewBox={viewBox.value}
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
									vector-effect="non-scaling-stroke"
								/>
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
									vector-effect="non-scaling-stroke"
									shape-rendering="crispEdges"
								>
									{#if rect[kindKey] === "CH.ifa.draw.contrib.DiamondFigure"}
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
											{ x: rect.x + rect.w, y: rect.y },
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
											{ x: rect.x, y: rect.y + rect.h },
											{
												x: rect.x,
												y: rect.y + rect.h / 2,
											},
											{ x: rect.x, y: rect.y },
										]}
										<polygon
											points="{corners[rect.rotation]
												.x} {corners[rect.rotation].y}
									{corners[(rect.rotation + 3 - (rect.rotation % 2)) % 8].x} {corners[
												(rect.rotation +
													3 -
													(rect.rotation % 2)) %
													8
											].y}
									{corners[(rect.rotation + 5 + (rect.rotation % 2)) % 8].x} {corners[
												(rect.rotation +
													5 +
													(rect.rotation % 2)) %
													8
											].y}"
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
									shape-rendering="geometricPrecision"
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
									vector-effect="non-scaling-stroke"
									shape-rendering="crispEdges"
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
									shape-rendering="geometricPrecision"
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
									vector-effect="non-scaling-stroke"
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
									shape-rendering="geometricPrecision"
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

					<g name="textes">
						{#each textes.value as text, i (text[selfKey])}
							{@const id =
								/*text.attributes?.attrs.FigureWithID ??*/
								"ref-" + text[selfKey]}
							{@const measuredSize = view(
								["id" + id, L.props("width", "height")],
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
							{@const textX =
								text.fOriginX +
								(measureValue
									? (measureValue.width * textAlignment) / 2
									: 0)}
							<g
								{id}
								class:selected={currentSelection.indexOf(
									text[selfKey],
								) > -1}
							>
								{#if measureValue}
									<rect
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
										width={measureValue.width + 2}
										height={measureValue.height + 2}
										x={text.fOriginX - 1}
										y={text.fOriginY - 1}
									/>
								{/if}
								<text
									x={textX}
									y={text.fOriginY + fontSize}
									fill={textColor}
									font-family={fontFamily.replace(
										"SansSerif",
										"sans-serif",
									)}
									font-weight={fontStyle === 1
										? "bold"
										: "normal"}
									font-style={fontStyle === 2
										? "italic"
										: "normal"}
									text-anchor={["start", "middle", "end"][
										textAlignment
									]}
									font-size={fontSize}
								>
									{#each text.text.split("\n") as line, l (l)}
										<tspan
											x={textX}
											dy={l ? "1.2em" : "0"}
											text-anchor={[
												"start",
												"middle",
												"end",
											][textAlignment]}>{line}</tspan
										>
									{/each}
								</text>
							</g>
						{/each}
					</g>
				</defs>
				<!-- {#each ids.value as id, i (i)}
					{@const measuredSize = view(
						[
							"id" + id,
							L.removable("width", "height"),
							L.props("width", "height"),
						],
						sizeCache,
					)}
					<use href="#{id}" use:bindBoundingBox={measuredSize} />
				{/each} -->
				{#each renderedRefMap.value as ref, i}
					{@const id = "ref-" + ref}
					{@const measuredSize = view(
						[
							"id" + id,
							L.removable("width", "height"),
							L.props("width", "height"),
						],
						sizeCache,
					)}
					<use href="#{id}" use:bindBoundingBox={measuredSize} />
				{/each}
			</svg>
		{/key}
	{/if}
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
		paint-order: stroke;
		stroke: #ff6666aa;
		stroke-width: 5;
	}
	.selected path {
		paint-order: stroke;
		stroke: #ff6666aa;
		stroke-width: 5;
	}
	.selected polyline.clickarea {
		paint-order: stroke;
		stroke: #ff6666aa;
	}

	.selected {
		transform: scale(1, 1);
		transform-origin: center center;
		transform-box: fill-box;
	}
	use {
		pointer-events: all;
	}
</style>
