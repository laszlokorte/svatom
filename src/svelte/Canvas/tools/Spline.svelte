<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read, combine, fsm } from "../../svatom.svelte.js";
	import { createMachine, assign, emit } from "xstate";

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
			detached: false,
		},
		initial: "EMPTY",
		states: {
			EMPTY: {
				entry: [
					assign({
						path: [],
						draftPoint: null,
						draftFrontHandle: null,
						draftBackHandle: null,
						detached: false,
					}),
				],
				on: {
					PRESS: {
						target: "INITIAL_PRESSED",
						actions: assign({
							draftPoint: ({ event: { position } }) => position,
						}),
					},
				},
			},
			IDLE: {
				entry: [
					assign({
						draftPoint: null,
						draftFrontHandle: null,
						draftBackHandle: null,
						detached: false,
					}),
				],
				always: {
					target: "EMPTY",
					guard: ({ context }) => context.path.length === 0,
				},
				on: {
					PRESS: {
						target: "INITIAL_PRESSED",
						actions: assign({
							draftPoint: ({ event: { position } }) => position,
						}),
					},
					FINISH_OPEN: {
						target: "EMPTY",
						guard: ({ context }) => context.path.length > 1,
						actions: emit(({ context }) => ({
							type: "COMPLETED",
							path: context.path,
						})),
					},
					FINISH_CLOSE: {
						target: "EMPTY",
						guard: ({ context }) => context.path.length > 1,
						actions: emit(({ context }) => ({
							type: "COMPLETED",
							path: [...context.path, context.path[0]],
						})),
					},
					DETACH: {
						actions: assign({
							detached: true,
						}),
					},
					ATTACH: {
						actions: assign({
							detached: false,
						}),
					},
					TOOGLE_ATTACHMENT: {
						actions: assign({
							detached: ({ context: { detached } }) => !detached,
						}),
					},
					ESCAPE: {
						target: "EMPTY",
					},
					POP: {
						target: "IDLE",
						actions: assign({
							path: ({ context }) =>
								context.path.slice(0, context.path.length - 1),
						}),
					},
					CANCEL: {
						target: "EMPTY",
					},
				},
			},
			INITIAL_PRESSED: {
				entry: [
					assign({
						draftFrontHandle: null,
						draftBackHandle: null,
					}),
				],
				on: {
					MOVE: {
						guard: ({ context, event }) =>
							Math.hypot(
								context.draftPoint.x - event.position.x,
								context.draftPoint.y - event.position.y,
							) > 10,
						target: "PRESSED",
					},
					RELEASE: {
						target: "IDLE",
						actions: assign({
							path: ({ context }) => [
								...context.path,
								{
									point: context.draftPoint,
								},
							],
						}),
					},
					DETACH: {
						actions: assign({
							detached: true,
						}),
					},
					ATTACH: {
						actions: assign({
							detached: false,
						}),
					},
					TOOGLE_ATTACHMENT: {
						actions: assign({
							detached: ({ context: { detached } }) => !detached,
						}),
					},
					CANCEL: {
						target: "EMPTY",
					},
					ESCAPE: {
						target: "IDLE",
					},
					POP: {
						target: "IDLE",
					},
					INTERUPT: {
						target: "IDLE",
					},
				},
			},
			PRESSED: {
				on: {
					MOVE: {
						target: "PRESSED",
						actions: assign({
							draftFrontHandle: ({ event: { position } }) =>
								position,
							draftBackHandle: ({
								event: { position },
								context,
							}) =>
								context.detached
									? context.draftBackHandle
									: {
											x:
												context.draftPoint.x * 2 -
												position.x,
											y:
												context.draftPoint.y * 2 -
												position.y,
										},
						}),
					},
					RELEASE: {
						target: "IDLE",
						actions: assign({
							path: ({ context }) => [
								...context.path,
								{
									point: context.draftPoint,
									front: context.draftFrontHandle,
									back: context.draftBackHandle,
								},
							],
						}),
					},
					CANCEL: {
						target: "EMPTY",
					},
					DETACH: {
						target: "PRESSED",
						actions: assign({
							detached: true,
						}),
					},
					ATTACH: {
						target: "PRESSED",
						actions: assign({
							draftBackHandle: ({
								context: { draftPoint, draftFrontHandle },
							}) => ({
								x: draftPoint.x * 2 - draftFrontHandle.x,
								y: draftPoint.y * 2 - draftFrontHandle.y,
							}),
							detached: false,
						}),
					},
					TOOGLE_ATTACHMENT: {
						target: "PRESSED",
						actions: assign({
							draftBackHandle: ({
								context: {
									draftPoint,
									draftFrontHandle,
									detached,
									draftBackHandle,
								},
							}) =>
								detached
									? {
											x:
												draftPoint.x * 2 -
												draftFrontHandle.x,
											y:
												draftPoint.y * 2 -
												draftFrontHandle.y,
										}
									: draftBackHandle,
							detached: ({ context: { detached } }) => !detached,
						}),
					},
					ESCAPE: {
						target: "INITIAL_PRESSED",
					},
					POP: {
						target: "IDLE",
					},
					INTERUPT: {
						target: "IDLE",
					},
				},
			},
		},
	});

	const machine = fsm(machineDef);

	const dragging = read("dragging", machine);

	const currentDraft = read(
		L.pick({
			bezier: [
				"path",
				L.reread((p) => {
					if (p.length >= 2) {
						return (
							`M${p[0].point.x} ${p[0].point.y}` +
							R.join(
								" ",
								R.map(
									([from, to]) => {
										if (!from.front && !to.back) {
											return `L ${to.point.x} ${to.point.y}`;
										} else if (from.front && !to.back) {
											return `Q ${from.front.x} ${from.front.y} ${to.point.x} ${to.point.y}`;
										} else if (!from.front && to.back) {
											return `Q ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`;
										} else {
											return `C  ${from.front.x} ${from.front.y}  ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`;
										}
									},
									R.aperture(2, p),
								),
							)
						);
					} else if (p.length == 1) {
						return "";
					} else {
						return "";
					}
				}),
			],
			draftBezier: [
				L.pick({
					from: ["path", L.last],
					to: {
						point: "draftPoint",
						front: "draftFrontHandle",
						back: "draftBackHandle",
					},
				}),
				L.reread(({ from, to }) => {
					if (from && to.point) {
						const start = `M${from.point.x} ${from.point.y}`;
						if (!from.front && !to.back) {
							return start + `L ${to.point.x} ${to.point.y}`;
						} else if (from.front && !to.back) {
							return (
								start +
								`Q ${from.front.x} ${from.front.y} ${to.point.x} ${to.point.y}`
							);
						} else if (!from.front && to.back) {
							return (
								start +
								`Q ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`
							);
						} else {
							return (
								start +
								`C  ${from.front.x} ${from.front.y}  ${to.back.x} ${to.back.y} ${to.point.x} ${to.point.y}`
							);
						}
					} else {
						return "";
					}
				}),
			],
			path: "path",
			pathHead: ["path", L.last],
			pathRoot: ["path", L.first],
			pathNeck: [
				"path",
				L.reread((x) =>
					x.length > 0 ? x[Math.max(0, x.length - 2)] : undefined,
				),
			],
			draftPoint: "draftPoint",
			draftFrontHandle: "draftFrontHandle",
			draftBackHandle: "draftBackHandle",
			isDetached: "detached",
		}),
		machine.context,
	);

	machine.on("COMPLETED", (event) => {
		if (newSpline) {
			newSpline.value = event.path;
		}
	});

	const currentDraftValue = $derived(currentDraft.value);
	const cameraScaleValue = $derived(cameraScale.value);

	const canAction = $derived({
		finishClose: machine.can({ type: "FINISH_CLOSE" }),
		finishOpen: machine.can({ type: "FINISH_OPEN" }),
		pop: machine.can({ type: "POP" }),
	});

	export function cancel() {
		machine.send({ type: "CANCEL" });
	}

	export const canCancel = read((s) => s != "EMPTY", machine.state);
</script>

<path
	class="spline-surface no-highlight"
	d={frameBoxPath.value}
	pointer-events="all"
	stroke="none"
	fill="none"
	role="button"
	tabindex="-1"
	class:dragging={dragging.value}
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			evt.preventDefault();
			machine.send({ type: "ESCAPE" });
		}
		if (evt.key === "b") {
			evt.preventDefault();
			machine.send({ type: "POP" });
		}
		if (evt.key === "Shift") {
			evt.preventDefault();
			machine.send({ type: "DETACH" });
		}
	}}
	onkeyup={(evt) => {
		if (evt.key === "Shift") {
			evt.preventDefault();
			machine.send({ type: "ATTACH" });
		}
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		if (evt.altKey && canAction.finishClose) {
			machine.send({ type: "FINISH_CLOSE" });
		} else if (canAction.finishOpen) {
			machine.send({ type: "FINISH_OPEN" });
		} else {
			machine.send({ type: "ESCAPE" });
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary) {
			machine.send({ type: "INTERUPT" });
			return;
		}

		if (!U.isLeftButton(evt)) {
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);
		const p = clientToCanvas(evt.clientX, evt.clientY);

		machine.send({
			type: "PRESS",
			position: p,
			scale: cameraScale.value,
			pointerSize: Math.hypot(evt.width, evt.height),
		});
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

		machine.send({
			type: "MOVE",
			position: p,
			scale: cameraScale.value,
			pointerSize: Math.hypot(evt.width, evt.height),
		});
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		machine.send({ type: "RELEASE" });
	}}
	onpointercancel={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		machine.send({ type: "INTERUPT" });
	}}
	onlostpointercapture={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!dragging.value) {
			return;
		}

		machine.send({ type: "INTERUPT" });
	}}
/>

<g transform={rotationTransform.value}>
	{#if currentDraftValue.bezier}
		<path
			class="draft-line"
			pointer-events="none"
			fill="none"
			stroke-width="3px"
			d={currentDraftValue.bezier}
			stroke="darkgray"
		/>
	{/if}

	{#if currentDraftValue.draftBezier}
		<path
			class="draft-line-head"
			pointer-events="none"
			fill="none"
			stroke-width="3px"
			d={currentDraftValue.draftBezier}
			stroke="lightgray"
		/>
	{/if}

	{#if currentDraftValue.draftPoint}
		{#if currentDraftValue.draftFrontHandle}
			<line
				x1={currentDraftValue.draftPoint.x}
				y1={currentDraftValue.draftPoint.y}
				x2={currentDraftValue.draftFrontHandle.x}
				y2={currentDraftValue.draftFrontHandle.y}
				class="handle-bar"
				pointer-events="none"
			/>
			<circle
				cx={currentDraftValue.draftFrontHandle.x}
				cy={currentDraftValue.draftFrontHandle.y}
				r={3 * cameraScaleValue}
				class="handle"
				pointer-events="none"
			/>
		{/if}

		{#if currentDraftValue.draftBackHandle}
			<line
				x1={currentDraftValue.draftPoint.x}
				y1={currentDraftValue.draftPoint.y}
				x2={currentDraftValue.draftBackHandle.x}
				y2={currentDraftValue.draftBackHandle.y}
				class="handle-bar"
				pointer-events="none"
			/>
			<circle
				cx={currentDraftValue.draftBackHandle.x}
				cy={currentDraftValue.draftBackHandle.y}
				r={3 * cameraScaleValue}
				class="handle"
				pointer-events="none"
			/>
		{/if}

		{#if currentDraftValue.draftFrontHandle || currentDraftValue.draftBackHandle}
			<circle
				cx={currentDraftValue.draftPoint.x}
				cy={currentDraftValue.draftPoint.y}
				r={5 * cameraScaleValue}
				class="point-hard"
				pointer-events="none"
			/>
		{:else}
			<rect
				x={currentDraftValue.draftPoint.x - 5 * cameraScaleValue}
				y={currentDraftValue.draftPoint.y - 5 * cameraScaleValue}
				width={10 * cameraScaleValue}
				height={10 * cameraScaleValue}
				class="point-soft"
				pointer-events="none"
			/>
		{/if}
	{:else if currentDraftValue.pathHead}
		{#if currentDraftValue.pathHead.front}
			<line
				x1={currentDraftValue.pathHead.point.x}
				y1={currentDraftValue.pathHead.point.y}
				x2={currentDraftValue.pathHead.front.x}
				y2={currentDraftValue.pathHead.front.y}
				class="handle-bar"
				pointer-events="none"
			/>

			<circle
				cx={currentDraftValue.pathHead.front.x}
				cy={currentDraftValue.pathHead.front.y}
				r={3 * cameraScaleValue}
				class="handle"
				pointer-events="none"
			/>
		{/if}

		{#if currentDraftValue.pathHead.back}
			<line
				x1={currentDraftValue.pathHead.point.x}
				y1={currentDraftValue.pathHead.point.y}
				x2={currentDraftValue.pathHead.back.x}
				y2={currentDraftValue.pathHead.back.y}
				class="handle-bar"
				pointer-events="none"
			/>

			<circle
				cx={currentDraftValue.pathHead.back.x}
				cy={currentDraftValue.pathHead.back.y}
				r={3 * cameraScaleValue}
				class="handle"
				pointer-events="none"
			/>
		{/if}
	{/if}

	{#each currentDraftValue.path as segment, i (i)}
		{#if segment.point}
			{#if segment.front || segment.back}
				<circle
					cx={segment.point.x}
					cy={segment.point.y}
					r={5 * cameraScaleValue}
					class="point-hard"
					pointer-events="none"
				/>
			{:else}
				<rect
					x={segment.point.x - 5 * cameraScaleValue}
					y={segment.point.y - 5 * cameraScaleValue}
					width={10 * cameraScaleValue}
					height={10 * cameraScaleValue}
					class="point-soft"
					pointer-events="none"
				/>
			{/if}
		{/if}
	{/each}

	{#key "pop"}
		{#if currentDraftValue.pathNeck && canAction.pop}
			<g
				tabindex="-1"
				class="no-highlight"
				role="button"
				onpointerdown={(evt) => {
					evt.stopPropagation();
					evt.stopImmediatePropagation();
					evt.preventDefault();
				}}
				onkeydown={() => {
					machine.send({ type: "POP" });
				}}
				pointer-events="all"
				onclick={() => {
					machine.send({ type: "POP" });
				}}
			>
				{#if currentDraftValue.pathNeck.front || currentDraftValue.pathNeck.back}
					<circle
						cx={currentDraftValue.pathNeck.point.x}
						cy={currentDraftValue.pathNeck.point.y}
						r={10 * cameraScaleValue}
						class="back"
					/>
				{:else}
					<rect
						x={currentDraftValue.pathNeck.point.x -
							10 * cameraScaleValue}
						y={currentDraftValue.pathNeck.point.y -
							10 * cameraScaleValue}
						width={20 * cameraScaleValue}
						height={20 * cameraScaleValue}
						class="back"
					/>
				{/if}
				<circle
					cx={currentDraftValue.pathNeck.point.x}
					cy={currentDraftValue.pathNeck.point.y}
					r={30 * cameraScaleValue}
					class="touch-padding"
					fill="none"
					stroke-width="0"
					pointer-events="all"
				/>
			</g>
		{/if}
	{/key}

	{#key "finishOpen"}
		{#if canAction.finishOpen}
			<g
				tabindex="-1"
				class="no-highlight"
				role="button"
				onpointerdown={(evt) => {
					evt.stopPropagation();
					evt.stopImmediatePropagation();
					evt.preventDefault();
				}}
				onkeydown={() => {
					machine.send({ type: "FINISH_OPEN" });
				}}
				pointer-events="all"
				onclick={() => {
					machine.send({ type: "FINISH_OPEN" });
				}}
			>
				{#if currentDraftValue.pathHead.front || currentDraftValue.pathHead.back}
					<circle
						cx={currentDraftValue.pathHead.point.x}
						cy={currentDraftValue.pathHead.point.y}
						r={10 * cameraScaleValue}
						class="finish"
					/>
				{:else}
					<rect
						x={currentDraftValue.pathHead.point.x -
							10 * cameraScaleValue}
						y={currentDraftValue.pathHead.point.y -
							10 * cameraScaleValue}
						width={20 * cameraScaleValue}
						height={20 * cameraScaleValue}
						class="finish"
					/>
				{/if}
				<circle
					cx={currentDraftValue.pathHead.point.x}
					cy={currentDraftValue.pathHead.point.y}
					r={30 * cameraScaleValue}
					class="touch-padding"
					fill="none"
					stroke-width="0"
					pointer-events="all"
				/>
			</g>
		{/if}
	{/key}

	{#key "finishClose"}
		{#if canAction.finishClose}
			<g
				tabindex="-1"
				class="no-highlight"
				role="button"
				onpointerdown={(evt) => {
					evt.stopPropagation();
					evt.stopImmediatePropagation();
					evt.preventDefault();
				}}
				onkeydown={() => {
					machine.send({ type: "FINISH_CLOSE" });
				}}
				pointer-events="all"
				onclick={() => {
					machine.send({ type: "FINISH_CLOSE" });
				}}
			>
				{#if currentDraftValue.pathRoot.front || currentDraftValue.pathRoot.back}
					<circle
						cx={currentDraftValue.pathRoot.point.x}
						cy={currentDraftValue.pathRoot.point.y}
						r={10 * cameraScaleValue}
						class="close"
					/>
				{:else}
					<rect
						x={currentDraftValue.pathRoot.point.x -
							10 * cameraScaleValue}
						y={currentDraftValue.pathRoot.point.y -
							10 * cameraScaleValue}
						width={20 * cameraScaleValue}
						height={20 * cameraScaleValue}
						class="close"
					/>
				{/if}
				<circle
					cx={currentDraftValue.pathRoot.point.x}
					cy={currentDraftValue.pathRoot.point.y}
					r={30 * cameraScaleValue}
					class="touch-padding"
					fill="none"
					stroke-width="0"
					pointer-events="all"
				/>
			</g>
		{/if}
	{/key}

	{#key "atttachment"}
		{#if currentDraftValue.draftPoint && currentDraftValue.draftBackHandle}
			<g
				pointer-events="all"
				tabindex="-1"
				class="no-highlight"
				role="button"
				onpointerdown={(evt) => {
					evt.stopPropagation();
					evt.stopImmediatePropagation();
					evt.preventDefault();
					machine.send({ type: "TOOGLE_ATTACHMENT" });
				}}
				onkeydown={(evt) => {
					evt.stopPropagation();
					evt.preventDefault();

					machine.send({ type: "TOOGLE_ATTACHMENT" });
				}}
			>
				<circle
					cx={currentDraftValue.draftBackHandle.x}
					cy={currentDraftValue.draftBackHandle.y}
					r={10 * cameraScaleValue}
					class="detach"
					pointer-events="all"
					class:active={currentDraftValue.isDetached}
				/>
				<circle
					cx={currentDraftValue.draftBackHandle.x}
					cy={currentDraftValue.draftBackHandle.y}
					r={30 * cameraScaleValue}
					class="touch-padding"
					fill="none"
					stroke-width="0"
					pointer-events="all"
				/>
			</g>
		{/if}
	{/key}
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

	.finish {
		fill: #33cc77;
		stroke: #0000;
		stroke-width: 3em;
		vector-effect: non-scaling-stroke;
		cursor: pointer;
	}

	.finish:hover {
		fill: #33ffaa;
	}

	.no-highlight {
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		-khtml-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
		touch-action: none;
		outline: none;
	}

	.close {
		fill: #3377ff;
		stroke: #0000;
		stroke-width: 3em;
		vector-effect: non-scaling-stroke;
		cursor: pointer;
	}
	.back {
		fill: #ff7777;
		stroke: #0000;
		stroke-width: 3em;
		vector-effect: non-scaling-stroke;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.detach {
		display: none;
		fill: #ffdd77;
		stroke: #0000;
		stroke-width: 3em;
		vector-effect: non-scaling-stroke;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	@media (hover) {
		.close:hover {
			fill: #7799ff;
		}

		.back:hover {
			fill: #ff9999;
		}

		.detach:hover {
			fill: #ffdd99;
		}
	}

	.detach.active {
		fill: #eeaa44;
	}

	.touch-padding {
		display: none;
		pointer-events: all;
	}

	@media (any-pointer: coarse) {
		.detach {
			display: initial;
		}

		.touch-padding {
			display: initial;
		}
	}
</style>
