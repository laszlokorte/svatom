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
		<g transform="rotate({-cameraOrientation.value}, {t.x}, {t.y})">
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
				fill="white"
				paint-order="stroke"
				stroke-width="1px"
				font-size="{t.fontSize}em"
				text-anchor="middle">{t.content}</text
			>
			<text
				x={t.x}
				y={t.y}
				stroke="none"
				fill="black"
				font-size="{t.fontSize}em"
				text-anchor="middle">{t.content}</text
			>
		</g>
	{/each}
</g>

<style>
	text {
		-webkit-text-size-adjust: none;
	}
</style>
