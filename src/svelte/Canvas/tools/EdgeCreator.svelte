<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, combine } from "../../svatom.svelte.js";
	const { nodes, rotationTransform, cameraScale, frameBoxPath, clientToCanvas, cameraTow, newEdge, newEdgeNode } = $props();

	const snapRadius = 30
	const snapRadiusScaled = view(R.compose(R.multiply(snapRadius), R.min(1)), cameraScale)
	const draft = atom({});

	const draftSourceId = view([L.removable('source'), 'source', L.rewrite((v, old) => isNaN(v) ? old : v), L.rewrite((v) => parseInt(v, 10))], draft)
	const draftSourcePosition = view(L.lens(({n, s}) => {
		return s!==undefined ? n[s] : undefined
	}, (newPos, {n, s}) => {
		return {n,s}
	}),  combine({n: nodes, s: draftSourceId}))
	const draftTarget = view([L.removable('target'), 'target'], draft)
	const draftTargetPosition = view([L.removable('position'), 'position'], draftTarget)
	const draftTargetIds = view(L.lens(R.prop('ids'), 
		(newIds, old) => (old.ids && newIds && old.ids.length !== newIds.length ? {...old, ids: newIds, cycle: 0} : {...old, ids: newIds})), draftTarget)
	const draftTargetSnapCycle = view(['cycle', L.defaults(0)], draftTarget)
	const draftTargetId = view(L.reread(({ids, cycle}) => ids ? ids[(cycle||0)%ids.length] : undefined), draftTarget)
	const isActive = view([L.lens(R.compose(R.not, R.isNil), (n, o) => n ? o : undefined)], draftSourceId)

	const connection = combine({source: draftSourceId, target: draftTargetId})
	const validConnection = view(R.both(R.compose(R.not, R.isNil, R.prop('source')), R.compose(R.not, R.isNil, R.prop('target'))), connection)


	const draftTargetSnappedPosition = view([L.lens(({n, t}) => {
			const snapId = t.ids ? t.ids[(t.cycle||0)%t.ids.length] :undefined
			return t!==undefined ? (snapId !== undefined ? n[snapId] : t.position) : undefined
		}, (newPos, {n, s}) => {
			return {n,s}
		})],  combine({n: nodes, t: draftTarget}))
</script>

<g 
	class="edge-container"
	class:active={isActive.value}
	role="button"
	tabindex="-1"
	transform={rotationTransform.value} 
	onkeydown={(evt) => {
		evt.preventDefault()
		if (evt.key === "Escape" || evt.key === "Esc") {
			isActive.value = false;
		}
		if (evt.key === "Tab") {
			draftTargetSnapCycle.value += 1
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			return;
		}
		const nodeId = evt.target.getAttribute('data-idx');
		evt.currentTarget.setPointerCapture(evt.pointerId)
		if(nodeId !== null) {
			draftSourceId.value = nodeId
			draftTargetPosition.value = clientToCanvas(evt.clientX, evt.clientY);
		}
	}}
	onpointermove={(evt) => {
		if(!evt.isPrimary) {
			return
		}
		if(!isActive.value) {
			return
		}



		const worldPos = clientToCanvas(evt.clientX, evt.clientY)
		draftTargetPosition.value = worldPos;
		cameraTow.value = worldPos

		const closeTargets = R.reject(R.isNil)(R.addIndex(R.map)((node, ni) => {
			if ( ni !== draftSourceId.value && Math.hypot(node.x - worldPos.x, node.y-worldPos.y) < snapRadiusScaled.value) {
				return ni
			} else {
				return null
			}
		}, nodes.value))

		if(closeTargets.length > 0) {
			draftTargetIds.value = closeTargets
		} else {
			draftTargetIds.value = undefined
		}
	}}
	onpointerup={(evt) => {
		if(!evt.isPrimary) {
			return
		}
		if(!isActive.value) {
			return
		}

		if(validConnection.value && newEdge) {
			newEdge.value = connection.value
		} else if (newEdgeNode) {
			newEdgeNode.value = {
				source: draftSourceId.value,
				newTarget: draftTargetPosition.value,
			}
		}

		isActive.value = false
		cameraTow.value = undefined
	}}
	onpointercancel={(evt) => {
		if(!evt.isPrimary) {
			return
		}
		isActive.value = false
		cameraTow.value = undefined
	}}
>
	<path 
		d={frameBoxPath.value}
		pointer-events="all"
		fill="none"
		class="edge-surface"
		class:active={isActive.value}
	/>

	{#each nodes.value as v, i (i)}
		<circle
			data-idx={i}
			class="socket"
			cx={v.x}
			cy={v.y}
			r={snapRadiusScaled.value}
			class:active-source={draftSourceId.value === i}
			class:active-target={draftTargetId.value === i}
		></circle>
	{/each}

	{#if draftSourcePosition.value && draftTargetSnappedPosition.value}
	<path class:valid={validConnection.value} class="edge" stroke="black" d="M{draftSourcePosition.value.x} {draftSourcePosition.value.y} L {draftTargetSnappedPosition.value.x} {draftTargetSnappedPosition.value.y}" />
	{/if}
	}
</g>

<style>
	.edge-surface {

	}

	.edge-surface.active {
		cursor: alias;
	}

	.edge-container.active {
		cursor: alias;
	}

	.socket {
		fill: lightblue;
		opacity: 0.5;
		stroke: none
		cursor: alias;
	}
	.socket.active-source {
		opacity: 0.8;
		stroke: lightblue;
		stroke-width: 10px;
	}
	.socket.active-target {
		opacity: 0.8;
		stroke: lightblue;
		stroke-width: 10px;
	}

	.edge {

		vector-effect: non-scaling-stroke;
		stroke-width: 3px;
		stroke: black;
		stroke-linecap: round;
		stroke-opacity: 0.5;
	}

	.edge.valid {
		stroke: green;
		stroke-width: 5px;
		stroke-opacity: 1;
	}
</style>
