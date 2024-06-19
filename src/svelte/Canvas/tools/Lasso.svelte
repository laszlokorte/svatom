<script>
	import * as L from "partial.lenses";
	import * as G from "../../generators";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		autofocusIf,
		string,
	} from "../../svatom.svelte.js";

	const { frameBoxPath, clientToCanvas, cameraScale, rotationTransform } =
		$props();

	const lasso = atom([]);

	const startLasso = view([L.index(0), L.defaults(false)], lasso);
	const currentLasso = view(
		[
			L.setter(R.takeLast(200)), // limit the lasso length just for fun
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
		lasso,
	);

	const lassoPath = view(
		L.iso(
			R.compose(
				R.join(" "),
				R.map(R.compose(R.join(","), R.props(["x", "y"]))),
			),
			R.compose(
				R.map(R.compose(R.zipWith(R.assoc, ["x", "y"]), R.split(","))),
				R.split(" "),
			),
		),
		lasso,
	);
</script>

<path
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			currentLasso.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (!U.isLeftButton(evt)) {
			return;
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);

		const svgP = clientToCanvas(evt.clientX, evt.clientY);
		startLasso.value = { x: svgP.x, y: svgP.y };
		currentLasso.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (startLasso.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			currentLasso.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (startLasso.value) {
			const svgP = clientToCanvas(evt.clientX, evt.clientY);

			currentLasso.value = undefined;
		}
	}}
/>

<g transform={rotationTransform.value}>
	<polyline
		points={lassoPath.value}
		fill="none"
		class="lasso-area"
		pointer-events="none"
	/>
</g>

<style>
	/*.lasso-anchor {
		fill: #2374ff;
		vector-effect: non-scaling-stroke;
		display: none;
	}*/

	.lasso-area {
		fill: #27b7db;
		stroke: #2374ff;
		fill-opacity: 0.2;
		fill-rule: evenodd;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		stroke-dasharray: 5 5;
		animation: 4s linear marquee infinite;
	}

	@keyframes marquee {
		0% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: -100;
		}
	}
</style>
