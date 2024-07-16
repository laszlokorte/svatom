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

	const frameBoxObjectValue = $derived(frameBoxObject.value);
	const cameraScaleValue = $derived(cameraScale.value);
</script>

<rect
	x={frameBoxObjectValue.screenSpaceAligned.minX + cameraScaleValue * 20}
	y={frameBoxObjectValue.screenSpaceAligned.minY}
	width={frameBoxObjectValue.screenSpaceAligned.width - cameraScaleValue * 20}
	height={cameraScaleValue * 20}
	fill="#eee"
	stroke="#fff"
	stroke-width="2px"
	vector-effect="non-scaling-stroke"
></rect>

<rect
	x={frameBoxObjectValue.screenSpaceAligned.minX}
	y={frameBoxObjectValue.screenSpaceAligned.minY + cameraScaleValue * 20}
	height={frameBoxObjectValue.screenSpaceAligned.height -
		cameraScaleValue * 20}
	width={cameraScaleValue * 20}
	fill="#eee"
	stroke="#fff"
	stroke-width="2px"
	vector-effect="non-scaling-stroke"
></rect>

<rect
	x={frameBoxObjectValue.screenSpaceAligned.minX}
	y={frameBoxObjectValue.screenSpaceAligned.minY}
	width={cameraScaleValue * 20}
	height={cameraScaleValue * 20}
	fill="#99a"
	vector-effect="non-scaling-stroke"
></rect>
