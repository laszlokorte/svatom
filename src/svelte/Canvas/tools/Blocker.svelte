<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
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
	const {
		frameBoxPath,
		clientToCanvas,
		frame,
		rotationTransform,
		cameraOrientation,
		cameraScale,
	} = $props();
</script>

<path
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="rubber-band-surface"
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		evt.stopPropagation();
	}}
	onkeydown={(evt) => {
		evt.stopPropagation();
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		isActive.value = false;
	}}
	onpointerdown={(evt) => {
		evt.stopPropagation();
	}}
	onpointermove={(evt) => {
		evt.stopPropagation();
	}}
	onpointerup={(evt) => {
		evt.stopPropagation();
	}}
/>

<style>
</style>
