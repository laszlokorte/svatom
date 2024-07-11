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
		      "angle": 0
		    }
		])
	} = $props();

	const worldQuad = read("worldSpace", frameBoxObject);


</script>

<g pointer-events="none" transform={rotationTransform.value}>
	{#each plots.value as p, i (i)}
	{@const quad = worldQuad.value}

	{@const cos = Math.cos(p.angle/180*Math.PI)}
	{@const sin = Math.sin(p.angle/180*Math.PI)}
	{@const sizeAbs = Math.hypot(p.size.x, p.size.y)}
	{@const dx1 = cos * p.size.x}
	{@const dy1 = -sin * p.size.x}

	{@const dx2 = sin * p.size.y}
	{@const dy2 = cos * p.size.y}

	{@const xRay = Geo.rayInsideQuad(-p.angle/180*Math.PI, cos*p.start.y+sin*p.start.x, quad)}
	{@const yRay = Geo.rayInsideQuad(-p.angle/180*Math.PI-Math.PI/2, cos*p.start.x-sin*p.start.y, quad)}

	{@const maxRight = R.compose(R.reduce(R.max, -Infinity), R.map((v) => Geo.dot2d(Geo.diff2d(v, p.start), {x: cos, y: -sin})), R.props(['a','b','c','d']))(quad)}
	{@const minRight = R.compose(R.reduce(R.min, Infinity), R.map((v) => Geo.dot2d(Geo.diff2d(v, p.start), {x: cos, y: -sin})), R.props(['a','b','c','d']))(quad)}
	{#if xRay}
	<line x1={xRay.a.x} x2={xRay.b.x} y1={xRay.a.y} y2={xRay.b.y} stroke="gray" />

	{@const toX = p.start.x+dx1/p.size.x*maxRight}
	{@const toY = p.start.y+dy1/p.size.x*maxRight}
	{@const fromX = p.start.x+dx1/p.size.x*minRight}
	{@const fromY = p.start.y+dy1/p.size.x*minRight}
	{@const yy = maxRight-minRight}
	{#each G.range(0, 1000) as ix, i (i)}
	{@const f = Math.sin(U.lerp(minRight, maxRight, i)/5000)*10}
	<circle cx={U.lerp(toX, fromX, i/1000)+dx2*f} cy={U.lerp(toY, fromY, i/1000)+dy2*f} r={3*cameraScale.value}  />
	{/each}
	{/if}
	{#if yRay}
	<line x1={yRay.a.x} x2={yRay.b.x} y1={yRay.a.y} y2={yRay.b.y} stroke="gray" />
	{/if}

	<path d="M{p.start.x} {p.start.y} m {dx1} {dy1} l {-dx1} {-dy1} l{dx2} {dy2}" stroke="green" stroke-width="3" fill="none" />
	{/each}
</g>
