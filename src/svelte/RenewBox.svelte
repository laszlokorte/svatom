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
</script>

<rect
	x={e.position_x}
	y={e.position_y}
	width={e.box.width}
	height={e.box.height}
	stroke-width={e.style?.border_width ?? "1"}
	stroke={e.style?.border_color ?? "black"}
	fill={e.style?.background_color ?? "green"}
></rect>
