<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const {
		clientToCanvas,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		shapes,
	} = $props();
</script>

<defs>
	{#each shapes.value as shape, s (s)}
		<g
			id="shape-{s}"
			transform="rotate({shape.placement.angle}, {shape.placement.start
				.x}, {shape.placement.start.y})"
			vector-effect="non-scaling-stroke"
		>
			<svg
				x={shape.placement.start.x +
					Math.min(0, shape.placement.size.x)}
				y={shape.placement.start.y +
					Math.min(0, shape.placement.size.y)}
				width={Math.abs(shape.placement.size.x)}
				height={Math.abs(shape.placement.size.y)}
				viewBox={shape.content.box}
				preserveAspectRatio="xMidYMid meet"
				style="overflow: visible;"
			>
				<g
					transform=" scale({Math.sign(
						shape.placement.size.x,
					)}, {Math.sign(shape.placement.size.y)})"
				>
					{#each shape.content.paths as p, i (i)}
						<path
							d={p.path}
							fill={p.fill}
							stroke={p.stroke}
							stroke-width="2px"
						/>
					{/each}
				</g>
			</svg>
		</g>
	{/each}
</defs>
