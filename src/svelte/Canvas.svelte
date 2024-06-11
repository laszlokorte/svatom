<script>
	import * as L from "partial.lenses";
	import * as G from "./generators";
	import * as R from "ramda";
	import * as U from "./utils";
	import * as C from "./combinators";
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
	} from "./svatom.svelte.js";
	import { derived } from "svelte/store";

	const el = atom(null);
	const rotEl = atom(null);
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
			camera.value.frame.padding,
		);
		return `M${minX},${minY}h${width}v${height}h${-width}z`;
	});

	const rotationTransform = $derived(
		`translate(${camera.value.focus.x}, ${camera.value.focus.y}) rotate(${camera.value.focus.w}) translate(${-camera.value.focus.x}, ${-camera.value.focus.y}) `,
	);

	const cameraZoom = view(["focus", "z"], camera);
	const cameraX = view(["focus", "x"], camera);
	const cameraY = view(["focus", "y"], camera);
	const cameraAngle = view(["focus", "w"], camera);

	const tool = atom("select");
	const nodes = atom([{ x: 200, y: 100 }]);
	const drafts = atom([]);
	const lasso = atom([]);
	const rubberBand = atom(undefined);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);
	const isDrafting = view([L.index(0), L.defaults(false)], drafts);
	const lastDraft = view([L.index(0), L.removable("x", "y")], drafts);

	const rubberBandStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		rubberBand,
	);
	const rubberBandEnd = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("end"), "end", L.removable("x", "y")],
			L.zero,
		),
		rubberBand,
	);

	const rubberBandPath = read(
		L.getter((b) =>
			b && b.start && b.end
				? `M${b.start.x},${b.start.y}H${b.end.x}V${b.end.y}H${b.start.x}z`
				: "",
		),
		rubberBand,
	);

	const startLasso = view([L.index(0), L.defaults(false)], lasso);
	const currentLasso = view(
		[
			L.setter(R.takeLast(100)), // limit the lasso length just for fun
			L.setter(
				// discard very close samples
				R.dropRepeatsWith(
					R.compose(
						R.gt(10),
						Math.sqrt,
						R.uncurryN(
							2,
							C.Phi1(R.add)(
								C.Psi(R.compose((x) => x * x, R.subtract))(
									R.prop("x"),
								),
							)(
								C.Psi(R.compose((x) => x * x, R.subtract))(
									R.prop("y"),
								),
							),
						),
					),
				),
			),
			L.setter((n, o) => (n ? [...o, n] : [])),
			L.removable("x", "y"),
			L.defaults(false),
		],
		lasso,
	);

	const lassoPath = view(
		L.iso(
			(l) =>
				R.join(
					",",
					R.map(R.compose(R.join(" "), R.props(["x", "y"])), l),
				),
			(p) =>
				R.map(
					R.compose(R.zipWith(R.assoc, ["x", "y"]), R.split(" ")),
					p,
				),
		),
		lasso,
	);

	const tools = {
		create: combine({
			final: newNode,
			start: isDrafting,
			current: lastDraft,
			root: rotEl,
		}),
		select: combine({
			start: rubberBandStart,
			current: rubberBandEnd,
			root: el,
		}),
		lasso: combine({
			start: startLasso,
			current: currentLasso,
			root: rotEl,
		}),
	};

	const dragTool = $derived(tools[tool.value]);

	// const dragTool = combine({
	// 	start: rubberBandStart,
	// 	current: rubberBandEnd,
	// 	final: L.zero,
	// });

	const dragToolStart = $derived(view("start", dragTool));
	const dragToolCurrent = $derived(view("current", dragTool));
	const dragToolFinal = $derived(view("final", dragTool));
	const dragRoot = $derived(view("root", dragTool));

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
		tabindex="-1"
		{viewBox}
		{preserveAspectRatio}
		role="button"
		onkeydown={(evt) => {
			dragToolCurrent.value = undefined;
		}}
		onpointerdown={(evt) => {
			evt.currentTarget.setPointerCapture(evt.pointerId);
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				dragRoot.value.getScreenCTM().inverse(),
			);

			///newDraft.value = { x: svgP.x, y: svgP.y };
			dragToolStart.value = { x: svgP.x, y: svgP.y };
			dragToolCurrent.value = { x: svgP.x, y: svgP.y };
		}}
		onpointermove={(evt) => {
			if (dragToolStart.value) {
				const pt = svgPoint;
				pt.x = evt.clientX;
				pt.y = evt.clientY;
				const svgP = pt.matrixTransform(
					dragRoot.value.getScreenCTM().inverse(),
				);

				//lastDraft.value = { x: svgP.x, y: svgP.y };
				dragToolCurrent.value = { x: svgP.x, y: svgP.y };
			}
		}}
		onpointerup={(evt) => {
			if (dragToolStart.value) {
				const pt = svgPoint;
				pt.x = evt.clientX;
				pt.y = evt.clientY;
				const svgP = pt.matrixTransform(
					dragRoot.value.getScreenCTM().inverse(),
				);

				//newNode.value = lastDraft.value;
				//lastDraft.value = undefined;
				//rubberBandStart.value = undefined;
				dragToolCurrent.value = undefined;
				dragToolFinal.value = { x: svgP.x, y: svgP.y };
			}
		}}
	>
		<path d={viewBoxPath} fill="#ddffee" />
		<path
			d={frameBoxPath}
			stroke="#ffaaaa"
			fill="none"
			vector-effect="non-scaling-stroke"
			stroke-width="5px"
			shape-rendering="crispEdges"
		/>

		<g transform={rotationTransform} bind:this={rotEl.value}>
			<g>
				{#each nodes.value as v, i (i)}
					<circle class="node" cx={v.x} cy={v.y} r="20"></circle>
				{/each}
			</g>
			<g>
				{#each drafts.value as v, i (i)}
					<circle class="node" opacity="0.2" cx={v.x} cy={v.y} r="20"
					></circle>
				{/each}
			</g>
			<g>
				<polygon points={lassoPath.value} class="lasso-area" />
				<!-- {#each lasso.value as v, i (i)}
					<circle class="lasso" cx={v.x} cy={v.y} r="4"></circle>
				{/each} -->
			</g>
		</g>

		<path
			d={rubberBandPath.value}
			fill-opacity="0.2"
			fill="blue"
			stroke="blue"
			vector-effect="non-scaling-stroke"
			stroke-width="1px"
			shape-rendering="crispEdges"
		/>
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

	.node {
		fill: #dd4e40;
		stroke: #aa0b10;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}

	.lasso {
		fill: #100baa;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}

	.lasso-area {
		fill: #100baa;
		fill-opacity: 0.2;
		fill-rule: evenodd;
		stroke-dasharray: 5 5;
		stroke: #100baa;
		stroke-width: 1px;
	}

	textarea {
		min-height: 30em;
	}
</style>
