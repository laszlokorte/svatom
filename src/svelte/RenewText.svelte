<script>
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindScrollMax,
		bindSize,
		string,
		bindBoundingBox,
		update,
	} from "./svatom.svelte.js";

	const { element: e } = $props();

	const lines = $derived(e.text.body.split("\n"));

	const measuredSize = atom();

	const measureValue = $derived(measuredSize.value);
	const fontSize = e.text.style.font_size;
</script>

{#if measureValue && e.style}
	<rect
		width={measureValue.width + 2}
		height={measureValue.height + 2}
		x={e.text.position_x - 1}
		y={e.text.position_y - 1}
		stroke-width={e.style.border_width || 0}
		stroke={e.style.border_color || "none"}
		fill={e.style.background_color || "none"}
	/>
{/if}

<!-- {#if measureValue}
	<rect
		width={measureValue.width + 2}
		height={measureValue.height + 2}
		x={e.text.position_x - 1}
		y={e.text.position_y - 1}
		stroke-width={2}
		stroke={"blue"}
		fill={"red"}
	/>
{/if}

<circle
	fill="cyan"
	r="5"
	cx={e.text.position_x - 1}
	cy={e.text.position_y - 1}
/> -->

<g use:bindBoundingBox={measuredSize}>
	<text
		fill={e.text.style?.text_color}
		font-style={e.text.style?.italic ? "italic" : "normal"}
		text-decoration={e.text.style?.underline ? "underline" : "none"}
		font-family={e.text.style?.font_family || "Arial"}
		font-weight={e.text.style?.bold ? "bold" : "normal"}
		x={e.text.position_x +
			(measureValue
				? (measureValue.width *
						{ left: 0, center: 1, right: 2 }[
							e.text.style?.alignment ?? "left"
						]) /
					2
				: 0)}
		y={e.text.position_y + fontSize}
		text-rendering="geometricPrecision"
		font-size={fontSize}
		text-anchor={measureValue
			? { left: "start", center: "middle", right: "end" }[
					e.text.style?.alignment ?? "left"
				]
			: "start"}
	>
		{#each lines as line, l (l)}
			<tspan
				x={e.text.position_x * 1 +
					(measureValue
						? (measureValue.width *
								{ left: 0, center: 1, right: 2 }[
									e.text.style?.alignment ?? "left"
								]) /
							2
						: 0)}
				dy={l ? "1.2em" : "0"}>{line}</tspan
			>
		{/each}
	</text>
</g>
