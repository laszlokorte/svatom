<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import {
		update,
		disableEventIf
	} from "../../svatom.svelte.js";

	const {children, hitAreas, selection, rotationTransform} = $props()

</script>

<g 
	onkeydown={(evt) => {}}
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		const id = evt.target.getAttribute('data-area-id')
		if(id) {
			if(evt.shiftKey) {
				update(R.append(id), selection)
			} else {
				update(R.always([id]), selection)
			}
			evt.stopPropagation()
		} else {
			if(evt.shiftKey) {
			} else {
				update(R.always([]), selection)
			}
		}
	}}
>

<g>
	{@render children()}
</g>

<g transform="{rotationTransform.value}">
{#each hitAreas.value as ha}
{#if ha.type === 'circle'}
<circle class="hit-area" cx={ha.cx} cy={ha.cy}  r={ha.r}  data-area-id={ha.id} class:active={selection.value.indexOf(ha.id) > -1} />
{:else if ha.type === 'polygon'}
<polygon class="hit-area" points={ha.points.map(({x,y}) => `${x} ${y}`).join(" ")} data-area-id={ha.id} class:active={selection.value.indexOf(ha.id) > -1}/>
{/if}
{/each}
</g>
</g>

<style>
	.hit-area {
		fill: none;
		pointer-events: all;
		stroke: none;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}

	.hit-area.active {
		fill: #3298FD;
		fill-opacity: 0.3 ;
		stroke: #3298FD;
	}
</style>