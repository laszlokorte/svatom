<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import {
		atom,
		view,
		combine,
		bindScroll,
		bindSize,
	} from "./svatom.svelte.js";

	const {
		children, 
		debug = false,
		scrollPosition = atom({ x: 0, y: 0 }),
		contentSize = atom({ x: 0, y: 0 }),
		scrollWindowSize = atom({ x: 0, y: 0 })
	} = $props();

	const scrollPositionClamped = view(L.lens(({ pos, windowSize, contentSize }) => ({
			x: R.clamp(0, Math.max(0, contentSize.x - windowSize.x), pos.x),
			y: R.clamp(0, Math.max(0, contentSize.y - windowSize.y), pos.y),
		}), (pos, { windowSize, contentSize }) => {
			return {
				windowSize, contentSize,
				pos: {
					x: R.clamp(0, Math.max(0, contentSize.x - windowSize.x), pos.x),
					y: R.clamp(0, Math.max(0, contentSize.y - windowSize.y), pos.y),
				}
			}
		}),
		combine({ pos: scrollPosition, windowSize: scrollWindowSize, contentSize: contentSize }),
	);

</script>

<div
	class="scroller"
	use:bindScroll={scrollPosition}
	style:--scroll-total-x={contentSize.value.x}
	style:--scroll-total-y={contentSize.value.y}
	style:--scroll-x={scrollPositionClamped.value.x}
	style:--scroll-y={scrollPositionClamped.value.y}
>
	<div class="scroller-body">
		{@render children()}
		{#if !children || debug}
		<div class="debug">
			<div>
				Scroll Position: {scrollPosition.value.x} / {scrollPosition.value.y} 
				<br>(Clamped: {scrollPositionClamped.value.x} / {scrollPositionClamped.value.y})
			</div>
			<div>
				Content Size: {contentSize.value.x} / {contentSize.value.y}
			</div>
			<div>
				Window Size: {scrollWindowSize.value.x} / {scrollWindowSize.value.y}
			</div>
		</div>
		{/if}

	</div>
	<div class="scroller-measure" use:bindSize={scrollWindowSize}></div>
</div>
<style>
	.scroller {
		border: 3px solid #333;
		min-height: 10em;
		resize: both;
		overflow: scroll;
		height: 30em;
		position: relative;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
	}

	.scroller > * {
		grid-area: 1 / 1;
	}

	.scroller-measure {
		position: sticky;
		left: 0;
		top: 0;
		display: block;
		pointer-events: none;
		border: 1px solid lime;
		z-index: 10000;
		place-self: stretch;
		pointer-events: none;
	}

	.scroller::after {
		display: block;
		content: " ";
		height: calc(var(--scroll-total-y, 1) * 1px + 1px);
		width: calc(var(--scroll-total-x, 1) * 1px + 1px);
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.scroller-body {
		position: sticky;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		top: 0;
		left: 0;
	}

	.debug {
		color: #ffaaaa;
		text-align: left;
		background: #000a;
		pointer-events: none;
		position: absolute;
		top: 0;
		left: 0;
		padding: 1em;
		font-size: monospace;
		place-self: start;
	}
</style>
