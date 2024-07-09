<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const { nodes, edges, rotationTransform, cameraScale } = $props();

	const paths = view(
		({ ns, es }) =>
			R.join(
				" ",
				R.map(
					(e) =>
						U.formattedNumbers`M${ns[e.source].x} ${ns[e.source].y} L${ns[e.target].x} ${ns[e.target].y}`,
					es,
				),
			),
		combine({ ns: nodes, es: edges }),
	);
</script>

<g transform={rotationTransform.value} pointer-events="none">
	<path class="edge" stroke="black" d={paths.value} />
</g>

<style>
	.edge {
		vector-effect: non-scaling-stroke;

		stroke-width: 1px;
		stroke: black;
		stroke-linecap: round;
	}
</style>
