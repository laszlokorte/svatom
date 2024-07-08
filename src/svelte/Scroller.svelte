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
		alignment='left',
		scrollPosition = atom({ x: 0, y: 0 }),
		contentSize = atom({ x: 0, y: 0 }),
		scrollWindowSize = atom({ x: 0, y: 0 }),
		extraScrollPadding = atom(false)
	} = $props();

	const browserChromeOverscroll = atom({x:0,y:0})

	const scrollPadding = read(L.reread(({auto, winSize, conSize}) => auto ? ({
		left: winSize.x,
		top: winSize.y,
		right: winSize.x + (alignment == 'center' ? 0 : Math.max(0, winSize.x - conSize.x)),
		bottom: winSize.y + (alignment == 'center' ? 0 : Math.max(0, winSize.y - conSize.y)),
	}) : ({top:0,left:0,bottom:0,right:0})), combine({auto: extraScrollPadding, winSize: scrollWindowSize, conSize: contentSize}, {}))
	const paddedContentSize = read(L.reread(({pad, conSize}) => ({
		x: pad.left + pad.right + conSize.x,
		y: pad.top + pad.bottom + conSize.y
	})), combine({pad: scrollPadding, conSize: contentSize}, {}))

	const adjustedScrollPosition = view(L.lens(({ pos, windowSize, conSize, o, pad }) => ({
			x: R.clamp(-pad.left, Math.max(0, conSize.x - Math.floor(windowSize.x)), pos.x) + o.x + pad.left,
			y: R.clamp(-pad.top, Math.max(0, conSize.y - Math.floor(windowSize.y)), pos.y) + o.y + pad.top,
		}), (pos, { windowSize, conSize, pad }) => {
			const clampedX = R.clamp(-pad.left, Math.max(pad.left, conSize.x - Math.floor(windowSize.x)), pos.x - pad.left)
			const clampedY = R.clamp(-pad.top, Math.max(pad.top, conSize.y - Math.floor(windowSize.y)), pos.y - pad.top)


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
					x:  pos.x - pad.left - clampedX,
					y:  pos.y - pad.top - clampedY,
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
				Padded Size: {paddedContentSize.value.x} / {paddedContentSize.value.y}
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
		-webkit-touch-callout: none;
        -webkit-user-callout: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-user-modify: none;
        -webkit-highlight: none;
		user-select: none;
	}

	.scroller > * {
		grid-area: 1 / 1;
	}

	.scroller-measure {
		position: sticky;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
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
		right: 0;
		bottom: 0;
		-webkit-user-select: none;
		user-select: none;
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
