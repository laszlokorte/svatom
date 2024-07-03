<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { string, read } from "../../svatom.svelte.js";

	const { extension, cameraBounds, rotationTransform, show } = $props();

	const extensionPath = string`M${read("minX", extension)} ${read("minY", extension)} H${read("maxX", extension)} V${read("maxY", extension)} H ${read("minX", extension)} z`;
	const cameraBoundsPath = string`M${read("minX", cameraBounds)} ${read("minY", cameraBounds)} H${read("maxX", cameraBounds)} V${read("maxY", cameraBounds)} H ${read("minX", cameraBounds)} z`;

	const cameraBoundsTransform = string`rotate(${read(["angle", R.negate], cameraBounds)} ${read(({ minX, maxX }) => (minX + maxX) / 2, cameraBounds)} ${read(({ minY, maxY }) => (minY + maxY) / 2, cameraBounds)})`;
</script>

{#if show.value}
	<g transform={rotationTransform.value} pointer-events="none">
		<path
			fill="none"
			class="clamp-bounds"
			transform={cameraBoundsTransform.value}
			d={cameraBoundsPath.value}
		/>
		<path fill="none" class="bounds" d={extensionPath.value} />
	</g>
{/if}

<style>
	.bounds {
		fill: white;
		stroke: #f0f0f0;
		stroke-width: 3px;
		vector-effect: non-scaling-stroke;
		stroke-linecap: none;
		stroke-linejoin: none;
	}
	.clamp-bounds {
		fill: none;
		stroke: #ccddee;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke-dasharray: 2 5;
	}
</style>
