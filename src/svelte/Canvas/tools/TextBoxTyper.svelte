<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
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
		disableTouchEventsIf,
		/*auto update text size according to text content*/
		readTextreaScrollSize,
	} from "../../svatom.svelte.js";

	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const {
		frameBoxPath,
		clientToCanvas,
		frame,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		textBoxes = atom([]),
	} = $props();

	const newText = view(L.appendTo, textBoxes);

	const textBox = atom(undefined);
	const pointerId = view(["pointerId"], textBox);
	const text = view(["text"], textBox);

	const textBoxStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		textBox,
	);
	const textBoxSize = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("size"), "size", L.removable("x", "y")],
			L.zero,
		),
		textBox,
	);
	const textBoxFontSize = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("fontSize"), "fontSize"],
			L.zero,
		),
		textBox,
	);

	const isEditing = view(R.compose(R.not, R.isNil), pointerId);
	const textEmpty = view(L.reread(R.isEmpty), text);

	const textBoxAngle = view([L.removable("angle"), "angle"], textBox);
	const textBoxAngleCos = view(
		[L.reread((r) => Math.cos((r / 180) * Math.PI))],
		textBoxAngle,
	);
	const textBoxAngleSin = view(
		[L.reread((r) => Math.sin((r / 180) * Math.PI))],
		textBoxAngle,
	);

	const textBoxPath = read(
		L.getter((b) =>
			b && b.start && b.size
				? `M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}h${numberSvgFormat.format(b.size.x)}v${numberSvgFormat.format(b.size.y)}M${numberSvgFormat.format(b.start.x)},${numberSvgFormat.format(b.start.y)}v${numberSvgFormat.format(b.size.y)}h${numberSvgFormat.format(b.size.x)}`
				: "",
		),
		textBox,
	);

	const textBoxTransform = read(
		L.reread((r) => `rotate(${r.angle}, ${r.start.x}, ${r.start.y})`),
		textBox,
	);

	const keepOrientationlens = L.rewrite((newV, { x, y }) => ({
		x: Math.sign(x) * Math.abs(newV.x),
		y: Math.sign(y) * Math.abs(newV.y),
	}));
</script>

<path
	use:disableTouchEventsIf={textBoxStart}
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="text-box-surface"
	class:dim={isEditing.value}
	class:dim-empty={textEmpty.value}
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			pointerId.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (text.value) {
			return;
		}
		if (!(evt.isPrimary && U.isLeftButton(evt))) {
			return;
		}
		pointerId.value = evt.pointerId;

		evt.currentTarget.setPointerCapture(evt.pointerId);
		textBoxStart.value = clientToCanvas(evt.clientX, evt.clientY);
		textBoxSize.value = { x: 0, y: 0 };
		textBoxAngle.value = -cameraOrientation.value;
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			const dx = svgP.x - textBoxStart.value.x;
			const dy = svgP.y - textBoxStart.value.y;
			textBoxSize.value = {
				x: textBoxAngleCos.value * dx + textBoxAngleSin.value * dy,
				y: -textBoxAngleSin.value * dx + textBoxAngleCos.value * dy,
			};
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId) {
			textBoxFontSize.value = cameraScale.value;
			pointerId.value = undefined;
		}
	}}
	onpointercancel={(evt) => {
		if (pointerId.value === evt.pointerId) {
			pointerId.value = undefined;
		}
	}}
/>

<g transform={rotationTransform.value}>
	{#if pointerId.value === undefined && textBoxStart.value !== undefined}
		<g
			shape-rendering="geometricPrecision"
			text-rendering="optimizeLegibility"
			transform="translate({textBoxStart.value.x}, {textBoxStart.value
				.y}) rotate({textBoxAngle.value}) translate({-textBoxStart.value
				.x}, {-textBoxStart.value.y})"
		>
			<foreignObject
				shape-rendering="geometricPrecision"
				text-rendering="optimizeLegibility"
				width={Math.abs(textBoxSize.value.x)}
				height={Math.abs(textBoxSize.value.y)}
				x={textBoxStart.value.x + Math.min(0, textBoxSize.value.x)}
				y={textBoxStart.value.y + Math.min(0, textBoxSize.value.y)}
				style:overflow="visible"
			>
				<form
					xmlns="http://www.w3.org/1999/xhtml"
					onsubmit={(evt) => {
						evt.preventDefault();
						if (text.value) {
							newText.value = {
								start: {
									x: textBoxStart.value.x,
									y: textBoxStart.value.y,
								},
								size: {
									x: textBoxSize.value.x,
									y: textBoxSize.value.y,
								},
								content: text.value,
								angle: textBoxAngle.value,
								fontSize: textBoxFontSize.value,
							};
						}
						textBoxStart.value = undefined;
					}}
				>
					<textarea
						style:font-size="{textBoxFontSize.value}em"
						use:autofocusIf={textBoxStart.value.x *
							textBoxStart.value.x +
							textBoxStart.value.y * textBoxStart.value.y}
						type="text"
						bind:value={text.value}
						use:readTextreaScrollSize={view(
							keepOrientationlens,
							textBoxSize,
						)}
						onkeydown={(evt) => {
							if (evt.key === "Escape" || evt.key === "Esc") {
								textBoxStart.value = undefined;
							} else if (
								evt.key === "Enter" &&
								evt.shiftKey &&
								text.value
							) {
								evt.currentTarget.blur();
							}
						}}
						onblur={(evt) => {
							evt.preventDefault();
							if (text.value) {
								evt.currentTarget.form.dispatchEvent(
									new CustomEvent("submit", {
										cancelable: true,
									}),
								);
							}
							textBoxStart.value = undefined;
						}}
					></textarea>
				</form>
			</foreignObject>
		</g>
	{/if}
	<path
		d={textBoxPath.value}
		transform={textBoxTransform.value}
		fill="none"
		class="text-box"
		pointer-events="none"
		class:ready={pointerId.value === undefined}
	/>
</g>

<style>
	.text-box-surface {
		cursor: default;
		outline: none;
	}

	.text-box {
		fill: #fff;
		stroke: #aaa;
		fill-opacity: 0.9;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	.ready {
		stroke: #00aaff;
		stroke-width: 2px;
		fill: none;
		pointer-events: none;
	}

	form {
		display: contents;
	}

	textarea {
		font-size: 1.2em;
		font: inherit;
		border: none;
		padding: 4px;
		display: block;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		background: #fff;
		resize: none;
		min-height: 0;
		line-height: 1;
		overflow: visible;
		margin: 0;
		outline: none;
		overflow: hidden;
		/*overflow-y: scroll;
		overflow-x: auto;
		scrollbar-gutter: stable;
		scrollbar-width: thin;*/
	}

	.dim {
		fill: #ffffff33;
		cursor: default;
	}

	.dim-empty {
		cursor: text;
	}
</style>
