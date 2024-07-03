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
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const {
		frameBoxPath,
		clientToCanvas,
		frame,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		textBoxes = atom([]),
	} = $props();
</script>

<g transform={rotationTransform.value} vector-effect="non-rotation">
	{#each textBoxes.value as t}
		<g
			transform="translate({t.start.x}, {t.start
				.y}) rotate({t.angle}) translate({-t.start.x}, {-t.start.y})"
		>
			<foreignObject
				shape-rendering="crispEdges"
				text-rendering="crispEdges"
				vector-effect="non-scaling-stroke"
				width={Math.abs(t.size.x)}
				height={Math.abs(t.size.y)}
				x={t.start.x + Math.min(0, t.size.x)}
				y={t.start.y + Math.min(0, t.size.y)}
				style:overflow="visible"
			>
				<div class="text-output" style:font-size="{t.fontSize}em">
					{t.content}
				</div>
			</foreignObject>

			<rect
				class="text-box"
				shape-rendering="crispEdges"
				text-rendering="crispEdges"
				vector-effect="non-scaling-stroke"
				width={Math.abs(t.size.x)}
				height={Math.abs(t.size.y)}
				x={t.start.x + Math.min(0, t.size.x)}
				y={t.start.y + Math.min(0, t.size.y)}
				style:overflow="visible"
			></rect>
		</g>
	{/each}
</g>

<style>
	.text-box {
		fill: none;
		stroke: #aaa;
		stroke-opacity: 0.3;
		fill-opacity: 0.9;
		fill-rule: evenodd;
		stroke-width: 1px;
		pointer-events: none;
		vector-effect: non-scaling-stroke;
	}

	.text-output {
		pointer-events: none;
		font: inherit;
		font-family: monospace;
		border: none;
		padding: 2px;
		display: block;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		resize: none;
		line-height: 1.1;
		min-height: 0;
		white-space: pre-wrap;
		line-height: auto;
		word-break: break-all;
		overflow: visible;
		margin: 0;
		overflow-wrap: break-word;
		text-indent: 0;
		-webkit-text-size-adjust: none;

		overflow: visible;
		/*overflow: auto;
		scrollbar-width: thin;
		scrollbar-color: white #ffaaaa33;
		text-overflow: ellipsis;*/
	}
</style>
