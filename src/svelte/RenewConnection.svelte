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

<path
	stroke-width={e.connection.style?.stroke_width ?? 1}
	stroke={e.connection.style?.stroke_color ?? "black"}
	fill="none"
	d="M{e.connection.source_x},{e.connection.source_y}
						{e.connection.waypoints.map(({ x, y }) => `L ${x},${y}`).join(' ')}
							L{e.connection.target_x},{e.connection.target_y}"
/>
