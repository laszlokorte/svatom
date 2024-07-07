<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import {
		atom,
		view,
		string,
		read,
		autofocusIf,
		combine,
	} from "../../svatom.svelte.js";

	const {
		rotationTransform,
		cameraScale,
		cameraOrientation,
		frameBoxPath,
		clientToCanvas,
		newText = atom(undefined),
	} = $props();

	const typer = atom({});

	const position = view([L.removable("position"), "position"], typer);
	const text = view(["text", L.valueOr("")], typer);
	const fontSize = view(["fontSize", L.valueOr(1)], typer);
	const isEditing = view(R.compose(R.not, R.isNil), position);
	const textEmpty = view(L.reread(R.isEmpty), text);

	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		position,
	);
	const isDragging = view(["dragging", L.valueOr(false)], typer);

	export const canCancel = read(
		({ a, d }) => a || d,
		combine({ d: isDragging, a: isActive }),
	);

	export function cancel() {
		isActive.value = false;
	}
</script>

<path
	d={frameBoxPath.value}
	class:dim={isEditing.value}
	class:dim-empty={textEmpty.value}
	pointer-events="all"
	fill="none"
	class="typer-surface"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			position.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			isActive.value = false;
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);

		if (isEditing.value) {
			if (text.value) {
				evt.preventDefault();
				newText.value = {
					x: position.value.x,
					y: position.value.y,
					fontSize: fontSize.value,
					content: text.value,
				};
				isActive.value = false;

				return;
			}
		} else {
			fontSize.value = cameraScale.value;
		}

		isDragging.value = true;
		position.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isDragging.value) {
			return;
		}

		position.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		isDragging.value = false;
	}}
	onpointercancel={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		isDragging.value = false;
	}}
	onlostpointercapture={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isDragging.value) {
			return;
		}
		position.value = undefined;
	}}
	onfocus={(evt) => {
		evt.preventDefault();
		if (text.value) {
			newText.value = {
				x: position.value.x,
				y: position.value.y,
				content: text.value,
				fontSize: fontSize.value,
			};
			position.value = undefined;
		}
	}}
/>

{#if position.value}
	<g transform={rotationTransform.value} vector-effect="non-rotation">
		<g
			transform="translate({position.value.x}, {position.value
				.y}) rotate({-cameraOrientation.value}) scale({fontSize.value}) translate({-position
				.value.x}, {-position.value.y})"
		>
			<foreignObject
				width="200"
				height="50"
				x={position.value.x - 100}
				y={position.value.y}
				style:transform="translate(0,-25px) translate(0,-.25em)"
				style:overflow="visible"
			>
				<form
					xmlns="http://www.w3.org/1999/xhtml"
					onsubmit={(evt) => {
						evt.preventDefault();
						if (text.value) {
							newText.value = {
								x: position.value.x,
								y: position.value.y,
								content: text.value,
								fontSize: fontSize.value,
							};
						}
						position.value = undefined;
					}}
				>
					<input
						use:autofocusIf={!isDragging.value}
						type="text"
						bind:value={text.value}
						onkeydown={(evt) => {
							if (evt.key === "Escape" || evt.key === "Esc") {
								position.value = undefined;
							}
						}}
					/>
				</form>
			</foreignObject>
			<rect
				shape-rendering="crispEdges"
				text-rendering="crispEdges"
				width="200"
				height="50"
				x={position.value.x - 100}
				y={position.value.y}
				style:overflow="visible"
				style:transform="translate(0,-25px) translate(0,-.25em)"
				stroke="#00aaff"
				stroke-width="2px"
				pointer-events="none"
				fill="none"
				vector-effect="non-scaling-stroke"
			></rect>
		</g>
	</g>
{/if}

<style>
	.typer-surface {
		stroke-width: 0;
		outline: none;
		cursor: text;
	}
	form {
		display: contents;
	}

	input {
		font: inherit;
		font-family: monospace;
		border: none;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		background: #fff;
		text-align: center;
		outline: none;
		color: inherit;
		margin: 0;
		line-height: 1;
		padding: 0;
		padding-inline: 0;
		padding-block: 0;
		caret-color: #00aaff;
		-webkit-text-size-adjust: none;
	}

	.dim {
		cursor: default;
	}

	.dim-empty {
		cursor: text;
	}
</style>
