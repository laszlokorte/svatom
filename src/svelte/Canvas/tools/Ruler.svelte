<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import { view, read, combine } from "../../svatom.svelte.js";

	const minDragDistance = 25;
	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	const {
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		frameBoxObject,
		cameraScale,
	} = $props();
</script>

<rect
	x={frameBoxObject.value.screenSpaceAligned.minX + cameraScale.value * 20}
	y={frameBoxObject.value.screenSpaceAligned.minY}
	width={frameBoxObject.value.screenSpaceAligned.width -
		cameraScale.value * 20}
	height={cameraScale.value * 20}
	fill="#eee"
	stroke="#fff"
	stroke-width="2px"
	vector-effect="non-scaling-stroke"
></rect>

<rect
	x={frameBoxObject.value.screenSpaceAligned.minX}
	y={frameBoxObject.value.screenSpaceAligned.minY + cameraScale.value * 20}
	height={frameBoxObject.value.screenSpaceAligned.height -
		cameraScale.value * 20}
	width={cameraScale.value * 20}
	fill="#eee"
	stroke="#fff"
	stroke-width="2px"
	vector-effect="non-scaling-stroke"
></rect>

<rect
	x={frameBoxObject.value.screenSpaceAligned.minX}
	y={frameBoxObject.value.screenSpaceAligned.minY}
	width={cameraScale.value * 20}
	height={cameraScale.value * 20}
	fill="#99a"
	vector-effect="non-scaling-stroke"
></rect>
