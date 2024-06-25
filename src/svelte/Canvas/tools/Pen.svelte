<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, disableTouchEventsIf } from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		cameraScale,
		rotationTransform,
		newDrawing,
	} = $props();

	const pen = atom([]);
	const pointerId = view([L.removable("pointerId"), "pointerId"], pen);
	const path = view("path", pen);
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
			L.setter((n, o) => (n ? [...o, n] : [])),
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
					R.concat("M"),
					R.join("L"),
					R.map(R.compose(R.join(","), R.props(["x", "y"]))),
				),
				R.always(""),
			),
			R.compose(
				R.map(R.compose(R.zipWith(R.assoc, ["x", "y"]), R.split(","))),
				R.split("L"),
				R.slice(1),
			),
		),
		path,
	);
</script>

<path
	use:disableTouchEventsIf={startPath}
	class="pen-surface"
	d={frameBoxPath.value}
	pointer-events="all"
	stroke="none"
	fill="none"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			pointerId.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (startPath.value) {
			return;
		}
		if (!evt.isPrimary) {
			return;
		}
		pointerId.value = evt.pointerId;
		evt.currentTarget.setPointerCapture(evt.pointerId);

		const svgP = clientToCanvas(evt.clientX, evt.clientY);
		startPath.value = svgP;
		currentPath.value = svgP;
	}}
	onpointermove={(evt) => {
		if (pointerId.value === evt.pointerId) {
			currentPath.value = clientToCanvas(evt.clientX, evt.clientY);
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			if (newDrawing) {
				newDrawing.value = path.value;
			}

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
	<path
		d={pathPath.value}
		fill="none"
		class="draft-line"
		pointer-events="none"
	/>
</g>

<style>
	.pen-surface {
		cursor: default;
		outline: none;
	}

	.draft-line {
		fill: none;
		stroke: #ff6e60;
		fill-opacity: 0.2;
		stroke-width: 6px;
		stroke-opacity: 0.6;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	[role="button"] {
		outline: none;
	}
</style>
