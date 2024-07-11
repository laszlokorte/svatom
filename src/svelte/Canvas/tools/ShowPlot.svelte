<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const {
		clientToCanvas,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		plots = atom([])
	} = $props();
</script>

<g pointer-events="none" transform={rotationTransform.value}>
	<text x="0" y="100">Show Plot</text>
</g>
