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
					console.log(e);
					return e;
				}
			}),
			L.reread((x) => x.string),
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

	const worldBounds = read(
		L.pick({
			minX: [
				L.foldTraversalLens(L.minimum, [L.elems, "x"]),
				L.defaults(-10),
			],
			maxX: [
				L.foldTraversalLens(L.maximum, [L.elems, (r) => r.x + r.w]),
				L.defaults(10),
			],
			minY: [
				L.foldTraversalLens(L.minimum, [L.elems, "y"]),
				L.defaults(-10),
			],
			maxY: [
				L.foldTraversalLens(L.maximum, [L.elems, (r) => r.y + r.h]),
				L.defaults(10),
			],
		}),
		rectangles,
	);

	const viewBox = view(
		({ minX, minY, maxX, maxY }) =>
			`${minX - 40} ${minY - 40} ${maxX - minX + 80} ${maxY - minY + 80}`,
		worldBounds,
	);
</script>

<h1>Renew File</h1>

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
			x={rect.x + 10}
			y={rect.y}
			width={rect.w}
			height={rect.h}
			fill="#a80a"
		/>
		<text
			transform="rotate(-10 {rect.x} {rect.y})"
			x={rect.x}
			y={rect.y}
			font-size="0.5em">{rect.__kind}</text
		>
	{/each}

	{#each lines.value as line}
		<polyline
			points={R.join(
				" ",
				R.map(R.compose(R.join(" "), R.props(["x", "y"])), line.points),
			)}
			fill="none"
			stroke-width="1"
			stroke="blue"
		/>
	{/each}

	{#each textes.value as text}
		<text x={text.fOriginX} y={text.fOriginY}>{text.text}</text>
	{/each}
</svg>

<style>
	svg {
		height: 30em;
		width: 100%;
		resize: both;
		shape-rendering: geometricPrecision;
	}
</style>
