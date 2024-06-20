<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view } from "../../svatom.svelte.js";

	const { frameBoxPath } = $props();

	const cursorImgA = window.URL.createObjectURL(
		new Blob(
			[
				`<?xml version="1.0" encoding="utf-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="16" r="10" fill="#dd4e40" />
</svg>`,
			],
			{ type: "image/svg+xml" },
		),
	);

	const cursorImgB = window.URL.createObjectURL(
		new Blob(
			[
				`<?xml version="1.0" encoding="utf-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="16" r="8" fill="#4edd40" />
</svg>`,
			],
			{ type: "image/svg+xml" },
		),
	);

	const rotating = atom(false);
</script>

<path
	d={frameBoxPath.value}
	class="rotate-surface"
	class:rotating={rotating.value}
	style:--cursor-a="url({cursorImgA})"
	style:--cursor-b="url({cursorImgB})"
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	onpointerdown={(evt) => {
		evt.currentTarget.setPointerCapture(evt.pointerId);
		rotating.value = true;
	}}
	onpointermove={(evt) => {}}
	onpointerup={(evt) => {
		rotating.value = false;
	}}
/>

<style>
	.rotate-surface {
		cursor:
			var(--cursor-a) 16 16,
			default;
	}
	.rotate-surface.rotating {
		cursor: rotating;
		cursor:
			var(--cursor-b) 16 16,
			default;
	}
</style>
