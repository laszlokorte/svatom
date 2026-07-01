<script>
    const {
        frameBoxPath,
        clientToCanvas,
        frame,
        rotationTransform,
        cameraOrientation,
        cameraScale,
    } = $props();
</script>

<path
    d={frameBoxPath.value}
    pointer-events="all"
    fill="none"
    role="button"
    tabindex="-1"
    onclick={(evt) => {
        evt.stopPropagation();
    }}
    onkeydown={(evt) => {
        evt.stopPropagation();
    }}
    oncontextmenu={(evt) => {
        evt.preventDefault();
    }}
    onpointerdown={(evt) => {
        evt.stopPropagation();
    }}
    onpointermove={(evt) => {
        evt.stopPropagation();
    }}
    onpointerup={(evt) => {
        evt.stopPropagation();
    }}
/>

<style>
</style>
