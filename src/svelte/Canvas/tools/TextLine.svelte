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
	} from "../../svatom.svelte.js";

	const {
		rotationTransform,
		cameraScale,
		cameraOrientation,
		frameBoxPath,
		clientToCanvas,
		textes = atom([]),
	} = $props();

	const typer = atom({});
	const newText = view(L.appendTo, textes);

	const position = view([L.removable("position"), "position"], typer);
	const text = view(["text", L.valueOr("")], typer);
	const isEditing = view(R.compose(R.not, R.isNil), position);
	const textEmpty = view(L.reread(R.isEmpty), text);
</script>

<g transform={rotationTransform.value} vector-effect="non-rotation">
	{#each textes.value as t}
		<text
			style:font-size="1.2em"
			shape-rendering="geometricPrecision"
			text-rendering="optimizeLegibility"
			transform="translate({t.x}, {t.y}) rotate({-cameraOrientation.value}) scale({R.clamp(
				0.01,
				6,
				cameraScale.value,
			)}) translate({-t.x}, {-t.y})"
			x={t.x - 15}
			y={t.y + 2}
			stroke="white"
			paint-order="stroke"
			stroke-width="3"
			vector-effect="non-scaling-stroke"
			text-anchor="middle"
			dominant-baseline="middle">{t.content}</text
		>
	{/each}
</g>
<path
	d={frameBoxPath.value}
	class:dim={isEditing.value}
	class:dim-empty={textEmpty.value}
	pointer-events="all"
	fill="none"
	class="typer-surface"
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		if (isEditing.value) {
			position.value = undefined;
			return;
		}

		evt.preventDefault();

		const svgP = clientToCanvas(evt.clientX, evt.clientY);

		position.value = svgP;
		text.value = undefined;
	}}
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			position.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (isEditing.value) {
			if (text.value) {
				evt.preventDefault();
				newText.value = {
					x: position.value.x,
					y: position.value.y,
					content: text.value,
				};
			}
		}
	}}
/>

{#if position.value}
	<g transform={rotationTransform.value} vector-effect="non-rotation">
		<g
			shape-rendering="geometricPrecision"
			text-rendering="optimizeLegibility"
			transform="translate({position.value.x}, {position.value
				.y}) rotate({-cameraOrientation.value}) scale({R.clamp(
				0.01,
				6,
				cameraScale.value,
			)}) translate({-position.value.x}, {-position.value.y})"
		>
			<rect
				shape-rendering="geometricPrecision"
				text-rendering="optimizeLegibility"
				width="200"
				height="2em"
				x={position.value.x - 15 - 100}
				y={position.value.y - 15}
				style:overflow="visible"
				stroke="#00aaff"
				stroke-width="2px"
				fill="white"
				vector-effect="non-scaling-stroke"
			></rect>
			<foreignObject
				shape-rendering="geometricPrecision"
				text-rendering="optimizeLegibility"
				width="200"
				height="2em"
				x={position.value.x - 15 - 100}
				y={position.value.y - 15}
				style:overflow="visible"
			>
				<form
					xmlns="http://www.w3.org/1999/xhtml"
					style:font-size="1.2em"
					onsubmit={(evt) => {
						evt.preventDefault();
						if (text.value) {
							newText.value = {
								x: position.value.x,
								y: position.value.y,
								content: text.value,
							};
						}
						position.value = undefined;
					}}
				>
					<input
						use:autofocusIf={position.value.x * position.value.x +
							position.value.y * position.value.y}
						type="text"
						bind:value={text.value}
						onkeydown={(evt) => {
							if (evt.key === "Escape" || evt.key === "Esc") {
								position.value = undefined;
							}
						}}
						onblur={(evt) => {
							evt.preventDefault();
							if (text.value) {
								newText.value = {
									x: position.value.x,
									y: position.value.y,
									content: text.value,
								};
							}
							position.value = undefined;
						}}
					/>
				</form>
			</foreignObject>
		</g>
	</g>
{/if}

<style>
	.typer-surface {
		outline: none;
		cursor: text;
	}

	input {
		font: inherit;
		border: none;
		padding: 4px;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		background: #fff;
		text-align: center;
	}

	input:focus-visible {
		outline: 2px solid #00aaff;
	}

	.dim {
		fill: #ffffff33;
		cursor: default;
	}

	.dim-empty {
		cursor: text;
	}
</style>
