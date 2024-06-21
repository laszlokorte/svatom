<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as Geo from "../geometry";
	import * as U from "../utils";
	import * as Cam from "./camControl.svelte";
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
	} from "../svatom.svelte.js";

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
	import Creator from "./tools/Creator.svelte";
	import Lasso from "./tools/Lasso.svelte";
	import Pen from "./tools/Pen.svelte";
	import RubberBand from "./tools/RubberBand.svelte";
	import Nodes from "./tools/Nodes.svelte";
	import Drawings from "./tools/Drawings.svelte";
	import Bounds from "./tools/Bounds.svelte";
	import Magnifier from "./tools/Magnifier.svelte";
	import GuideLiner from "./tools/GuideLiner.svelte";
	import Guides from "./tools/Guides.svelte";
	import Axis from "./tools/Axis.svelte";
	import Pan from "./tools/Pan.svelte";
	import Rotate from "./tools/Rotate.svelte";

	const svgElement = atom(null);
	const svgPoint = read(
		L.reread((svg) => svg.createSVGPoint()),
		svgElement,
	);

	function clientToCanvas(x, y, screen = false) {
		const pt = svgPoint.value;
		pt.x = x;
		pt.y = y;
		const svgP = pt.matrixTransform(
			svgElement.value.getScreenCTM().inverse(),
		);

		if (screen) {
			return {
				x: svgP.x,
				y: svgP.y,
			};
		} else {
			return Geo.rotatePivotXYDegree(
				camera.value.focus.x,
				camera.value.focus.y,
				camera.value.focus.w,
				{
					x: svgP.x,
					y: svgP.y,
				},
			);
		}
	}

	const debugFrames = atom(false);
	const camera = atom({
		focus: {
			x: 0,
			y: 0,
			z: 0,
			w: 20,
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

	const frameBoxLens = (padding) =>
		L.reread((camera) => {
			const { minX, minY, width, height } = U.scaleViewBox(
				{
					alignmentX: camera.frame.alignX,
					alignmentY: camera.frame.alignY,
					width: camera.plane.x * Math.exp(-camera.focus.z),
					height: camera.plane.y * Math.exp(-camera.focus.z),
					minX:
						camera.focus.x -
						(camera.plane.x / 2) * Math.exp(-camera.focus.z),
					minY:
						camera.focus.y -
						(camera.plane.y / 2) * Math.exp(-camera.focus.z),
					scaling: camera.frame.aspect,
				},
				camera.frame.size.x,
				camera.frame.size.y,
				padding ? camera.frame.padding : 0,
			);

			return {
				screenSpaceAligned: { minX, minY, width, height },
				worldSpace: {
					a: Geo.rotatePivotXYDegree(
						camera.focus.x,
						camera.focus.y,
						camera.focus.w,
						{ x: minX, y: minY },
					),
					b: Geo.rotatePivotXYDegree(
						camera.focus.x,
						camera.focus.y,
						camera.focus.w,
						{ x: minX + width, y: minY },
					),
					c: Geo.rotatePivotXYDegree(
						camera.focus.x,
						camera.focus.y,
						camera.focus.w,
						{ x: minX + width, y: minY + height },
					),
					d: Geo.rotatePivotXYDegree(
						camera.focus.x,
						camera.focus.y,
						camera.focus.w,
						{ x: minX, y: minY + height },
					),
				},
			};
		});

	const boxPathLens = L.reread(
		({ minX, minY, width, height }) =>
			`M${numberSvgFormat.format(minX)},${numberSvgFormat.format(minY)}h${numberSvgFormat.format(width)}v${numberSvgFormat.format(height)}h${numberSvgFormat.format(-width)}z`,
	);

	const frameBoxObject = read(frameBoxLens(false), camera);
	const frameBoxPath = read(
		[frameBoxLens(false), "screenSpaceAligned", boxPathLens],
		camera,
	);

	const frameBoxPathPadded = read(
		[frameBoxLens(true), "screenSpaceAligned", boxPathLens],
		camera,
	);
	const cameraRotationTransformLens = L.reread(
		(c) => `rotate(${c.focus.w}, ${c.focus.x}, ${c.focus.y})`,
	);

	const rotationTransform = read(cameraRotationTransformLens, camera);
	const rotationTransformFunction = read(
		L.reread((c) =>
			L.iso(
				({ x, y }) => {
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
					const cos = Math.cos((c.focus.w / 180) * Math.PI);
					const sin = Math.sin((c.focus.w / 180) * Math.PI);

					const dx = x - c.focus.x;
					const dy = y - c.focus.y;

					return {
						x: c.focus.x + dx * cos + dy * sin,
						y: c.focus.y + dx * -sin + dy * cos,
					};
				},
			),
		),
		camera,
	);

	const cameraScaleLens = L.reread((c) => Math.exp(-c.focus.z));
	const cameraScale = read(cameraScaleLens, camera);
	const cameraOrientationLens = L.reread((c) => c.focus.w);
	const cameraOrientation = read(cameraOrientationLens, camera);

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
	const cameraX = view(["focus", "x", numberLens], camera);
	const cameraY = view(["focus", "y", numberLens], camera);
	const cameraAngle = view(["focus", "w", numberLens], camera);
	const cameraXScreen = view(
		["focus", affineLens("x", "x", "y", "w"), numberLens],
		camera,
	);
	const cameraYScreen = view(
		["focus", affineLens("y", "x", "y", "w"), numberLens],
		camera,
	);

	const zoomDelta = view(["focus", L.setter(Cam.zoomWithPivot)], camera);

	const cameraZoomFrameLens = [
		"focus",
		L.setter((frame, oldFocus) => {
			const rad = Geo.degree2rad(-frame.angle);
			const cos = Math.cos(rad);
			const sin = Math.sin(rad);

			return {
				...oldFocus,
				x:
					frame.start.x +
					(cos * frame.size.x + sin * frame.size.y) / 2,
				y:
					frame.start.y +
					(-sin * frame.size.y + cos * frame.size.y) / 2,
				z: R.clamp(-3, 3, oldFocus.z + 0.5),
				w: -frame.angle,
			};
		}),
	];

	const zoomFrame = view(cameraZoomFrameLens, camera);

	const tool = atom("pen");
	const nodes = atom([{ x: 200, y: 100 }]);
	const guides = atom([]);
	const drawings = atom([]);
	const drafts = atom([]);
	const rubberBand = atom(undefined);
	const newNode = view([L.appendTo, L.required("x", "y")], nodes);

	const newDrawing = view(
		[L.appendTo, L.setter((n, o) => (n.length > 1 ? n : o))],
		drawings,
	);
	const newGuide = view([L.appendTo], guides);

	const tools = {
		select: {
			component: RubberBand,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				rotationTransform,
				cameraOrientation,
			},
		},
		create: {
			component: Creator,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				newNode,
				rotationTransform,
				cameraScale,
			},
		},
		lasso: {
			component: Lasso,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				cameraScale,
				rotationTransform,
			},
		},
		pen: {
			component: Pen,
			parameters: {
				clientToCanvas,
				frameBoxPath,
				cameraScale,
				rotationTransform,
				newDrawing,
			},
		},
		magnifier: {
			component: Magnifier,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				zoomDelta,
				zoomFrame,
				rotationTransform,
				rotationTransformFunction,
				cameraOrientation,
				cameraScale,
			},
		},
		guides: {
			component: GuideLiner,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				rotationTransform,
				frameBoxObject,
				newGuide,
				cameraScale,
			},
		},
		axis: {
			component: Axis,
			parameters: {
				frameBoxPath,
				clientToCanvas,
				rotationTransform,
				newGuide,
				cameraScale,
				cameraOrientation,
			},
		},
		pan: {
			component: Pan,
			parameters: {
				frameBoxPath,
			},
		},
		rotate: {
			component: Rotate,
			parameters: {
				frameBoxPath,
			},
		},
	};

	const toolGroups = [
		["select", "lasso"],
		["magnifier", "pan", "rotate"],
		["pen", "create"],
		["axis", "guides"],
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

	// This is needed to prevent a ceil/floor feedback loop between integer scroll positions of scrollbars and camera position
	const integerLens = L.lens(
		(x) => Math.round(x),
		(newV, oldV) => Math.round(newV) + (oldV - Math.round(oldV)),
	);
	const scrollIso = L.iso(R.add(R.__, 2000), R.subtract(R.__, 2000));

	const scrollPosition = combine({
		x: view([scrollIso, integerLens], cameraXScreen),
		y: view([scrollIso, integerLens], cameraYScreen),
	});

	const scrollWindowSize = view(
		L.setter((newSize) => ({
			frame: newSize,
			plane: newSize,
		})),
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
			><input
				type="checkbox"
				value={true}
				bind:checked={debugFrames.value}
			/> Show Debug Frames</label
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
</fieldset>

<fieldset>
	<legend>Tools</legend>

	<div class="tool-bar">
		<button
			type="button"
			onclick={() => {
				nodes.value = [];
				drawings.value = [];
				guides.value = [];
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
					{U.capitalize(t)}</label
				>
			{/each}
		{/each}
	</div>
</fieldset>

<Scroller
	{scrollPosition}
	contentSize={atom({ x: 5000, y: 5000 })}
	{scrollWindowSize}
>
	<svg
		bind:this={svgElement.value}
		use:Cam.bindEvents={camera}
		viewBox={viewBox.value}
		preserveAspectRatio={preserveAspectRatio.value}
	>
		<g class:hidden={!debugFrames.value} pointer-events="none">
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
				stroke="#ffaaaa"
				fill="none"
				vector-effect="non-scaling-stroke"
				stroke-width="4px"
				shape-rendering="crispEdges"
			/>
			<path
				d={frameBoxPathPadded.value}
				stroke="#aaccff"
				fill="none"
				vector-effect="non-scaling-stroke"
				stroke-width="2px"
				shape-rendering="crispEdges"
			/>
		</g>

		<g pointer-events="none">
			<Bounds {nodes} {drawings} {rotationTransform} {cameraScale} />
			<Nodes {nodes} {rotationTransform} {cameraScale} />

			<Drawings {drawings} {rotationTransform} {cameraScale} />
			<Guides
				{guides}
				{frameBoxObject}
				{rotationTransform}
				{cameraScale}
			/>
		</g>

		<svelte:component
			this={tools[tool.value].component}
			{...tools[tool.value].parameters}
		></svelte:component>
	</svg>
</Scroller>

<fieldset>
	<legend>Focus</legend>
	<button
		type="button"
		onclick={(_) => {
			update(L.set(["focus", L.values], 0), camera);
		}}>Reset all</button
	>

	<div class="form-grid">
		<label class="number-picker"
			><span>X:</span>
			<input
				type="range"
				bind:value={cameraX.value}
				min="-4000"
				max="4000"
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraX.value = 0;
				}}>reset</button
			>
			<output>{cameraX.value}</output>
		</label>
		<label class="number-picker"
			><span>Y:</span>
			<input
				type="range"
				bind:value={cameraY.value}
				min="-4000"
				max="4000"
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraY.value = 0;
				}}>reset</button
			>
			<output>{cameraY.value}</output>
		</label>
		<label class="number-picker"
			><span>Zoom:</span>
			<input
				type="range"
				bind:value={cameraZoom.value}
				min="-3"
				max="3"
				step="0.01"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraZoom.value = 0;
				}}>reset</button
			>
			<output>{cameraZoom.value}</output>
		</label>
		<label class="number-picker"
			><span>Rotation:</span>
			<input
				type="range"
				bind:value={cameraAngle.value}
				min="-180"
				max="180"
				step="0.01"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraAngle.value = 0;
				}}>reset</button
			>
			<output>{cameraAngle.value}</output>
		</label>
		<label class="number-picker"
			><span>Scroll X:</span>
			<input
				type="range"
				bind:value={cameraXScreen.value}
				min="-4000"
				max="4000"
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraXScreen.value = 0;
				}}>reset</button
			>
			<output>{cameraXScreen.value}</output>
		</label>
		<label class="number-picker"
			><span>Scroll Y:</span>
			<input
				type="range"
				bind:value={cameraYScreen.value}
				min="-4000"
				max="4000"
				step="0.1"
			/>
			<button
				type="button"
				onclick={(_) => {
					cameraYScreen.value = 0;
				}}>reset</button
			>
			<output>{cameraYScreen.value}</output>
		</label>
	</div>
</fieldset>

<h3>Camera Parameter</h3>
<textarea use:bindValue={cameraJson.stableAtom}></textarea>

<style>
	.scroller-hud {
		grid-area: 1/1/1/1;
		place-self: end;
		z-index: 100;
		background: none;
		font-size: 0.5em;
		margin: 0.5em 1em;
		--accent-color: #aa4466;
		--accent-color-light: #cc4466;
	}

	svg {
		display: block;
		grid-area: 1/1/1/1;
		place-self: stretch;
		width: 100%;
		height: 100%;
		position: absolute;
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
		grid-template-columns: max-content max-content max-content max-content;
		grid-auto-rows: 1fr;
		gap: 0.25em;
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
	}

	.tool-button:has(:checked) {
		background: #cd3e30;
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
</style>
