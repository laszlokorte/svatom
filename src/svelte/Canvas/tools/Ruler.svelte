<script>
    const { frameBoxObject, cameraScale } = $props();

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
