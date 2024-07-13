<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read, combine, fsm } from "../../svatom.svelte.js";
	import { createMachine, assign, emit } from 'xstate';

	const {
		frameBoxPath,
		clientToCanvas,
		cameraScale,
		rotationTransform,
		newSpline = atom(undefined),
	} = $props();

	const snapRadius = 8;
	const snapRadiusVisual = 8;


	const machineDef = createMachine({
	  context: {
	    path: [],
	    draftPoint: null,
	    draftBackHandle: null,
	    draftFrontHandle: null,
	  },
	  initial: 'EMPTY',
	  states: {
	  	'EMPTY': {
	  		entry: [assign({
	  			path: [],
	  			draftPoint: null,
				draftFrontHandle: null,
				draftBackHandle: null,
			})],
	  		on: {
	  			'PRESS': {
	  				target: 'INITIAL_PRESSED',
	  				actions: assign({
	  					draftPoint: ({event: {position}}) => position
	  				})
	  			}
	  		}
	  	},
	  	'IDLE': {
	  		entry: [assign({
	  			draftPoint: null,
				draftFrontHandle: null,
				draftBackHandle: null,
			})],
  			always: {
  				target: 'EMPTY',
  				guard: ({context}) => context.path.length === 0,
  			},
	  		on: {
	  			'PRESS': {
	  				target: 'INITIAL_PRESSED',
	  				actions: assign({
	  					draftPoint: ({event: {position}}) => position
	  				})
	  			},

	  			'FINISH': {
	  				target: 'EMPTY',
	  				actions: emit(({context}) =>  ({type: 'COMPLETED', path: context.path}))
	  			},
	  			'ESCAPE': {
	  				target: 'EMPTY',
	  			},
	  			'POP': {
	  				target: 'IDLE',
	  				actions: assign({
	  					path: ({context}) => context.path.slice(0, context.path.length - 1)
	  				})
	  			},
	  			'CANCEL': {
	  				target: 'EMPTY',
	  			},
	  		}
	  	},
	  	'INITIAL_PRESSED': {
	  		entry: [assign({
				draftFrontHandle: null,
				draftBackHandle: null,
			})],
	  		on: {
	  			'MOVE': {
	  				guard: ({ context, event }) => Math.hypot(context.draftPoint.x - event.position.x, context.draftPoint.y - event.position.y) > 10,
	  				target: 'PRESSED',
	  			},
	  			'RELEASE': {
	  				target: 'IDLE',
	  				actions: assign({
	  					path: ({context}) => [...context.path, {
	  						point: context.draftPoint,
	  					}]
	  				})
	  			},
	  			'CANCEL': {
	  				target: 'EMPTY',
	  			},
	  			'ESCAPE': {
	  				target: 'IDLE',
	  			},
	  			'POP': {
	  				target: 'IDLE',
	  			},
	  			'FINISH': {
	  				target: 'IDLE',
	  			},
	  			'INTERUPT': {
	  				target: 'IDLE',
	  			},
	  		}
	  	},
	  	'PRESSED': {
	  		on: {
	  			'MOVE': {
	  				target: 'PRESSED',
	  				actions: assign({
	  					draftFrontHandle: ({event: {position}}) => position,
	  					draftBackHandle: ({event: {position, detached}, context}) => detached ? context.draftBackHandle :({
	  						x:context.draftPoint.x * 2 - position.x,
	  						y:context.draftPoint.y * 2 - position.y,
	  					})
	  				})
	  			},
	  			'RELEASE': {
	  				target: 'IDLE',
	  				actions: assign({
	  					path: ({context}) => [...context.path, {
	  						point: context.draftPoint,
	  						front: context.draftFrontHandle,
							back: context.draftBackHandle,
	  					}]
	  				})
	  			},
	  			'CANCEL': {
	  				target: 'EMPTY',
	  			},
	  			'ESCAPE': {
	  				target: 'INITIAL_PRESSED',
	  			},
	  			'POP': {
	  				target: 'IDLE',
	  			},
	  			'FINISH': {
	  				target: 'IDLE',
	  			},
	  			'INTERUPT': {
	  				target: 'IDLE',
	  			},
	  		}
	  	}
	  },
	});

	const machine = fsm(machineDef)

	const dragging = read('dragging', machine)


	const currentDraft = read(L.pick({
		bezier: ['path', L.reread(p => {
			if(p.length >= 2) {
				return `M${p[0].point.x} ${p[0].point.y}` + R.join(" ", R.map(([from, to]) => {
					if(!from.front && !to.back) {
						return `L ${to.point.x} ${to.point.y}`
					} else if(from.front && !to.back) {
						return `Q ${from.front.x} ${from.front.y} ${to.point.x} ${to.point.y}`
					} else if(!from.front && to.back) {
						return `Q ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`
					} else {
						return `C  ${from.front.x} ${from.front.y}  ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`
					}
				}, R.aperture(2, p)));
			} else if(p.length == 1) {
				return '';
			} else {
				return '';
			}
		})],
		draftBezier: [L.pick({
			from: ['path', L.last],
			to: {
				point: 'draftPoint',
				front: 'draftFrontHandle',
				back: 'draftBackHandle',
			}
		}), L.reread(({from, to}) => {
			if(from && to.point) {
				const start = `M${from.point.x} ${from.point.y}`
				if(!from.front && !to.back) {
					return start + `L ${to.point.x} ${to.point.y}`
				} else if(from.front && !to.back) {
					return start + `Q ${from.front.x} ${from.front.y} ${to.point.x} ${to.point.y}`
				} else if(!from.front && to.back) {
					return start + `Q ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`
				} else {
					return start + `C  ${from.front.x} ${from.front.y}  ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`
				}
			} else {
				return ''
			}
		})],
		path: 'path',
		pathHead: ['path', L.last],
		draftPoint: 'draftPoint',
		draftFrontHandle: 'draftFrontHandle',
		draftBackHandle: 'draftBackHandle',
	}), machine.context)


	const currentDraftValue = $derived(currentDraft.value)
	const cameraScaleValue = $derived(cameraScale.value)

	machine.on('COMPLETED', (event) => {
	  if(newSpline) {
	  	newSpline.value = event.path
	  }
	});


	export function cancel() {
		machine.send({ type: 'CANCEL' });
	}
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
			evt.preventDefault()
			machine.send({ type: 'ESCAPE' });
		}
		if (evt.key === "b") {
			evt.preventDefault()
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

		machine.send({ type: 'MOVE', position: p, scale: cameraScale.value, pointerSize: Math.hypot(evt.width, evt.height), detached: evt.shiftKey });
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

		machine.send({ type: 'INTERUPT' });
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

	{#if currentDraftValue.bezier}
		<path class="draft-line" fill="none" stroke-width="3px" d={currentDraftValue.bezier} stroke="darkgray" />
	{/if}

	{#if currentDraftValue.draftBezier}
		<path class="draft-line-head" fill="none" stroke-width="3px" d={currentDraftValue.draftBezier} stroke="lightgray" />
	{/if}

	{#if currentDraftValue.draftPoint}


		{#if currentDraftValue.draftFrontHandle}
			<line
			x1={currentDraftValue.draftPoint.x}
			y1={currentDraftValue.draftPoint.y}
			x2={currentDraftValue.draftFrontHandle.x}
			y2={currentDraftValue.draftFrontHandle.y}
			class="handle-bar" />
			<circle cx={currentDraftValue.draftFrontHandle.x} cy={currentDraftValue.draftFrontHandle.y} r={3*cameraScaleValue} class="handle" />
		{/if}

		{#if currentDraftValue.draftBackHandle}
			<line
			x1={currentDraftValue.draftPoint.x}
			y1={currentDraftValue.draftPoint.y}
			x2={currentDraftValue.draftBackHandle.x}
			y2={currentDraftValue.draftBackHandle.y}
			class="handle-bar" />
			<circle cx={currentDraftValue.draftBackHandle.x} cy={currentDraftValue.draftBackHandle.y} r={3*cameraScaleValue} class="handle" />
		{/if}


		{#if currentDraftValue.draftFrontHandle || currentDraftValue.draftBackHandle}
		<circle cx={currentDraftValue.draftPoint.x} cy={currentDraftValue.draftPoint.y} r={5*cameraScaleValue} class="point-hard" />
		{:else}
		<rect x={currentDraftValue.draftPoint.x-5*cameraScaleValue} y={currentDraftValue.draftPoint.y-5*cameraScaleValue} width={10*cameraScaleValue} height={10*cameraScaleValue} class="point-soft" />
		{/if}
	{:else if currentDraftValue.pathHead}


		{#if currentDraftValue.pathHead.front}
			<line
			x1={currentDraftValue.pathHead.point.x}
			y1={currentDraftValue.pathHead.point.y}
			x2={currentDraftValue.pathHead.front.x}
			y2={currentDraftValue.pathHead.front.y}
			class="handle-bar" />

			<circle cx={currentDraftValue.pathHead.front.x} cy={currentDraftValue.pathHead.front.y} r={3*cameraScaleValue} class="handle" />
		{/if}

		{#if currentDraftValue.pathHead.back}

			<line
			x1={currentDraftValue.pathHead.point.x}
			y1={currentDraftValue.pathHead.point.y}
			x2={currentDraftValue.pathHead.back.x}
			y2={currentDraftValue.pathHead.back.y}
			class="handle-bar" />

			<circle cx={currentDraftValue.pathHead.back.x} cy={currentDraftValue.pathHead.back.y} r={3*cameraScaleValue} class="handle" />
		{/if}


	{/if}


	{#each currentDraftValue.path as segment}
		{#if segment.point}
			{#if segment.front || segment.back}
			<circle cx={segment.point.x} cy={segment.point.y} r={5*cameraScaleValue} class="point-hard" />
			{:else}
			<rect x={segment.point.x-5*cameraScaleValue} y={segment.point.y-5*cameraScaleValue} width={10*cameraScaleValue} height={10*cameraScaleValue} class="point-soft" />
			{/if}
		{/if}
	{/each}

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

	.dragging {
		cursor: move;
	}

	.point-hard {
		fill: white;
		stroke: black;
		stroke: -width1px;
		vector-effect: non-scaling-stroke;
	}

	.point-soft {
		fill: white;
		stroke: black;
		stroke: -width1px;
		vector-effect: non-scaling-stroke;
	}

	.handle {
		fill: white;
		stroke: black;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	.handle-bar {
		fill: white;
		stroke: gray;
		stroke-width: 1px;
		stroke-dasharray: 2 2;
		vector-effect: non-scaling-stroke;
	}


</style>
