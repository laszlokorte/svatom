<script>
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const { children, extension, frameBoxPath, rotationInverseTransform, cameraFocus } =
		$props();

	const viewBox = read(
		({ minX, maxX, minY, maxY }) =>
			`${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
		extension,
	);
</script>

<svg viewBox={viewBox.value}>
	<path
		class="focus"
		fill="#fffa"
		d={frameBoxPath.value}
		transform={rotationInverseTransform.value}
	/>
	<path
		transform={rotationInverseTransform.value}
		d="M{cameraFocus.value.x} {cameraFocus.value
			.y} m0,25 h20 l-20,-50 l-20,50z"
		class="orientation"
	/>

	{@render children()}
</svg>

<style>
	svg {
		pointer-events: none;
		width: 100%;
		height: 100%;
		display: block;
		background: #fffa;
		border: 1px solid white;
	}

	.focus {
		fill: #aaa1;
		stroke: coral;
		stroke-opacity: 0.2;
		vector-effect: non-scaling-stroke;
		stroke-width: 1px;
	}

	.orientation {
		stroke: coral;
		fill: none;
		vector-effect: non-scaling-stroke;
		stroke-width: 1px;
	}
</style>
