<script>
    import {
        view,
    } from "../../svatom.svelte.js";
    const {rotationTransform, controls: newControls, documentContent, clientToCanvas} = $props()
</script>
<g class="interactive" transform={rotationTransform.value}>
    {#each Object.entries(newControls) as [c, ctrl]}
        {@const list = view(ctrl.entities, documentContent)}

    {#each list.value as l}

            {#each Object.values(ctrl.props) as p}
            {const cpi = view([c,  l, p], documentContent)}
            <g
                role="button"
                tabindex="-1"
                onpointerdown={(evt) => {
                    if (evt.isPrimary) {
                        evt.stopPropagation()
                        evt.preventDefault()
                        evt.currentTarget.setPointerCapture(
                            evt.pointerId,
                        );
                    }
                }}
                onclick={(evt) => {
                    evt.preventDefault()
                }}
                onkeydown={(evt) => {

                }}
                onpointermove={(evt) => {
                    if (
                        evt.currentTarget.hasPointerCapture(
                            evt.pointerId,
                        )
                    ) {
                        evt.stopPropagation()
                        evt.preventDefault()
                        const p = clientToCanvas(evt.clientX, evt.clientY)
                        cpi.value =p
                    }
                }}
>
  <circle
  cx={cpi.value.x}
  cy={cpi.value.y}
  r="25"
  fill="none"
  pointer-events="all"
></circle>
<circle
  class="handle"

  cx={cpi.value.x}
  cy={cpi.value.y}
  r="10"
  fill="gold"
></circle>
</g>
{/each}
{/each}
{/each}
</g
>

<style>
.interactive {

-webkit-tap-highlight-color: transparent;
}
.handle {
fill: yellow;
stroke: gold;
pointer-events: all;
stroke-width: 1px;
vector-effect: non-scaling-stroke;
outline: none;

-webkit-touch-callout: none;
-webkit-user-callout: none;
-webkit-user-select: none;
-webkit-user-drag: none;
-webkit-user-modify: none;
-webkit-highlight: none;
user-select: none;
}
</style>
