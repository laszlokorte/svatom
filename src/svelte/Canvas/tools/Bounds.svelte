<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { traverse, combine, string } from "../../svatom.svelte.js";

	const { nodes, drawings, rotationTransform } = $props();

	const padding = 100;

	const branch = L.branch({
		nodes: L.elems,
		drawings: [L.elems, L.elems],
	});

	const allEntities = combine({ nodes, drawings });

	const minX = traverse([branch, "x"], L.minimum, allEntities).map(
		R.compose(R.subtract(R.__, padding), R.min(0), R.defaultTo(0)),
	);
	const maxX = traverse([branch, "x"], L.maximum, allEntities).map(
		R.compose(R.add(padding), R.max(0), R.defaultTo(0)),
	);
	const minY = traverse([branch, "y"], L.minimum, allEntities).map(
		R.compose(R.subtract(R.__, padding), R.min(0), R.defaultTo(0)),
	);
	const maxY = traverse([branch, "y"], L.maximum, allEntities).map(
		R.compose(R.add(padding), R.max(0), R.defaultTo(0)),
	);

	const extend = combine({
		minX,
		maxX,
		minY,
		maxY,
	});

	const path = string`M${minX} ${minY} H${maxX} V${maxY} H ${minX} z`;
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
