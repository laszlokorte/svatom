<script>
	import * as L from "partial.lenses";
	import * as G from "../generators";
	import * as R from "ramda";
	import * as U from "../utils";
	import * as C from "../combinators";
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		autofocusIf,
		string,
	} from "../svatom.svelte.js";

	const numberFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		useGrouping: false,
	});

	const numberLens = L.lens(x => numberFormat.format(x), x => {
		return parseFloat(x)
	})

	import Creator from "./tools/Creator.svelte";
	import Lasso from "./tools/Lasso.svelte";
	import RubberBand from "./tools/RubberBand.svelte";
	import Nodes from "./tools/Nodes.svelte";
	import Bounds from "./tools/Bounds.svelte";

	const el = atom(null);
	const svgPoint = $derived(el.value ? el.value.createSVGPoint() : null);

	const lastOrNew = L.ifElse(R.length, [L.index(0)], [L.appendTo]);

	const debugFrames = atom(true);
	const camera = atom({
		focus: {
			x: 0,
			y: 0,
			z: 0,
			w: 0,
		},
		plane: {
			autosize: true,
			x: 100,
			y: 100,
		},
		frame: {
			aspect: "meet",
			alignX: "Mid",
			alignY: "Mid",
			padding: 10,
			size: {
				x: 100,
				y: 100,
			},
		},
	});

	const preserveAspectRatio = $derived(
		camera.value.frame.aspect
			? `x${camera.value.frame.alignX}Y${camera.value.frame.alignY} ${camera.value.frame.aspect}`
			: "none",
	);

	const viewBox = $derived(
		`${camera.value.focus.x - (camera.value.plane.x / 2) * Math.exp(-camera.value.focus.z)} 
		${camera.value.focus.y - (camera.value.plane.y / 2) * Math.exp(-camera.value.focus.z)} 
		${camera.value.plane.x * Math.exp(-camera.value.focus.z)} 
		${camera.value.plane.y * Math.exp(-camera.value.focus.z)}`,
	);

	const viewBoxPath = $derived(
		`M${camera.value.focus.x - (camera.value.plane.x / 2) * Math.exp(-camera.value.focus.z)},
		${camera.value.focus.y - (camera.value.plane.y / 2) * Math.exp(-camera.value.focus.z)}
		H${camera.value.focus.x + (camera.value.plane.x / 2) * Math.exp(-camera.value.focus.z)}
		V${camera.value.focus.y + (camera.value.plane.y / 2) * Math.exp(-camera.value.focus.z)}
		H${camera.value.focus.x - (camera.value.plane.x / 2) * Math.exp(-camera.value.focus.z)}z`,
	);

	const frameBoxPath = $derived.by(() => {
		const { minX, minY, width, height } = U.scaleViewBox(
			{
				alignmentX: camera.value.frame.alignX,
				alignmentY: camera.value.frame.alignY,
				width: camera.value.plane.x * Math.exp(-camera.value.focus.z),
				height: camera.value.plane.y * Math.exp(-camera.value.focus.z),
				minX:
					camera.value.focus.x -
					(camera.value.plane.x / 2) *
						Math.exp(-camera.value.focus.z),
				minY:
					camera.value.focus.y -
					(camera.value.plane.y / 2) *
						Math.exp(-camera.value.focus.z),
				scaling: camera.value.frame.aspect,
			},
			camera.value.frame.size.x,
			camera.value.frame.size.y,
			camera.value.frame.padding,
		);
		return `M${minX},${minY}h${width}v${height}h${-width}z`;
	});

	const rotationTransform = read(L.getter((c) => `rotate(${c.focus.w}, ${c.focus.x}, ${c.focus.y})`), camera);
	const cameraScale = read(L.getter(c => Math.exp(-c.focus.z)), camera)

	const degree2rad = (x) => x*Math.PI / 180
	const rad2degree = (x) => x*180 / Math.PI

	const affineLens = (dim, xDim, yDim, angleDim) => {
		if (dim == xDim) {
			return L.lens(o=>{
				const rad = -degree2rad(o[angleDim])
				const cos = Math.cos(rad)
				const sin = Math.sin(rad)
				return (cos * o[xDim] + sin * o[yDim])
			}, (n, o) => {
				const rad = -degree2rad(o[angleDim])
				const cos = Math.cos(rad)
				const sin = Math.sin(rad)

				return {
					...o,
					[xDim]: cos * n,
					[yDim]: sin * n,
				}
			})
		} else if ((dim == yDim)) {

			return L.lens(o=>{
				const rad = -degree2rad(o[angleDim])
				const cos = Math.cos(rad)
				const sin = Math.sin(rad)
				return (-sin * o[xDim] + cos * o[yDim])
			}, (n, o) => {
				const rad = -degree2rad(o[angleDim])
				const cos = Math.cos(rad)
				const sin = Math.sin(rad)

				return {
					...o,
					[xDim]: -sin * n,
					[yDim]: cos * n,
				}
			})
		} else {
			throw "dim must be xDim or yDim"
		}

	}

	const cameraZoom = view(["focus", "z", numberLens], camera);
	const cameraX = view(["focus", "x", numberLens], camera);
	const cameraY = view(["focus", "y", numberLens], camera);
	const cameraAngle = view(["focus", "w", numberLens], camera);
	const cameraXScreen = view(["focus", affineLens('x', 'x', 'y', 'w'), numberLens], camera);
	const cameraYScreen = view(["focus", affineLens('y', 'x', 'y', 'w'), numberLens], camera);

	const tool = atom("lasso");
	const nodes = atom([{ x: 200, y: 100 }]);
	const drafts = atom([]);
	const rubberBand = atom(undefined);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);

	const tools = {
		rubber: RubberBand,
		create: Creator,
		lasso: Lasso,
	};

	const makeSquare = L.lens(R.identity, (n, o) => ({
		...n,
		x: Math.min(n.x, n.y),
		y: Math.min(n.x, n.y),
	}));

	const keepAspect = (xprop, yprop) =>
		L.lens(R.identity, (n, o) => {
			const oldAspect = yprop(o) / xprop(o);

			return {
				...n,
				x: xprop(n),
				y: xprop(n) * oldAspect,
			};
		});

	const makeXSquare = L.lens(R.identity, (n, o) => ({
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
	const alignCombi = view(L.iso(({alignX, alignY}) => `x${alignX}Y${alignY}`, R.compose(R.prop('groups'), R.match(/x(?<alignX>Min|Mid|Max)Y(?<alignY>Min|Mid|Max)/))) , combine({alignX, alignY}))
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

	const integerLens = L.lens(x=> Math.round(x), (newV, oldV) => Math.round(newV) + (oldV - Math.ceil(oldV)))
	const scrollIso = [L.iso(R.compose(R.add(2000)), R.compose(R.multiply(-1), R.subtract(2000)))];

	const scrollPosition = combine({
		x: view([scrollIso], cameraXScreen),
		y: view([scrollIso], cameraYScreen),
	})
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
			><input type="checkbox" value={true} bind:checked={debugFrames.value} /> Show Debug Frames</label
		>
	</div>

	<div>
		
		<label
			>Camera Width:<input type="range" min="100" max="1500" bind:value={planeWidth.value}  disabled={autosize.value} /></label
		><br>
		<label
			>Camera Height:<input type="range" min="100" max="1500" bind:value={planeHeight.value}  disabled={autosize.value} /></label
		>
	</div>

	<div>
		Aspect:
		<label
			><input type="radio" value="meet" bind:group={aspect.value}  disabled={autosize.value} /> meet</label
		>
		<label
			><input type="radio" value="slice" bind:group={aspect.value}  disabled={autosize.value} /> slice</label
		>
		<label
			><input type="radio" value="none" bind:group={aspect.value}  disabled={autosize.value} /> none</label
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
					><input disabled={autosize.value} type="radio" value={`x${ax}Y${ay}`} bind:group={alignCombi.value} />
					x{ax}Y{ay}</label
				>
			{/each}
		{/each}
	</div>
</fieldset>



<fieldset>
	<legend>Tools</legend>

	<button
		type="button"
		onclick={() => {
			nodes.value = [];
		}}>Clear</button
	>

	{#each Object.keys(tools) as t (t)}
		<label
			><input type="radio" bind:group={tool.value} value={t} />
			{U.capitalize(t)}</label
		>
	{/each}
</fieldset>

<div class="scroller"

	use:bindScroll={scrollPosition}
	style:--scroll-total-x={5000}
	style:--scroll-total-y={6000}
	>
	<div class="scroller-body">
		<svg
		bind:this={el.value}
		use:bindSize={view(
			[
				"plane",
				L.ifElse(
					R.prop("autosize"),
					L.identity,
					L.lens(R.identity, (_,o) => o),
				),
				L.props("x", "y"),
			],
			camera,
		)}
		use:bindSize={view(["frame", "size"], camera)}
		{viewBox}
		{preserveAspectRatio}
	>
		<g class:hidden={!debugFrames.value}>
			<path d={viewBoxPath} class="view-box" stroke-opacity="0.5" stroke="magenta" vector-effect="non-scaling-stroke" stroke-width="8px" fill="#ddffee" />
			<path
				d={frameBoxPath}
				stroke="#ffaaaa"
				fill="none"
				vector-effect="non-scaling-stroke"
				stroke-width="5px"
				shape-rendering="crispEdges"
			/>
		</g>

		<g pointer-events="none">

			<Bounds nodes={nodes} rotationTransform={rotationTransform} cameraScale={cameraScale} />
			<Nodes nodes={nodes} rotationTransform={rotationTransform} cameraScale={cameraScale} />
		</g>

		<svelte:component this={tools[tool.value]} {newNode} rotationTransform={rotationTransform} cameraScale={cameraScale}>
			{#snippet frame()}
				<path
					d={frameBoxPath}
					stroke="none"
					fill="none"
					pointer-events="all"
				/>
			{/snippet}
		</svelte:component>
	</svg>
	</div>
</div>


<fieldset>
	<legend>Focus</legend>

	<div class="form-grid">
		<label class="number-picker"><span>X:</span>
		<input
			type="range"
			bind:value={cameraX.value}
			min="-4000"
			max="4000"
			step="0.1"
		/>
		<output>{cameraX.value}</output>
		</label>
		<label class="number-picker"><span>Y:</span>
		<input
			type="range"
			bind:value={cameraY.value}
			min="-4000"
			max="4000"
			step="0.1"
		/>
		<output>{cameraY.value}</output>
		</label>
		<label class="number-picker"><span>Zoom:</span>
		<input
			type="range"
			bind:value={cameraZoom.value}
			min="-2"
			max="5"
			step="0.01"
		/>
		<output>{cameraZoom.value}</output>
		</label>
		<label class="number-picker"><span>Rotation:</span>
		<input
			type="range"
			bind:value={cameraAngle.value}
			min="-90"
			max="90"
			step="0.01"
		/>
		<output>{cameraAngle.value}</output>
		</label>
	</div>

	<div class="form-grid">
		<label class="number-picker"><span>X:</span>
		<input
			type="range"
			bind:value={cameraXScreen.value}
			min="-4000"
			max="4000"
			step="0.1"
		/>
		<output>{cameraXScreen.value}</output>
		</label>
		<label class="number-picker"><span>Y:</span>
		<input
			type="range"
			bind:value={cameraYScreen.value}
			min="-4000"
			max="4000"
			step="0.1"
		/>
		<output>{cameraYScreen.value}</output>
		</label>
	</div>
</fieldset>

<h3>Camera Parameter</h3>
<textarea use:bindValue={cameraJson.stableAtom}></textarea>

<style>
	.scroller {
		position: relative;
		display: grid;
		min-height: 10em;
		height: 40em;
		width: 100%;
		resize: both;
		overflow: auto;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		border: 3px solid #333;
		overflow: scroll;
	}

	.scroller::after {
		display: block;
		content: " ";
		height: calc(var(--scroll-total-y, 1) * 1px);
		width: calc(var(--scroll-total-x, 1) * 1px);
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.scroller-body {
		position: sticky;
		top: 0;
		left: 0;
		display: grid;
		width: 100%;
		height: 100%;
		overflow: hidden;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
		grid-area: 1/1/1/1;
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
		grid-template-columns: max-content max-content max-content;
		grid-auto-rows: 1fr;
	}

	.form-grid > .number-picker {
		grid-column: span 3;
		display: grid;
		grid-template-columns: subgrid;
		grid-template-rows: 1fr;
	}
</style>
