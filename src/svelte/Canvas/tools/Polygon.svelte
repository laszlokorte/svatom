<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import {
		atom,
		view,
		read,
		combine,
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		cameraScale,
		rotationTransform,
		newDrawing,
	} = $props();

	const polygon = atom({ path: [], draft: null });
	const pointerId = view(["pointerId"], polygon);
	const path = view([L.removable("path"), "path"], polygon);
	const draft = view(["draft"], polygon);
	const startPath = view([L.index(0), L.defaults(false)], path);
	const currentPath = view(
		[
			L.setter(
				// discard very close samples
				R.dropRepeatsWith(
					R.compose(
						(x) => x < cameraScale.value * 10,
						Math.sqrt,
						R.uncurryN(
							2,
							C.Phi1(R.add)(
								C.Psi(R.compose((x) => x * x, R.subtract))(
									R.prop("x"),
								),
							)(
								C.Psi(R.compose((x) => x * x, R.subtract))(
									R.prop("y"),
								),
							),
						),
					),
				),
			),
			L.appendTo,
			L.removable("x", "y"),
			L.defaults(false),
		],
		path,
	);

	const pathPath = view(
		L.iso(
			R.ifElse(
				R.length,
				R.compose(
					R.join(" "),
					R.map(R.compose(R.join(","), R.props(["x", "y"]))),
				),
				R.always(""),
			),
			R.compose(
				R.map(R.compose(R.zipWith(R.assoc, ["x", "y"]), R.split(","))),
				R.split(" "),
			),
		),
		path,
	);

	const draftPath = read(
		({ p, d }) =>
			(p
				? R.join(" ", R.props(["x", "y"], R.last(p)))
				: R.join(" ", R.props(["x", "y"], d))) +
			" " +
			R.join(" ", R.props(["x", "y"], d)),
		combine({ p: path, d: draft }),
	);

	const pathLength = read([L.valueOr([]), "length"], path);
	const pathRoot = read([0], path);
	const pathHead = read(L.last, path);
</script>

<path
	use:disableTouchEventsIf={startPath}
	class="polygon-surface"
	d={frameBoxPath.value}
	class:dragging={pointerId.value !== undefined}
	pointer-events="all"
	stroke="none"
	fill="none"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			if (pointerId.value !== undefined) {
				pointerId.value = undefined;
			} else {
				path.value = undefined;
			}
		}
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		if (pointerId.value !== undefined) {
			pointerId.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary) {
			return;
		} else if (!U.isLeftButton(evt)) {
			if (pointerId.value !== undefined) {
				pointerId.value = undefined;
			} else {
				evt.preventDefault();
				newDrawing.value = path.value;
				path.value = undefined;
			}
			return;
		}
		if (!startPath.value) {
			currentPath.value = clientToCanvas(evt.clientX, evt.clientY);
			draft.value = clientToCanvas(evt.clientX, evt.clientY);
		}

		pointerId.value = evt.pointerId;
	}}
	onpointermove={(evt) => {
		if (
			pointerId.value === evt.pointerId ||
			(pointerId.value === undefined && startPath.value)
		) {
			draft.value = clientToCanvas(evt.clientX, evt.clientY);
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId) {
			currentPath.value = draft.value;
			pointerId.value = undefined;
		}
	}}
	onpointercancel={(evt) => {
		if (pointerId.value === evt.pointerId) {
			pointerId.value = undefined;
		}
	}}
/>

<g transform={rotationTransform.value}>
	<polyline
		points={pathPath.value}
		fill="none"
		class="draft-line"
		pointer-events="none"
	/>

	<polyline
		points={draftPath.value}
		fill="none"
		class="draft-line-head"
		pointer-events="none"
	/>
	{#if pathLength.value > 2}
		<circle
			cx={pathRoot.value.x}
			cy={pathRoot.value.y}
			r={10 * cameraScale.value}
			stroke="#ff6e60"
			fill="#ffcec0"
			role="button"
			tabindex="-1"
			onpointerup={(evt) => {
				if (!evt.isPrimary) {
					return;
				}
				evt.preventDefault();
				currentPath.value = pathRoot.value;
				newDrawing.value = path.value;
				path.value = undefined;
				pointerId.value = undefined;
			}}
			oncontextmenu={(evt) => {
				evt.preventDefault();
			}}
			onpointermove={(evt) => {
				evt.preventDefault();
				draft.value = pathRoot.value;
			}}
			class="capture-spot"
		></circle>
	{/if}
	{#if pathLength.value > 0}
		<circle
			cx={pathHead.value.x}
			cy={pathHead.value.y}
			r={10 * cameraScale.value}
			stroke="#ff6e60"
			fill="#ffcec0"
			stroke-opacity={pointerId.value === undefined ? 1 : 0}
			onpointerup={(evt) => {
				evt.preventDefault();
				newDrawing.value = path.value;
				path.value = undefined;
				pointerId.value = undefined;
			}}
			onpointerdown={(evt) => {
				pointerId.value = evt.pointerId;
			}}
			class="capture-spot"
			role="button"
			tabindex="-1"
			onkeydown={(evt) => {
				if (evt.key === "Escape" || evt.key === "Esc") {
					if (pointerId.value !== undefined) {
						pointerId.value = undefined;
					} else {
						path.value = undefined;
					}
				}
			}}
		></circle>

		<circle
			cx={pathHead.value.x}
			cy={pathHead.value.y}
			r={5 * cameraScale.value}
			pointer-events="none"
			fill="#ff6e60"
		></circle>
	{/if}
</g>

<style>
	.polygon-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.draft-line {
		fill: none;
		stroke: #ff6e60;
		stroke-width: 3px;
		stroke-opacity: 0.6;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.draft-line-head {
		fill: none;
		stroke: #ff6e60;
		fill-opacity: 0.2;
		stroke-width: 3px;
		stroke-opacity: 0.1;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	[role="button"] {
		outline: none;
	}

	.capture-spot {
		vector-effect: non-scaling-stroke;
	}

	.capture-spot:hover {
		fill: #ff6e60;
		opacity: 1;
	}

	.dragging {
		cursor: move;
	}
</style>
