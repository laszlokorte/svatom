<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { string, read } from "../../svatom.svelte.js";

	const { extension, cameraBounds, rotationTransform } = $props();

	const extensionPath = string`M${read("minX", extension)} ${read("minY", extension)} H${read("maxX", extension)} V${read("maxY", extension)} H ${read("minX", extension)} z`;
	const cameraBoundsPath = string`M${read("minX", cameraBounds)} ${read("minY", cameraBounds)} H${read("maxX", cameraBounds)} V${read("maxY", cameraBounds)} H ${read("minX", cameraBounds)} z`;

	const cameraBoundsTransform = string`rotate(${read(["angle", R.negate], cameraBounds)} ${read(({ minX, maxX }) => (minX + maxX) / 2, cameraBounds)} ${read(({ minY, maxY }) => (minY + maxY) / 2, cameraBounds)})`;
</script>

<g transform={rotationTransform.value}>
	<path
		fill="none"
		class="clamp-bounds"
		transform={cameraBoundsTransform.value}
		d={cameraBoundsPath.value}
	/>
	<path fill="none" class="bounds" d={extensionPath.value} />
</g>

<style>
	.bounds {
		fill: white;
		stroke: #aaa3;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}
	.clamp-bounds {
		fill: #88555505;
		stroke: #885555;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke-dasharray: 1 5;
	}
</style>
