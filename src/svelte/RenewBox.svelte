<script>
	import * as R from "ramda";
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

	function triangleRotation(x, y, w, h, r) {
		const corners = [
			{
				x: x + w / 2,
				y: y,
			},
			{
				x: x + w,
				y: y,
			},
			{
				x: x + w,
				y: y + h / 2,
			},
			{
				x: x + w,
				y: y + h,
			},
			{
				x: x + w / 2,
				y: y + h,
			},
			{
				x: x,
				y: y + h,
			},
			{
				x: x,
				y: y + h / 2,
			},
			{ x: x, y: y },
		];
		const i1 = ((r % 8) + 8) % 8;
		const i2 = (i1 + 3 - (i1 % 2)) % 8;
		const i3 = (i1 + 5 + (i1 % 2)) % 8;

		return [corners[i1], corners[i2], corners[i3]];
	}
</script>

{#if e.box.shape === "ellipse"}
	<ellipse
		cx={e.position_x + e.box.width / 2}
		cy={e.position_y + e.box.height / 2}
		rx={e.box.width / 2}
		ry={e.box.height / 2}
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "green"}
	></ellipse>
{:else if e.box.shape && e.box.shape.slice(0, "triangle".length) === "triangle"}
	{@const rotation = parseInt(10, e.box.shape.slice("triangle".length + 1))}
	<polygon
		points={triangleRotation(
			e.position_x,
			e.position_y,
			e.box.width,
			e.box.height,
			rotation,
		)
			.map(R.compose(R.join(","), R.props(["x", "y"])))
			.join(",")}
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "green"}
	></polygon>
{:else}
	<rect
		x={e.position_x}
		y={e.position_y}
		width={e.box.width}
		height={e.box.height}
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "green"}
	></rect>
{/if}
