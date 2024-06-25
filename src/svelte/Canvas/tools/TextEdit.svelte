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
	const text = view("text", typer);
</script>

<path
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="typer-surface"
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		const svgP = clientToCanvas(evt.clientX, evt.clientY);

		position.value = svgP;
		text.value = undefined;
	}}
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			position.value = undefined;
		}
	}}
/>

<g transform={rotationTransform.value} vector-effect="non-rotation">
	{#each textes.value as t}
		<text
			style:font-size="1.2em"
			shape-rendering="crispEdges"
			transform="translate({t.x}, {t.y}) rotate({-cameraOrientation.value}) scale({R.clamp(
				0.01,
				6,
				cameraScale.value,
			)}) translate({-t.x}, {-t.y})"
			x={t.x - 11}
			y={t.y + 2}
			dominant-baseline="middle">{t.content}</text
		>
	{/each}
</g>

{#if position.value}
	<g transform={rotationTransform.value} vector-effect="non-rotation">
		<foreignObject
			shape-rendering="crispEdges"
			transform="translate({position.value.x}, {position.value
				.y}) rotate({-cameraOrientation.value}) scale({R.clamp(
				0.01,
				6,
				cameraScale.value,
			)}) translate({-position.value.x}, {-position.value.y})"
			width="300"
			height="50"
			x={position.value.x - 15}
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
{/if}

<style>
	.typer-surface {
		outline: none;
	}

	input {
		outline: 2px solid #00aaff;
		font: inherit;
		border: none;
		padding: 4px;
	}
</style>
