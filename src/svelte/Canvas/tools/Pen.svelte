<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read } from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		cameraScale,
		rotationTransform,
		newDrawing,
	} = $props();

	const pen = atom({});
	const path = view(["path", L.define([])], pen);
	const isActive = view(
		[L.lens(R.compose(R.lt(0), R.length), (n, o) => (n ? o : []))],
		path,
	);
	export const canCancel = read(R.identity, isActive);
	export function cancel() {
		isActive.value = false;
	}
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

	let preventNextClick = $state(false);
</script>

<path
	class="pen-surface"
	d={frameBoxPath.value}
	pointer-events="all"
	stroke="none"
	fill="none"
	role="button"
	tabindex="-1"
	onclick={(evt) => {
		if (preventNextClick) {
			preventNextClick = false;
			evt.stopPropagation();
		}
	}}
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			isActive.value = false;
		}
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		isActive.value = false;
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary && isActive.value) {
			isActive.value = false;
		}

		if (!evt.isPrimary || !U.isLeftButton(evt)) {
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);

		currentPath.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		currentPath.value = clientToCanvas(evt.clientX, evt.clientY);
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (newDrawing) {
			newDrawing.value = path.value;
			if (path.value.length > 1) {
				preventNextClick = true;
			}
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
	}}
/>

<g transform={rotationTransform.value} pointer-events="none">
	<path
		d={pathPath.value}
		fill="none"
		class="draft-line"
		pointer-events="none"
	/>
</g>

<style>
	.pen-surface {
		stroke-width: 0;
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
