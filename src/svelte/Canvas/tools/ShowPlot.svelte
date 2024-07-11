<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as G from "../../generators";
	import * as Geo from "../../geometry";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const {
		clientToCanvas,
		frameBoxObject,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		plots = atom([
			{
		      "start": {
		        "x": 80,
		        "y": 60
		      },
		      "size": {
		        "x": 200,
		        "y": -200
		      },
		      "angle": 10
		    }
		])
	} = $props();

	const worldQuad = read("worldSpace", frameBoxObject);

</script>

<g pointer-events="none" transform={rotationTransform.value}>
	{#each plots.value as p, i (i)}
	{@const cos = Math.cos(p.angle/180*Math.PI)}
	{@const sin = Math.sin(p.angle/180*Math.PI)}
	{@const dx1 = cos * p.size.x}
	{@const dy1 = -sin * p.size.x}

	{@const dx2 = sin * p.size.y}
	{@const dy2 = cos * p.size.y}

	{@const xRay = Geo.rayInsideQuad(-p.angle/180*Math.PI, cos*p.start.y+sin*p.start.x, worldQuad.value)}
	{@const yRay = Geo.rayInsideQuad(-p.angle/180*Math.PI-Math.PI/2, cos*p.start.x-sin*p.start.y, worldQuad.value)}

	{#if xRay}
	<line x1={xRay.a.x} x2={xRay.b.x} y1={xRay.a.y} y2={xRay.b.y} stroke="gray" />


	{#each G.range(0, 100) as ix, i (i)}
	<circle cx={U.lerp(xRay.a.x, xRay.b.x, i/100)+dx2*Math.sin(6*Math.PI*cameraScale.value*i/100)} cy={U.lerp(xRay.a.y, xRay.b.y, i/100)+dy2*Math.sin(6*Math.PI*cameraScale.value*i/100)} r={3}  />
	{/each}
	{/if}
	{#if yRay}
	<line x1={yRay.a.x} x2={yRay.b.x} y1={yRay.a.y} y2={yRay.b.y} stroke="gray" />
	{/if}

	<path d="M{p.start.x} {p.start.y} m {dx1} {dy1} l {-dx1} {-dy1} l{dx2} {dy2}" stroke="green" stroke-width="3" fill="none" />
	{/each}
</g>
