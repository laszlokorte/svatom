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

	const path = atom([]);

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
			currentPath.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (startPath.value) {
			return;
		}
		if (!U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);

		const svgP = clientToCanvas(evt.clientX, evt.clientY);
		startPath.value = { x: svgP.x, y: svgP.y };
		currentPath.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (startPath.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			currentPath.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (startPath.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			if (newDrawing) {
				newDrawing.value = path.value;
			}

			currentPath.value = undefined;
		}
	}}
	onpointercancel={(evt) => {
		if (startPath.value) {
			currentPath.value = undefined;
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
