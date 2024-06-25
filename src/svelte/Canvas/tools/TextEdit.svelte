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
	} = $props();

	const typer = atom({});

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
/>

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
			width="200"
			height="50"
			x={position.value.x - 15}
			y={position.value.y - 15}
			stroke="red"
		>
			<form
				xmlns="http://www.w3.org/1999/xhtml"
				style:padding="4px"
				style:font-size="1.2em"
				onsubmit={(evt) => {
					evt.preventDefault();
					position.value = undefined;
				}}
			>
				<input
					use:autofocusIf={position.value.x * position.value.x +
						position.value.y * position.value.y}
					type="text"
					bind:value={text.value}
				/>
			</form>
		</foreignObject>
	</g>
{/if}
