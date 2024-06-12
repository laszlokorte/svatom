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

	const { nodes, rotationTransform } = $props();

	const padding = 100;
	const minX = $derived(read([L.elems, "x"], nodes).min - padding);
	const maxX = $derived(read([L.elems, "x"], nodes).max + padding);
	const minY = $derived(read([L.elems, "y"], nodes).min - padding);
	const maxY = $derived(read([L.elems, "y"], nodes).max + padding);
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
