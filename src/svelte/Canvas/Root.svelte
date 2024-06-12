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

	import Creator from "./tools/Creator.svelte";
	import Lasso from "./tools/Lasso.svelte";
	import RubberBand from "./tools/RubberBand.svelte";
	import Nodes from "./tools/Nodes.svelte";
	import Bounds from "./tools/Bounds.svelte";

	const el = atom(null);
	const svgPoint = $derived(el.value ? el.value.createSVGPoint() : null);

	const lastOrNew = L.ifElse(R.length, [L.index(0)], [L.appendTo]);

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
		`M${camera.value.focus.x - (camera.value.plane.x / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)},
		${camera.value.focus.y - (camera.value.plane.y / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}
		H${camera.value.focus.x + (camera.value.plane.x / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}
		V${camera.value.focus.y + (camera.value.plane.y / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}
		H${camera.value.focus.x - (camera.value.plane.x / 2 - camera.value.frame.padding) * Math.exp(-camera.value.focus.z)}z`,
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
			camera.value.frame.padding *
				(camera.value.frame.aspect == "meet"
					? Math.exp(-camera.value.focus.z)
					: 1),
		);
		return `M${minX},${minY}h${width}v${height}h${-width}z`;
	});

	const rotationTransform = read(L.getter((c) => `rotate(${c.focus.w}, ${c.focus.x}, ${c.focus.y})`), camera);

	const cameraZoom = view(["focus", "z"], camera);
	const cameraX = view(["focus", "x"], camera);
	const cameraY = view(["focus", "y"], camera);
	const cameraAngle = view(["focus", "w"], camera);

	const tool = atom("lasso");
	const nodes = atom([{ x: 200, y: 100 }]);
	const drafts = atom([]);
	const rubberBand = atom(undefined);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);

	const tools = {
		lasso: Lasso,
		rubber: RubberBand,
		create: Creator,
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
	const alignX = view(["frame", "alignX", L.normalize(U.capitalize)], camera);
	const alignY = view(["frame", "alignY", L.normalize(U.capitalize)], camera);
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
</script>

<fieldset>
	<legend>Focus</legend>

	<div>
		X:
		<input
			type="range"
			bind:value={cameraX.value}
			min="-400"
			max="400"
			step="0.1"
		/>
		Y:
		<input
			type="range"
			bind:value={cameraY.value}
			min="-400"
			max="400"
			step="0.1"
		/>
		<br />
		Zoom:
		<input
			type="range"
			bind:value={cameraZoom.value}
			min="-2"
			max="5"
			step="0.1"
		/>
		Rotation:
		<input
			type="range"
			bind:value={cameraAngle.value}
			min="-90"
			max="90"
			step="0.1"
		/>
	</div>
</fieldset>

<fieldset>
	<legend>Frame</legend>

	<div>
		<label
			><input
				type="checkbox"
				bind:checked={autosize.value}
			/>Autofit</label
		>
	</div>

	<div>
		Aspect:
		<label
			><input type="radio" value="meet" bind:group={aspect.value} /> meet</label
		>
		<label
			><input type="radio" value="slice" bind:group={aspect.value} /> slice</label
		>
		<label
			><input type="radio" value="none" bind:group={aspect.value} /> none</label
		>
	</div>
	<div>
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

<div class="resizer">
	<svg
		bind:this={el.value}
		use:bindSize={view(
			[
				"plane",
				L.ifElse(
					R.prop("autosize"),
					L.identity,
					keepAspect(R.prop("x"), R.prop("y")),
				),
				L.props("x", "y"),
			],
			camera,
		)}
		use:bindSize={view(["frame", "size"], camera)}
		{viewBox}
		{preserveAspectRatio}
	>
		<g pointer-events="none">
			<path d={viewBoxPath} fill="#ddffee" />
			<path
				d={frameBoxPath}
				stroke="#ffaaaa"
				fill="none"
				vector-effect="non-scaling-stroke"
				stroke-width="5px"
				shape-rendering="crispEdges"
			/>

			<Bounds nodes={nodes} rotationTransform={rotationTransform} />
			<Nodes nodes={nodes} rotationTransform={rotationTransform} />
		</g>

		<svelte:component this={tools[tool.value]} {newNode} rotationTransform={rotationTransform}>
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

<h3>Camera Parameter</h3>
<textarea use:bindValue={cameraJson.stableAtom}></textarea>

<style>
	.resizer {
		display: grid;
		min-height: 10em;
		height: 40em;
		width: 100%;
		resize: both;
		overflow: hidden;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		border: 3px solid #333;
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
</style>
