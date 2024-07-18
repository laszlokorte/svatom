<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const { nodes, rotationTransform, cameraScale } = $props();
</script>

<g transform={rotationTransform.value} pointer-events="none">
	{#each nodes.value as v, i (i)}
		<use href="#node-{i}" />
	{/each}
</g>
