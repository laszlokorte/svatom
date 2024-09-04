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
		cx={e.box.position_x + e.box.width / 2}
		cy={e.box.position_y + e.box.height / 2}
		rx={e.box.width / 2}
		ry={e.box.height / 2}
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "#70DB93"}
	></ellipse>
{:else if e.box.shape && e.box.shape.slice(0, "triangle".length) === "triangle"}
	{@const rotation = parseInt(e.box.shape.slice("triangle".length + 1), 10)}
	<polygon
		points={triangleRotation(
			e.box.position_x,
			e.box.position_y,
			e.box.width,
			e.box.height,
			rotation,
		)
			.map(R.compose(R.join(","), R.props(["x", "y"])))
			.join(",")}
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "#70DB93"}
	></polygon>
{:else if e.box.shape && e.box.shape.slice(0, "roundrect".length) === "roundrect"}
	{@const [_, rx, ry] = e.box.shape.split(":", 3)}

	<rect
		x={e.box.position_x}
		y={e.box.position_y}
		rx={rx / 2}
		ry={ry / 2}
		width={e.box.width}
		height={e.box.height}
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "#70DB93"}
	></rect>
{:else if e.box.shape && e.box.shape.slice(0, "pie".length) === "pie"}
	{@const [_, start_angle, _end_angle] = e.box.shape.split(":", 3)}
	{@const end_angle = _end_angle}
	{@const cos_start = Math.cos((Math.PI / 180) * start_angle)}
	{@const sin_start = Math.sin((Math.PI / 180) * start_angle)}
	{@const cos_end = Math.cos((Math.PI / 180) * end_angle)}
	{@const sin_end = Math.sin((Math.PI / 180) * end_angle)}
	{@const dot = cos_start * cos_end + sin_start * sin_end}
	{@const det = cos_start * sin_end - sin_start * cos_end}
	{@const angle_diff = (Math.atan2(-det, -dot) * 180) / Math.PI + 180}

	<path
		d="M {e.box.position_x + e.box.width / 2}, {e.box.position_y +
			e.box.height / 2} L {e.box.position_x +
			e.box.width / 2 +
			(cos_start * e.box.width) / 2},
			 {e.box.position_y + e.box.height / 2 - (sin_start * e.box.height) / 2}

			A {e.box.width / 2} {e.box.height / 2} 0 {angle_diff < 180 ? '0 0' : '1 0'} {e
			.box.position_x +
			e.box.width / 2 +
			(cos_end * e.box.width) / 2},
			 {e.box.position_y + e.box.height / 2 - (sin_end * e.box.height) / 2} z"
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "#70DB93"}
		stroke-linejoin="miter"
		stroke-miterlimit="10"
	/>
	<!-- <circle
		r={5}
		fill="red"
		cx={e.box.position_x + e.box.width / 2 + (cos_start * e.box.width) / 2}
		cy={e.box.position_y +
			e.box.height / 2 -
			(sin_start * e.box.height) / 2}
	/>
	<circle
		r={5}
		fill="blue"
		cx={e.box.position_x + e.box.width / 2 + (cos_end * e.box.width) / 2}
		cy={e.box.position_y + e.box.height / 2 - (sin_end * e.box.height) / 2}
	/>
	<text
		fill="blue"
		x={e.box.position_x + e.box.width / 2 + (cos_end * e.box.width) / 2}
		y={e.box.position_y + e.box.height / 2 - (sin_end * e.box.height) / 2}
		>{angle_diff}</text
	> -->
{:else if e.box.shape === "diamond"}
	{@const rotation = parseInt(10, e.box.shape.slice("triangle".length + 1))}
	<polygon
		points="{e.box.position_x + e.box.width / 2} {e.box.position_y}
						{e.box.position_x + e.box.width} {e.box.position_y + e.box.height / 2}
						{e.box.position_x + e.box.width / 2} {e.box.position_y + e.box.height}
						{e.box.position_x} {e.box.position_y + e.box.height / 2}"
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "#70DB93"}
	></polygon>
{:else}
	<rect
		x={e.box.position_x}
		y={e.box.position_y}
		width={e.box.width}
		height={e.box.height}
		stroke-width={e.style?.border_width ?? "1"}
		stroke={e.style?.border_color ?? "black"}
		fill={e.style?.background_color ?? "#70DB93"}
	></rect>
{/if}
