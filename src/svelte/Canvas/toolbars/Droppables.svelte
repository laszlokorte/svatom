<script>
	import { string } from "../../svatom.svelte";

	const droppables = [
		{
			content: {
				box: "-35 -50 60 100",
				paths: [
					{
						fill: "coral",
						path: "M-35,-50h60v20h-40v20h20v20h-20v40h-20z",
					},
				],
			},
			mimeType: "x-custom/shape",
			preview: shape,
			alignX: 0.5,
			alignY: 0.5,
		},
		{
			content: {text: "T"},
			mimeType: "text/plain",
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
				box: "-52 -52 104 104",
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
				box: "-52 -52 104 104",
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
				box: "-52 -52 104 104",
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
				box: "-52 -52 104 104",
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
	preserveAspectRatio="xMidYMid meet" viewBox="-52 -52 104 104" fill="white" style="width: 100%; height: 100%; overflow: hidden;">
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
		fill-rule="non-zero"
	/>
{/each}
</svg>
{/snippet}

{#snippet text(content)}
<svg
	preserveAspectRatio="xMidYMid meet"
	viewBox="-52 -52 104 104"
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

	<div class="template-bar">
		{#each droppables as d}

		<div
			role="application"
			class="drag-template"
			draggable="true"
			ondragstart={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "true");
				const positionInfo = evt.currentTarget.getBoundingClientRect();
				evt.dataTransfer.setDragImage(
					evt.currentTarget,
					positionInfo.width * d.alignX,
					positionInfo.height * d.alignY,
				);
				evt.dataTransfer.items.add(JSON.stringify(d.content), d.mimeType);
				evt.dataTransfer.effectAllowed = "copy";
			}}
			ondragend={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "false");
			}}
		>
			{@render d.preview(d.content)}
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
		}

		.drag-template {
			touch-action: none;
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
		}

		.drag-template:global([aria-grabbed="true"]) {
			cursor: grabbing;
		}
	</style>
</fieldset>
