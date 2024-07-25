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
	} from "../svatom.svelte.js";

	import {
		parserAutoDetect,
		stringify,
		hierarchyV11,
		kindKey,
	} from "../../renew/index.js";

	const renewDocument = atom({ string: "", json: undefined });
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

	const renewJson = read(
		["json", L.inverse(L.json({ space: "  " }))],
		renewDocument,
	);

	const rectTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.RectangleFigure",
		"CH.ifa.draw.figures.RoundRectangleFigure",
	);
	const lineTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.PolyLineFigure",
	);
	const textTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.TextFigure",
	);

	const allRoots = [
		"CH.ifa.draw.standard.AbstractFigure",
		"CH.ifa.draw.figures.FigureAttributes",
		"de.renew.hierarchicalworkflownets.gui.layout.Vec2d",
		"CH.ifa.draw.figures.AbstractLocator",
		"CH.ifa.draw.figures.ArrowTip",
		"de.renew.gui.CircleDecoration",
		"CH.ifa.draw.standard.AbstractConnector",
		"de.renew.diagram.SplitDecoration",
	];

	console.log(kindKey);

	const rectangles = view(
		[
			"json",
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

	const lines = view(
		[
			"json",
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
		combine({ rectangles, textes, lines }),
	);

	const viewBox = view(
		L.reread(
			({ minX, minY, maxX, maxY }) =>
				`${minX - 10} ${minY - 10} ${Math.max(600, maxX - minX) + 20} ${Math.max(200, maxY - minY) + 20}`,
		),
		worldBounds,
	);

	const dragging = atom(0);

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
		if (!color) {
			return "rgb(0,0,0, 0)";
		}
		if (color.length == 4) {
			return `rgb(${color[0]},${color[1]},${color[2]},${color[3]})`;
		} else if (color.length == 3) {
			return `rgb(${color[0]},${color[1]},${color[2]})`;
		} else {
			return "rgb(0,0,0)";
		}
	}

	const defaultsAttributes = {
		FrameColor: [0, 0, 0, 1],
		FillColor: [112, 219, 147], // new Color(0x70DB93),
		TextColor: [0, 0, 0, 1],
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

<div
	ondragover={onDragOver}
	ondragenter={onDragEnter}
	ondragleave={onDragLeave}
	ondrop={onDragDrop}
	role="application"
>
	<div class="beside" style="height: 15em">
		<textarea
			class:has-error={renewSerialized.hasError}
			bind:value={renewSerialized.value}
			class:dragging={dragging.value > 0}
		></textarea>
		<pre>{renewJson.value}</pre>
	</div>

	<div class="error-message" hidden={!renewSerialized.hasError}>
		<button type="button" onclick={renewSerialized.reset}>Reset</button>
		{renewSerialized.error}
	</div>

	{#if viewBox.value}
		<svg viewBox={viewBox.value}>
			{#each lines.value as line}
				<polyline
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
				<rect
					x={rect.x}
					y={rect.y}
					width={rect.w}
					height={rect.h}
					fill={renewToRgba(readAttribute(rect, "FillColor"))}
					stroke={renewToRgba(readAttribute(rect, "FrameColor"))}
					stroke-width={readAttribute(rect, "LineWidth")}
					stroke-dasharray={readAttribute(rect, "LineStyle")}
					vector-effect="non-scaling-stroke"
					shape-rendering="crispEdges"
				/>
				<text opacity="0.0" x={rect.x + 10} y={rect.y} font-size="0.5em"
					>{rect.__kind}</text
				>
			{/each}

			{#each textes.value as text}
				{@const fontSize = readAttribute(text, "FontSize")}
				{@const fontStyle = readAttribute(text, "FontStyle")}
				{@const TextAlignment = readAttribute(text, "TextAlignment")}
				<text
					x={text.fOriginX}
					y={text.fOriginY}
					fill={renewToRgba(readAttribute(text, "TextColor"))}
					font-family={readAttribute(text, "FontName")}
					font-weight={fontStyle === 1 ? "bold" : "normal"}
					font-style={fontStyle === 2 ? "italic" : "normal"}
					text-anchor={["start", "center", "end"][TextAlignment]}
					font-size={fontSize / 2}
				>
					{#each text.text.split("\n") as line, l (l)}
						<tspan
							x={text.fOriginX}
							dy={l ? (fontSize / 2) * 1.5 : 0}
							text-anchor={["start", "center", "end"][
								TextAlignment
							]}>{line}</tspan
						>
					{/each}
				</text>
			{/each}
		</svg>
	{/if}
</div>

<style>
	svg {
		width: 100%;
		resize: both;
		shape-rendering: geometricPrecision;
	}

	textarea {
		border: 0.5em solid gray;
	}

	.dragging {
		border-color: lime;
	}
</style>
