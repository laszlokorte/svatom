<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { string, read } from "../../svatom.svelte.js";

	const { rotationTransform, cameraScale } = $props();
</script>

<g transform={rotationTransform.value}>
	<path
		d="M{-10 * cameraScale.value},0h{20 * cameraScale.value}M0,{-10 *
			cameraScale.value}v{20 * cameraScale.value}"
		stroke-width={1}
		vector-effect="non-scaling-stroke"
		stroke="gray"
		opacity="0.2"
	/>
</g>
