<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const { rotationTransform, zLayers } = $props();
</script>

{#each zLayers.value as l (l.id)}
	<use href="#{l.id}" />
{/each}
