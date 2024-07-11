<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import * as G from "../../generators";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const {
		clientToCanvas,
		frameBoxObject,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		alerts = atom([{x:50,y:120}]),
		cameraFocus
	} = $props();

	const radius = 12

	const cameraTransform = view([
		L.pick({box: ["frameBoxObject", "screenSpaceAligned"], angle: 'cameraOrientation'}),
		({box: {minX, minY, width, height}, angle}) => ({x: minX + width/2, y: minY + height/2, angle, minX, minY, width, height})], combine({frameBoxObject, cameraOrientation}))

	const screenspacePositions = view(({alerts, rect, scale}) => {
		return R.map((p) => {
			const {minX, minY, width, height} = rect
			return {
				screenPos: Geo.clamp2DBox(
				{minX, minY, width, height},
				Geo.rotatePivotXYDegree(rect.x, rect.y, rect.angle, p)),
				x: p.x,
				y: p.y,
			}
		}, alerts)
	}, combine({rect: cameraTransform, alerts, scale: cameraScale}))


	const cameraCenter = view(L.props('x','y'), cameraFocus)

	function scrollTo(evt) {
		if(!evt.isPrimary) {
			return
		}
		const x = parseFloat(evt.currentTarget.getAttribute('data-pos-x'))
		const y = parseFloat(evt.currentTarget.getAttribute('data-pos-y'))

		cameraCenter.value = {x,y}
	}

	const basePath = view(L.reread((scale) => `m 0 ${scale * radius} l ${scale * -radius} ${scale * -radius}  l ${scale * radius} ${scale * -radius}  l ${scale * radius} ${scale * radius}  z`), cameraScale)

	const paths = view(L.reread(({basePath, positions}) => G.map((pos) => ({
		path: `M ${pos.screenPos.x} ${pos.screenPos.y} ${basePath}`,
		x: pos.x,
		y: pos.y,
	}), positions)), combine({positions: screenspacePositions, basePath}))
</script>

{#each paths.value as p, i (i)}
	<path
		tabindex="-1"
		role="button"
		onpointerdown={scrollTo}
		class="alert-badge"
		data-pos-x={p.x}
		data-pos-y={p.y}
		d={p.path}
	></path>
{/each}

<style>
	.alert-badge {
		outline: none;
		cursor: pointer;
		fill: pink;
		stroke: darkred;
		stroke-width: 3px;
		vector-effect: non-scaling-stroke;
		stroke-linejoin: round;
	}

	.alert-badge:hover {
		fill: #dd5555;
	}
</style>