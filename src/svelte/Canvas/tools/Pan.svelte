<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view } from "../../svatom.svelte.js";

	const { frameBoxPath } = $props();

	const grabbing = atom(false);
</script>

<path
	d={frameBoxPath.value}
	class="pan-surface"
	class:grabbing={grabbing.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	onpointerdown={(evt) => {
		evt.currentTarget.setPointerCapture(evt.pointerId);
		grabbing.value = true;
	}}
	onpointermove={(evt) => {}}
	onpointerup={(evt) => {
		grabbing.value = false;
	}}
/>

<style>
	.pan-surface {
		cursor: grab;
		outline: none;
	}
	.pan-surface.grabbing {
		cursor: grabbing;
	}
</style>
