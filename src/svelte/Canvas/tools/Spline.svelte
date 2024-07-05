<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read, combine, fsm } from "../../svatom.svelte.js";
	import { createMachine, assign } from 'xstate';

	const {
		frameBoxPath,
		clientToCanvas,
		cameraScale,
		rotationTransform,
		newDrawing = atom(undefined),
	} = $props();

	const snapRadius = 8;
	const snapRadiusVisual = 8;


	const machineDef = createMachine({
	  context: {
	    path: [],
	  },
	  initial: 'EMPTY',
	  states: {
	  	'EMPTY': {},
	  },
	});

	const machine = fsm(machineDef)

	const splinePath = atom("")
	const dragging = read('dragging', machine)
</script>

<path
	class="spline-surface"
	d={frameBoxPath.value}
	pointer-events="all"
	stroke="none"
	fill="none"
	role="button"
	tabindex="-1"
	class:dragging={dragging.value}
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			machine.send({ type: 'ESCAPE' });
		}
		if (evt.key === "b") {
			machine.send({ type: 'POP' });
		}
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		machine.send({ type: 'FINISH' });
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		if (!U.isLeftButton(evt)) {
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);
		const p = clientToCanvas(evt.clientX, evt.clientY);

		machine.send({ type: 'PRESS', position: p, scale: cameraScale.value, pointerSize: Math.hypot(evt.width, evt.height) });
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (
			evt.pointerId &&
			!evt.currentTarget.hasPointerCapture(evt.pointerId)
		) {
			return;
		}

		const p = clientToCanvas(evt.clientX, evt.clientY);

		machine.send({ type: 'MOVE', position: p, scale: cameraScale.value, pointerSize: Math.hypot(evt.width, evt.height) });
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		
		machine.send({ type: 'RELEASE' });
		
	}}
	onpointercancel={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		machine.send({ type: 'CANCEL' });
	}}
	onlostpointercapture={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!dragging.value) {
			return;
		}
		
		machine.send({ type: 'INTERUPT' });
	}}
/>

<g transform={rotationTransform.value} pointer-events="none">
	<path d={splinePath.value} fill="none" class="draft-line" />

</g>

<style>
	.spline-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.draft-line {
		fill: none;
		stroke: darkgray;
		stroke-width: 3px;
		stroke-opacity: 0.8;
		vector-effect: non-scaling-stroke;
	}

	.draft-line-head {
		fill: none;
		stroke: darkgray;
		stroke-width: 3px;
		stroke-opacity: 0.3;
		vector-effect: non-scaling-stroke;
		outline: none;
	}

	[role="button"] {
		outline: none;
	}

	.capture-spot {
		stroke: #ff6e60;
		fill: #ffcec0;
		vector-effect: non-scaling-stroke;
	}
	.capture-spot.close {
		stroke: #0e70dd;
		fill: #3ea0ff;
		vector-effect: non-scaling-stroke;
	}
	.capture-spot.finish {
		stroke: #1e9910;
		fill: #5edd50;
		vector-effect: non-scaling-stroke;
	}

	.capture-spot-center {
		fill: #1e9910;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	.capture-spot.snapped {
		fill: #ff6e60;
	}
	.capture-spot.close.snapped {
		fill: #0e70dd;
	}
	.capture-spot.finish.snapped {
		fill: #1e9910;
	}

	.cancel-spot {
		stroke: #aa0000;
		fill: #ff8888;
		vector-effect: non-scaling-stroke;
	}

	.cancel-spot.snapped {
		fill: #aa0000;
	}

	.dragging {
		cursor: move;
	}
</style>
