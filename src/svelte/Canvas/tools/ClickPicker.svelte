<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import {
		update,
		disableEventIf
	} from "../../svatom.svelte.js";
	import * as Geo from "../../geometry.js";

	const {children, hitAreas, selection, rotationTransform, clientToCanvas} = $props()

	const hitAreasValue = $derived(hitAreas.value)
	const selectionValue = $derived(selection.value)
</script>

<g 
	onkeydown={(evt) => {}}
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		const pos = clientToCanvas(evt.clientX, evt.clientY)
		const hitIndex = R.findIndex((ha) => {
			if(ha.type === 'circle') {
				if(Math.hypot(ha.cx - pos.x, ha.cy - pos.y) < ha.r) {
					return true
				}
			} else if(ha.type === 'polygon' && ha.points.length === 4) {
				return Geo.quadContainsPoint({a: ha.points[0], b: ha.points[1], c: ha.points[2], d: ha.points[3]}, pos)
			}

		}, hitAreasValue)

		const id = hitIndex<0 ? null : hitAreasValue[hitIndex].id

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

<g transform="{rotationTransform.value}" pointer-events="none">
{#each hitAreasValue as ha}
{#if ha.type === 'circle'}
<circle class="hit-area" cx={ha.cx} cy={ha.cy}  r={ha.r}  data-area-id={ha.id} class:active={selectionValue.indexOf(ha.id) > -1} />
{:else if ha.type === 'polygon'}
<polygon class="hit-area" points={ha.points.map(({x,y}) => `${x} ${y}`).join(" ")} data-area-id={ha.id} class:active={selectionValue.indexOf(ha.id) > -1}/>
{/if}
{/each}
</g>
</g>

<style>
	.hit-area {
		fill: none;
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