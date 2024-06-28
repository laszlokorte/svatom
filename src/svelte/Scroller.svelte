<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import {
		atom,
		view,
		read,
		combine,
		bindScroll,
		bindSize,
	} from "./svatom.svelte.js";

	const {
		children, 
		debug = false,
		scrollPosition = atom({ x: 0, y: 0 }),
		contentSize = atom({ x: 0, y: 0 }),
		scrollWindowSize = atom({ x: 0, y: 0 }),
		extraScrollPadding = atom(false)
	} = $props();

	const browserChromeOverscroll = atom({x:0,y:0})

	const scrollPadding = read(L.reread(({auto, winSize}) => auto ? winSize : ({x:0,y:0})), combine({auto: extraScrollPadding, winSize: scrollWindowSize}, {}))
	const paddedContentSize = read(L.reread(({auto, pad, conSize}) => ({
		x:2*pad.x + conSize.x,
		y:2*pad.y + conSize.y
	})), combine({auto: extraScrollPadding, pad: scrollPadding, conSize: contentSize}, {}))

	const adjustedScrollPosition = view(L.lens(({ pos, windowSize, conSize, o, pad }) => ({
			x: R.clamp(-pad.x, Math.max(0, conSize.x - Math.floor(windowSize.x)), pos.x) + o.x + pad.x,
			y: R.clamp(-pad.y, Math.max(0, conSize.y - Math.floor(windowSize.y)), pos.y) + o.y + pad.y,
		}), (pos, { windowSize, conSize, pad }) => {
			const clampedX = R.clamp(-pad.x, Math.max(pad.x, conSize.x - Math.floor(windowSize.x)), pos.x - pad.x)
			const clampedY = R.clamp(-pad.y, Math.max(pad.y, conSize.y - Math.floor(windowSize.y)), pos.y - pad.y)


			return {
				windowSize, 
				conSize,
				pos: {
					atMinX: pos.atMinX,
					atMaxX: pos.atMaxX,
					atMinY: pos.atMinY,
					atMaxY: pos.atMaxY,
					x: clampedX,
					y: clampedY,
				},
				o: {
					x:  pos.x - pad.x - clampedX,
					y:  pos.y - pad.y - clampedY,
				}
			}
		}),
		combine({ pos: scrollPosition, windowSize: scrollWindowSize, conSize: paddedContentSize, o: browserChromeOverscroll, pad: scrollPadding }, {
			pos: true,
			o: true,
		}),
	);
</script>

<div
	class="scroller"
	use:bindScroll={adjustedScrollPosition}
	style:--scroll-total-x={paddedContentSize.value.x}
	style:--scroll-total-y={paddedContentSize.value.y}
	style:--scroll-x={scrollPosition.value.x}
	style:--scroll-y={scrollPosition.value.y}
>
	<div class="scroller-body">
		{@render children()}
		{#if !children || debug}
		<div class="debug">
			<div>
				Logical Scroll Pos.: {scrollPosition.value.x} / {scrollPosition.value.y}<br>
				Physical Scroll Pos.: {adjustedScrollPosition.value.x} / {adjustedScrollPosition.value.y}
			</div>
			<div>
				Content Size: {contentSize.value.x} / {contentSize.value.y}
			</div>
			<div>
				Window Size: {scrollWindowSize.value.x} / {scrollWindowSize.value.y}
			</div>
			<div>
				Overscroll: {browserChromeOverscroll.value.x} / {browserChromeOverscroll.value.y}
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
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
        -webkit-user-callout: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-user-modify: none;
        -webkit-highlight: none;
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
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
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
