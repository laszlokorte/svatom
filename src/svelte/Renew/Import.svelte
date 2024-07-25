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
	} from "../../renew/index.js";

	const renewDocument = atom({ string: "", json: null });
	const renewSerialized = failableView(
		[
			L.rewrite((x) => {
				try {
					return {
						string: x,
						json: parserAutoDetect(x),
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

	const rectangles = view(
		[
			"json",
			"figures",
			L.partsOf(
				L.elems,
				L.satisfying(
					R.compose(R.includes(R.__, rectTypes), R.prop("__kind")),
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
					R.compose(R.includes(R.__, lineTypes), R.prop("__kind")),
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
					R.compose(R.includes(R.__, textTypes), R.prop("__kind")),
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
				minX: [
					L.foldTraversalLens(L.minimum, [boundsLens, "minX"]),
					L.defaults(-200),
				],
				maxX: [
					L.foldTraversalLens(L.maximum, [boundsLens, "maxX"]),
					L.defaults(200),
				],
				minY: [
					L.foldTraversalLens(L.minimum, [boundsLens, "minY"]),
					L.defaults(-10),
				],
				maxY: [
					L.foldTraversalLens(L.maximum, [boundsLens, "maxY"]),
					L.defaults(10),
				],
			}),
		],
		combine({ rectangles, textes, lines }),
	);

	const viewBox = view(
		({ minX, minY, maxX, maxY }) =>
			`${minX - 10} ${minY - 10} ${maxX - minX + 20} ${maxY - minY + 20}`,
		worldBounds,
	);
</script>

<h1>Renew File</h1>

<p>Load a renew file into the left text field.</p>
<p>
	It will be parsed and output as JSON on the right and rendered as SVG below.
</p>

<div class="beside" style="height: 15em">
	<textarea
		class:has-error={renewSerialized.hasError}
		bind:value={renewSerialized.value}
	></textarea>
	<pre>{renewJson.value}</pre>
</div>

<div class="error-message" hidden={!renewSerialized.hasError}>
	<button type="button" onclick={renewSerialized.reset}>Reset</button>
	{renewSerialized.error}
</div>

<svg viewBox={viewBox.value}>
	{#each rectangles.value as rect}
		<rect
			x={rect.x}
			y={rect.y}
			width={rect.w}
			height={rect.h}
			fill="#70db93aa"
		/>
		<text x={rect.x + 10} y={rect.y} font-size="0.5em">{rect.__kind}</text>
	{/each}

	{#each lines.value as line}
		<polyline
			points={R.join(
				" ",
				R.map(R.compose(R.join(" "), R.props(["x", "y"])), line.points),
			)}
			fill="none"
			stroke-width="1"
			stroke="black"
		/>
	{/each}

	{#each textes.value as text}
		<text
			x={text.fOriginX}
			y={text.fOriginY}
			font-size="1em"
			font-family="sans-serif">{text.text}</text
		>
	{/each}
</svg>

<style>
	svg {
		width: 100%;
		resize: both;
		shape-rendering: geometricPrecision;
	}
</style>
