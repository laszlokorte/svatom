<script>
	import { string } from "../../svatom.svelte";
</script>

<fieldset>
	<legend>Droppables</legend>

	<div class="template-bar">
		<div
			role="application"
			class="drag-template"
			draggable="true"
			ondragstart={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "true");
				const positionInfo = evt.currentTarget.getBoundingClientRect();
				evt.dataTransfer.setDragImage(
					evt.currentTarget,
					positionInfo.width / 2,
					positionInfo.height / 2,
				);
				evt.dataTransfer.items.add(JSON.stringify({}), "x-custom/node");
				evt.dataTransfer.effectAllowed = "copy";
			}}
			ondragend={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "false");
			}}
		>
			<svg viewBox="-50 -50 100 100" fill="white" style="height: 100%;">
				<circle
					cx="0"
					cy="0"
					r="40"
					fill="#cc3300"
					stroke="#bb2200"
					stroke-width="7px"
				></circle>
			</svg>
		</div>
		<div
			role="application"
			class="drag-template"
			draggable="true"
			ondragstart={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "true");
				const positionInfo = evt.currentTarget.getBoundingClientRect();
				evt.dataTransfer.setDragImage(
					evt.currentTarget,
					positionInfo.width / 2,
					positionInfo.height,
				);
				evt.dataTransfer.items.add("T", "text/plain");
				evt.dataTransfer.effectAllowed = "copy";
			}}
			ondragend={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "false");
			}}
		>
			<svg
				viewBox="-50 -50 100 100"
				fill="white"
				style="width: 100%; height: 100%;"
			>
				<text
					font-size="120"
					x="0"
					y="0"
					fill="#333"
					dominant-baseline="central"
					text-anchor="middle"
					font-family="sans-serif">T</text
				>
			</svg>
		</div>
		<div
			role="application"
			class="drag-template"
			draggable="true"
			ondragstart={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "true");
				const positionInfo = evt.currentTarget.getBoundingClientRect();

				evt.dataTransfer.setDragImage(
					evt.currentTarget,
					positionInfo.width / 2,
					positionInfo.height / 2,
				);
				evt.dataTransfer.items.add(
					JSON.stringify({
						box: "-35 -50 60 100",
						paths: [
							{
								fill: "coral",
								path: "M-35,-50h60v20h-40v20h20v20h-20v40h-20z",
							},
						],
					}),
					"x-custom/shape",
				);
				evt.dataTransfer.effectAllowed = "copy";
			}}
			ondragend={(evt) => {
				evt.currentTarget.setAttribute("aria-grabbed", "false");
			}}
		>
			<svg
				viewBox="-35 -50 60 100"
				fill="white"
				width="60"
				height="100"
				style="width: 100%; height: 100%;"
			>
				<path
					d="M-35,-50h60v20h-40v20h20v20h-20v40h-20z"
					fill="coral"
					stroke="none"
				/>
			</svg>
		</div>
	</div>

	<style>
		.template-bar {
			display: flex;
			gap: 0.5em;
			padding: 0.3em;
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
		}

		.drag-template > svg {
			display: block;
		}

		.drag-template:global([aria-grabbed="true"]) {
			cursor: grabbing;
		}
	</style>
</fieldset>
