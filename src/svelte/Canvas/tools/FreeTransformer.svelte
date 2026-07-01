<script>


    import {
        view,
    } from "../../svatom.svelte.js";
    const {rotationTransform, controls: newControls, documentContent, clientToCanvas} = $props()
</script>
<g transform={rotationTransform.value}>
                                    {#each Object.entries(newControls) as [c, ctrl]}
                                        {@const list = view(ctrl.entities, documentContent)}

                                    {#each list.value as l}

                                        {#each Object.values(ctrl.props) as p}
                                        {const cpi = view([c,  l, p], documentContent)}
                                        <circle
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
                                            cx={cpi.value.x}
                                            cy={cpi.value.y}
                                            r="10"
                                            fill="gold"
                                        ></circle>
                                    {/each}
                                    {/each}
                                    {/each}
                                    </g
                                >
