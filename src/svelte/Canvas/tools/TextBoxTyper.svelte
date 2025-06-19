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
		createTextBox,
	} = $props();

	const textBox = atom(undefined);
	const text = view(["text"], textBox);
	const isDragging = view(["dragging", L.valueOr(false)], textBox);

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
			[L.removable("fontSize"), "fontSize", L.rewrite(R.max(0.1))],
			L.zero,
		),
		textBox,
	);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		textBoxStart,
	);

	const textEmpty = view(L.reread(R.isEmpty), text);
	const textBoxValid = view(
		L.reread(({ fontSize, size }) => {
			return (
				Math.abs(size.x) > 20 * fontSize &&
				Math.abs(size.y) > 20 * fontSize
			);
		}),
		textBox,
	);

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

	const keepOrientationlens = L.lens(R.identity, (newV, { x, y }) => ({
		x: Math.sign(x) * Math.abs(newV.x),
		y: Math.sign(y) * Math.abs(newV.y),
	}));

	export const canCancel = read(
		({ a, d }) => a || d,
		combine({ d: isDragging, a: isActive }),
	);

	export function cancel() {
		isActive.value = false;
	}
</script>

<g
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		evt.stopPropagation();
	}}
	onkeydown={(evt) => {}}
>
	<path
		d={frameBoxPath.value}
		pointer-events="all"
		fill="none"
		class="text-box-surface"
		class:dim={isActive.value && !isDragging.value}
		class:dim-empty={textEmpty.value}
		role="button"
		tabindex="-1"
		onkeydown={(evt) => {
			if (evt.key === "Escape" || evt.key === "Esc") {
				isActive.value = false;
			}
		}}
		onpointerdown={(evt) => {
			if (!evt.isPrimary || !U.isLeftButton(evt)) {
				isActive.value = false;
				return;
			}

			if (text.value) {
				createTextBox({
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
				});

				text.value = undefined;
				return;
			}

			evt.currentTarget.setPointerCapture(evt.pointerId);
			textBoxStart.value = clientToCanvas(evt.clientX, evt.clientY);
			isDragging.value = true;
			textBoxFontSize.value = cameraScale.value;
			textBoxSize.value = { x: 0, y: 0 };
			textBoxAngle.value = -cameraOrientation.value;
			text.value = undefined;
		}}
		onpointermove={(evt) => {
			if (!evt.isPrimary) {
				return;
			}
			if (!isActive.value) {
				return;
			}
			if (!isDragging.value) {
				return;
			}

			const worldPos = clientToCanvas(evt.clientX, evt.clientY);

			const dx = worldPos.x - textBoxStart.value.x;
			const dy = worldPos.y - textBoxStart.value.y;
			textBoxSize.value = {
				x: textBoxAngleCos.value * dx + textBoxAngleSin.value * dy,
				y: -textBoxAngleSin.value * dx + textBoxAngleCos.value * dy,
			};
		}}
		onpointerup={(evt) => {
			if (!evt.isPrimary) {
				return;
			}
			if (!isActive.value) {
				return;
			}
			if (!isDragging.value) {
				return;
			}

			isDragging.value = false;
			if (!textBoxValid.value) {
				textBoxStart.value = undefined;
			}
		}}
		onpointercancel={(evt) => {
			isDragging.value = false;
		}}
		onlostpointercapture={(evt) => {
			if (!evt.isPrimary) {
				return;
			}
			if (!isDragging.value) {
				return;
			}
			isActive.value = undefined;
		}}
		onfocus={(evt) => {
			if (isDragging.value) {
				return;
			}
			if (text.value) {
				evt.currentTarget.form.dispatchEvent(
					new CustomEvent("submit", {
						cancelable: true,
					}),
				);
			}
			textBoxStart.value = undefined;
		}}
	/>

	<g transform={rotationTransform.value}>
		{#if isActive.value && !isDragging.value}
			<g
				shape-rendering="geometricPrecision"
				text-rendering="optimizeLegibility"
				transform="translate({textBoxStart.value.x}, {textBoxStart.value
					.y}) rotate({textBoxAngle.value}) translate({-textBoxStart
					.value.x}, {-textBoxStart.value.y})"
			>
				<foreignObject
					shape-rendering="geometricPrecision"
					text-rendering="optimizeLegibility"
					width={Math.max(1, Math.abs(textBoxSize.value.x))}
					height={Math.max(1, Math.abs(textBoxSize.value.y))}
					x={textBoxStart.value.x + Math.min(0, textBoxSize.value.x)}
					y={textBoxStart.value.y + Math.min(0, textBoxSize.value.y)}
					style:overflow="visible"
				>
					<form
						xmlns="http://www.w3.org/1999/xhtml"
						onsubmit={(evt) => {
							evt.preventDefault();
							if (text.value) {
								createTextBox({
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
								});
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
									isActive.value = false;
								} else if (
									evt.key === "Enter" &&
									evt.shiftKey &&
									text.value
								) {
									evt.currentTarget.blur();
								}
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
			class={"text-box"}
			pointer-events="none"
			class:ready={!isDragging.value}
			class:valid={textBoxValid.value}
		/>
	</g>
</g>

<style>
	.text-box-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.text-box {
		fill: #fff;
		stroke: #aa0000;
		fill-opacity: 0.9;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	.text-box.valid {
		stroke: #00ddff;
	}

	.text-box.ready {
		stroke: #00aaff;
		stroke-width: 2px;
		fill: none;
		pointer-events: none;
	}

	form {
		display: contents;
	}

	textarea {
		font: inherit;
		border: none;
		padding: 2px;
		display: block;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		background: #fff;
		resize: none;
		min-height: 0;
		margin: 0;
		line-height: 1.1;
		outline: none;
		overflow: hidden;
		text-indent: 0;
		caret-color: #00aaff;

		word-break: break-all;
		overflow-wrap: break-word;
		/*overflow-y: scroll;
		overflow-x: auto;
		scrollbar-gutter: stable;
		scrollbar-width: thin;*/
		scrollbar-gutter: auto;
		font-family: monospace;
		-webkit-text-size-adjust: none;
	}

	.dim {
		fill: #ffffff33;
		cursor: default;
	}

	.dim-empty {
		cursor: text;
	}
</style>
