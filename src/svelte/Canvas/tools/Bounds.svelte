<script>
	import * as L from "partial.lenses";
	import * as G from "../../generators";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		autofocusIf,
		string,
	} from "../../svatom.svelte.js";

	const { nodes, drawings, rotationTransform } = $props();

	const padding = 100;

	const branch = L.branch({
		nodes: L.elems,
		drawings: [L.elems, L.elems],
	});

	const allEntities = combine({ nodes, drawings });

	const minX = $derived(read([branch, "x"], allEntities).min - padding);
	const maxX = $derived(read([branch, "x"], allEntities).max + padding);
	const minY = $derived(read([branch, "y"], allEntities).min - padding);
	const maxY = $derived(read([branch, "y"], allEntities).max + padding);
</script>

<g transform={rotationTransform.value}>
	<path
		fill="none"
		class="bounds"
		d="M{minX} {minY} H{maxX} V{maxY} H {minX} z"
	/>
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
