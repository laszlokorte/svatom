<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { string, read } from "../../svatom.svelte.js";

	const { extension, rotationTransform } = $props();

	const path = string`M${read("minX", extension)} ${read("minY", extension)} H${read("maxX", extension)} V${read("maxY", extension)} H ${read("minX", extension)} z`;
</script>

<g transform={rotationTransform.value}>
	<path fill="none" class="bounds" d={path.value} />
</g>

<style>
	.bounds {
		fill: gray;
		fill-opacity: 0.1;
		stroke: #aaaa;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}
</style>
