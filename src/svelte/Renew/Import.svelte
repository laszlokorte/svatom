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
						json: parserAutoDetect(x, false),
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
		["json", L.inverse(L.json({ space: "  " }))],
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

	// console.log(diagramTypes);

	const lineTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.PolyLineFigure",
	);
	const textTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.TextFigure",
	);

	const allRoots = [
		"CH.ifa.draw.figures.AbstractLocator",
		"CH.ifa.draw.figures.ArrowTip",
		"de.renew.gui.CircleDecoration",
		"CH.ifa.draw.standard.AbstractConnector",
		"de.renew.diagram.SplitDecoration",
	];

	const ids = view(
		[
			"json",
			"drawing",
			"figures",
			L.partsOf(
				L.elems,
				L.satisfying(R.prop("FigureWithID")),
				"FigureWithID",
			),
		],
		renewDocument,
	);

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

	const dragging = atom(0);
	const debug = atom(false);

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
			}}>Example #{e + 1}</button
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
	</div>

	<div class="error-message" hidden={!renewSerialized.hasError}>
		<button type="button" onclick={renewSerialized.reset}>Reset</button>
		{renewSerialized.error}
	</div>

	<label><input type="checkbox" bind:checked={debug.value} /> Debug</label>

	{#if viewBox.value}
		<h2>{doctype.value} (version: {version.value})</h2>
		<svg viewBox={viewBox.value}>
			<defs>
				{#each lines.value as line}
					<polyline
						id={line.attributes?.attrs.FigureWithID ??
							"auto-id" + refMap.value.indexOf(line)}
						points={R.join(
							" ",
							R.map(
								R.compose(R.join(" "), R.props(["x", "y"])),
								line.points,
							),
						)}
						fill="none"
						stroke={renewToRgba(readAttribute(line, "FrameColor"))}
						stroke-width={readAttribute(line, "LineWidth")}
						stroke-dasharray={readAttribute(line, "LineStyle")}
						vector-effect="non-scaling-stroke"
					/>
				{/each}

				{#each rectangles.value as rect}
					<g
						id={rect.attributes?.attrs.FigureWithID ??
							"auto-id" + refMap.value.indexOf(rect)}
					>
						<g
							fill={renewToRgba(readAttribute(rect, "FillColor"))}
							stroke={renewToRgba(
								readAttribute(rect, "FrameColor"),
							)}
							stroke-width={readAttribute(rect, "LineWidth")}
							stroke-dasharray={readAttribute(rect, "LineStyle")}
							vector-effect="non-scaling-stroke"
							shape-rendering="crispEdges"
						>
							{#if rect[kindKey] === "CH.ifa.draw.contrib.DiamondFigure"}
								<polygon
									points="{rect.x + rect.w / 2} {rect.y}
						{rect.x + rect.w} {rect.y + rect.h / 2}
						{rect.x + rect.w / 2} {rect.y + rect.h}
						{rect.x} {rect.y + rect.h / 2}"
								/>
							{:else if rect[kindKey] === "CH.ifa.draw.contrib.TriangleFigure"}
								{@const corners = [
									{ x: rect.x + rect.w / 2, y: rect.y },
									{ x: rect.x + rect.w, y: rect.y },
									{
										x: rect.x + rect.w,
										y: rect.y + rect.h / 2,
									},
									{ x: rect.x + rect.w, y: rect.y + rect.h },
									{
										x: rect.x + rect.w / 2,
										y: rect.y + rect.h,
									},
									{ x: rect.x, y: rect.y + rect.h },
									{ x: rect.x, y: rect.y + rect.h / 2 },
									{ x: rect.x, y: rect.y },
								]}
								<polygon
									points="{corners[rect.rotation].x} {corners[
										rect.rotation
									].y}
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

				{#each ellipses.value as ellipse}
					<g
						id={ellipse.attributes?.attrs.FigureWithID ??
							"auto-id" + refMap.value.indexOf(ellipse)}
					>
						<g
							fill={renewToRgba(
								readAttribute(ellipse, "FillColor"),
							)}
							stroke={renewToRgba(
								readAttribute(ellipse, "FrameColor"),
							)}
							stroke-width={readAttribute(ellipse, "LineWidth")}
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

				{#each diagramFigs.value as diag}
					<g
						id={diag.attributes?.attrs.FigureWithID ??
							"auto-id" + refMap.value.indexOf(diag)}
					>
						<g
							fill={renewToRgba(readAttribute(diag, "FillColor"))}
							stroke={renewToRgba(
								readAttribute(diag, "FrameColor"),
							)}
							stroke-width={readAttribute(diag, "LineWidth")}
							stroke-dasharray={readAttribute(diag, "LineStyle")}
							vector-effect="non-scaling-stroke"
						>
							<rect
								x={diag.displayBox.x}
								y={diag.displayBox.y}
								width={diag.displayBox.w}
								height={diag.displayBox.h}
							/>
						</g>

						<text
							class:hidden={!debug.value}
							shape-rendering="geometricPrecision"
							x={diag.displayBox.x + diag.displayBox.w / 2}
							y={diag.displayBox.y}
							text-anchor="middle"
							font-size="7"
							fill="royalblue"
							font-family="monospace"
							title={diag[kindKey]}
							>{R.last(diag[kindKey].split("."))}</text
						>
					</g>
				{/each}

				{#each textes.value as text, i (i)}
					{@const id =
						text.attributes?.attrs.FigureWithID ??
						"auto-id" + refMap.value.indexOf(text)}
					{@const measuredSize = view(
						["id" + id, L.props("x", "y", "width", "height")],
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
					{@const TextAlignment =
						0 && readAttribute(text, "TextAlignment")}
					{@const measureValue = measuredSize.value}
					<g {id}>
						{#if measureValue}
							<rect
								fill={renewToRgba(
									readAttribute(text, "FillColor"),
								)}
								stroke={renewToRgba(
									readAttribute(text, "FrameColor"),
								)}
								stroke-width={readAttribute(text, "LineWidth")}
								stroke-dasharray={readAttribute(
									text,
									"LineStyle",
								)}
								{...measureValue}
							/>
						{/if}
						<text
							x={text.fOriginX}
							y={text.fOriginY}
							fill={textColor}
							font-family={fontFamily.replace(
								"SansSerif",
								"sans-serif",
							)}
							font-weight={fontStyle === 1 ? "bold" : "normal"}
							font-style={fontStyle === 2 ? "italic" : "normal"}
							text-anchor={["start", "middle", "end"][
								TextAlignment
							]}
							font-size={fontSize}
							dominant-baseline="hanging"
						>
							{#each text.text.split("\n") as line, l (l)}
								<tspan
									x={text.fOriginX}
									dy={l ? "1.2em" : "0.2em"}
									text-anchor={["start", "middle", "end"][
										TextAlignment
									]}>{line}</tspan
								>
							{/each}
						</text>
					</g>
				{/each}
			</defs>

			{#each ids.value as id, i (i)}
				{@const measuredSize = view(
					[
						"id" + id,
						L.removable("x", "y", "width", "height"),
						L.props("x", "y", "width", "height"),
					],
					sizeCache,
				)}
				<use href="#{id}" use:bindBoundingBox={measuredSize} />
			{/each}
			{#each refMap.value as ref, i (i)}
				{#if !ref.attributes?.attrs.FigureWithID}
					{@const id = "auto-id" + i}
					{@const measuredSize = view(
						[
							"id" + id,
							L.removable("x", "y", "width", "height"),
							L.props("x", "y", "width", "height"),
						],
						sizeCache,
					)}
					<use href="#{id}" use:bindBoundingBox={measuredSize} />
				{/if}
			{/each}
		</svg>
	{/if}
</div>

<style>
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
</style>
