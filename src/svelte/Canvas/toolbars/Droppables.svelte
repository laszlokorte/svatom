<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { string, view, read } from "../../svatom.svelte";
	import { polyfillDragDrop } from "../lib/drag-drop-poly.svelte.js";

	const { properties } = $props();

	const fillColorLens = ["fillColor", L.valueOr("#00aaff")];

	const droppables = [
		{
			dynamicContent: (props) => ({
				box: "-30 -50 60 100",
				paths: [
					{
						fill: L.get(fillColorLens, props),
						path: "M-30,-50h60v20h-40v20h20v20h-20v40h-20z",
					},
				],
			}),
			mimeType: "x-custom/shape",
			preview: shape,
			alignX: 0.5,
			alignY: 0.5,
		},
		{
			content: { text: "T" },
			mimeType: "x-custom/text",
			preview: text,
			alignX: 0.5,
			alignY: 0.9,
		},
		{
			content: {},
			mimeType: "x-custom/node",
			preview: circle,
			alignX: 0.5,
			alignY: 0.5,
		},
		{
			content: {
				box: "-54 -54 108 108",
				paths: [
					{
						fill: "#70db93",
						stroke: "black",
						path: "M-50,-50h100v100h-100z",
					},
				],
			},
			mimeType: "x-custom/shape",
			preview: shape,
			alignX: 0.5,
			alignY: 0.5,
		},
		{
			content: {
				box: "-54 -54 108 108",
				paths: [
					{
						fill: "#70db93",
						stroke: "black",
						path: "M-50,0 a 50 50 0 0 0 100 0 a 50 50 0 0 0 -100 0",
					},
				],
			},
			mimeType: "x-custom/shape",
			preview: shape,
			alignX: 0.5,
			alignY: 0.5,
		},
		{
			content: {
				box: "-50 -25 100 50",
				paths: [
					{
						fill: "#fff",
						stroke: "black",
						path: "M-50,-25h100v50h-100z",
					},
				],
			},
			mimeType: "x-custom/shape",
			preview: shape,
			alignX: 0.5,
			alignY: 0.5,
		},
		{
			content: {
				box: "-54 -54 108 108",
				paths: [
					{
						fill: "#fff",
						stroke: "black",
						path: "M-50,0 a 50 50 0 0 0 100 0 a 50 50 0 0 0 -100 0",
					},
				],
			},
			mimeType: "x-custom/shape",
			preview: shape,
			alignX: 0.5,
			alignY: 0.5,
		},
		{
			content: {
				box: "-54 -54 108 108",
				paths: [
					{
						fill: "black",
						stroke: "none",
						path: "M-40,-40 m-2.5,2.5 l 80 80 l 5 -5 l -80,-80z ",
					},
					{
						fill: "black",
						stroke: "none",
						path: "M -40,40 m-2.5,-2.5 l 80,-80 l 5 5 l -80,80z",
					},
				],
			},
			mimeType: "x-custom/shape",
			preview: shape,
			alignX: 0.5,
			alignY: 0.5,
		},
	];
</script>

{#snippet circle(content)}
	<svg
		preserveAspectRatio="xMidYMid meet"
		viewBox="-54 -54 108 108"
		fill="white"
		style="width: 100%; height: 100%; overflow: hidden;"
	>
		<circle
			cx="0"
			cy="0"
			r="40"
			fill="#cc3300"
			stroke="#bb2200"
			stroke-width="7px"
		></circle>
	</svg>
{/snippet}

{#snippet shape(content)}
	<svg
		preserveAspectRatio="xMidYMid meet"
		viewBox={content.box}
		fill="white"
		style="width: 100%; height: 100%; overflow: hidden;"
	>
		{#each content.paths as path}
			<path
				d={path.path}
				fill={path.fill}
				stroke={path.stroke}
				stroke-width="2px"
				vector-effect="non-scaling-stroke"
				fill-rule="nonzero"
			/>
		{/each}
	</svg>
{/snippet}

{#snippet text(content)}
	<svg
		preserveAspectRatio="xMidYMid meet"
		viewBox="-54 -54 108 108"
		fill="white"
		style="width: 100%; height: 100%; overflow: hidden;"
	>
		<text
			font-size="120"
			x="0"
			y="0"
			fill="#333"
			dominant-baseline="central"
			text-anchor="middle"
			font-family="sans-serif">{content.text}</text
		>
	</svg>
{/snippet}

<fieldset>
	<legend>Droppables</legend>

	<div
		class="template-bar"
		use:polyfillDragDrop={{
			dropArea: document,
			options: { dragThresholdPixels: 0 },
		}}
	>
		{#each droppables as d}
			{@const content = d.dynamicContent
				? d.dynamicContent(properties.value)
				: d.content}

			<div
				role="application"
				class="drag-template"
				draggable="true"
				ondragstart={(evt) => {
					evt.stopPropagation();
					evt.dataTransfer.effectAllowed = "copy";
					evt.currentTarget.setAttribute("aria-grabbed", "true");
					const positionInfo =
						evt.currentTarget.getBoundingClientRect();
					evt.dataTransfer.setDragImage(
						evt.currentTarget,
						positionInfo.width * d.alignX,
						positionInfo.height * d.alignY,
					);
					const data = d.dynamicContent
						? d.dynamicContent(properties.value)
						: d.content;
					evt.dataTransfer.setData(d.mimeType, JSON.stringify(data));

					// Work-around for
					// https://bugs.chromium.org/p/chromium/issues/detail?id=1293803&no_tracker_redirect=1
					evt.dataTransfer.setData(
						"text/plain",
						JSON.stringify({
							mime: d.mimeType,
							data: data,
						}),
					);
				}}
				ondragend={(evt) => {
					evt.stopPropagation();
					evt.currentTarget.setAttribute("aria-grabbed", "false");
				}}
			>
				{@render d.preview(content)}
			</div>
		{/each}
	</div>

	<style>
		.template-bar {
			display: flex;
			gap: 0.5em;
			padding: 0.3em;
			flex-wrap: wrap;
			-webkit-tap-highlight-color: transparent;
			touch-action: manipulation;
			-webkit-user-drag: none !important;
		}

		.drag-template {
			touch-action: none;
			-webkit-user-drag: element !important;
			width: 3em;
			height: 3em;
			cursor: grab;
			display: grid;
			place-items: stretch;
			place-content: stretch;
			border: 1px solid transparent;
			-webkit-tap-highlight-color: transparent;
		}

		.drag-template > svg {
			display: block;
			-webkit-tap-highlight-color: transparent;
			pointer-events: none;
		}

		.drag-template[aria-grabbed="true"] {
			cursor: grabbing;
		}
	</style>
</fieldset>
