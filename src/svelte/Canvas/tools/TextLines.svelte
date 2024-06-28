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
</script>

<g transform={rotationTransform.value} vector-effect="non-rotation">
	{#each textes.value as t}
		<g
			transform="translate({t.x}, {t.y}) rotate({-cameraOrientation.value}) translate({-t.x}, {-t.y})"
		>
			<circle
				cx={t.x}
				cy={t.y + t.fontSize}
				r={t.fontSize}
				fill="#55aaee"
			/>
			<text
				x={t.x}
				y={t.y}
				stroke="white"
				paint-order="stroke"
				stroke-width="1px"
				vector-effect="non-scaling-stroke"
				font-size="{t.fontSize}em"
				text-anchor="middle">{t.content}</text
			>
		</g>
	{/each}
</g>

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
		border: none;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		background: #fff;
		text-align: center;
		outline: none;
	}

	.dim {
		cursor: default;
	}

	.dim-empty {
		cursor: text;
	}
</style>
