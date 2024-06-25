<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { string, read } from "../../svatom.svelte.js";

	const { rotationTransform, cameraScale, cameraOrientation } = $props();
</script>

<g transform={rotationTransform.value} vector-effect="non-rotation">
	<foreignObject
		transform="translate(200, 100) rotate({-cameraOrientation.value}) scale({1.2 *
			R.clamp(0.01, 6, cameraScale.value)}) translate(-200, -100)"
		width="200"
		height="50"
		x="100"
		y="100"
	>
		<div
			xmlns="http://www.w3.org/1999/xhtml"
			style:padding="4px"
			style:font-size="1.2em"
		>
			<input xmlns="http://www.w3.org/1999/xhtml" type="text" />
		</div>
	</foreignObject>
</g>
