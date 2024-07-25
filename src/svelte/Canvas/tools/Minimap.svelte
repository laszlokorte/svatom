<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import { atom, view, read, combine } from "../../svatom.svelte.js";
	import * as U from "../../utils.js";

	const { children, extension, frameBoxPath, rotationInverseTransform, rotationTransform, cameraFocus, visible = atom(true) } =
		$props();

	const viewBox = read(
		({ minX, maxX, minY, maxY }) =>
			`${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
		extension,
	);

	const isActive = atom(false)
</script>

<div style="text-align: right;">
	<label style="pointer-events: all;"><input type="checkbox" bind:checked={visible.value} class="striked-label-checkbox" /> <span class="striked-label">Minimap</span></label>
</div>

{#if visible.value}
<svg 
	tabindex="-1"
	class:active={isActive.value}
	viewBox={viewBox.value} 
	role="presentation"
	preserveAspectRatio="xMidYMid meet"
	onclick={(evt) => {
		evt.stopPropagation();
	}}
	ondblclick={(evt) => {
		evt.stopPropagation();

		cameraFocus.value = L.set('w', 0, cameraFocus.value)
	}}
	onkeydown={(evt) => {
		evt.stopPropagation();
		if (evt.key === "Escape" || evt.key === "Esc") {
			isActive.value = false;
		}
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		isActive.value = false;
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		isActive.value = true

	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			isActive.value = false;
			return;
		}
		if (!isActive.value) {
			return;
		}
		if(!evt.movementX && !evt.movementY) {
			return
		} 

		const ex = extension.value
		const minClient = Math.min(evt.currentTarget.clientWidth, evt.currentTarget.clientHeight)
		const minEx = Math.min((ex.maxX - ex.minX), (ex.maxY - ex.minY))
		const relX = evt.movementX / minClient
		const relY = evt.movementY / minClient
		const normedX = relX * minEx
		const normedY = relY * minEx
		cameraFocus.value = L.modify(L.props('x','y'), ({x,y}) => ({x:x+normedX,y:y+normedY}), cameraFocus.value)
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		isActive.value = false;
	}}
	onpointercancel={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		isActive.value = false;
	}}
	onlostpointercapture={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		isActive.value = false;
	}}>
	<g pointer-events="none" >
		{@render children()}
			<path
			class="focus"
			fill="#fffa"
			d={frameBoxPath.value}
			transform={rotationInverseTransform.value}
		/>
		<path
			transform={rotationInverseTransform.value}
			d="M{cameraFocus.value.x} {cameraFocus.value
				.y} m0,25 h20 l-20,-50 l-20,50z"
			class="orientation"
		/>

	</g>
</svg>
{/if}

<style>
	svg {
		width: 100%;
		height: 100%;
		display: block;
		background: #fffa;
		border: 1px solid white;
		cursor: grab;
		overflow: hidden;

		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
		outline: none;

		-webkit-touch-callout: none;
		-webkit-user-callout: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-modify: none;
		-webkit-highlight: none;
		-webkit-appearance: none;
		appearance: none;
		-webkit-tap-highlight-color: transparent;
		pointer-events: none;
	}

	@media (hover) {
		svg {	
			opacity: 0.5;
			pointer-events: all;
			transition: opacity 0.05s linear;
		}
		svg:hover {
			opacity: 1;
		}


		svg.active {
			cursor: grabbing;
			opacity: 1;
		}
	}


	.focus {
		fill: #aaa1;
		stroke: #fff;
		stroke-opacity: 0.2;
		vector-effect: non-scaling-stroke;
		stroke-width: 1px;
	}

	.orientation {
		stroke: coral;
		fill: none;
		vector-effect: non-scaling-stroke;
		stroke-width: 1px;
	}

	.striked-label-checkbox {
		display: none;
	}

	.striked-label {
		text-decoration: line-through;
		cursor: pointer;
	}

	input:checked + .striked-label{
		text-decoration: none;
	}
</style>
