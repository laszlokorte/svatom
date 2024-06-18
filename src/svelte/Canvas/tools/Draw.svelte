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

	const {frame, cameraScale, rotationTransform, newDrawing} = $props();

	const rootEl = atom(null);
	const svgPoint = $derived(rootEl.value ? rootEl.value.ownerSVGElement.createSVGPoint() : null);

	const lasso = atom([]);

	const startLasso = view([L.index(0), L.defaults(false)], lasso);
	const currentLasso = view(
		[
			L.setter(R.takeLast(200)), // limit the lasso length just for fun
			L.setter(
				// discard very close samples
				R.dropRepeatsWith(
					R.compose(
						x => x < cameraScale.value * 10,
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
			(l) =>
				R.join(
					",",
					R.map(R.compose(R.join(" "), R.props(["x", "y"])), l),
				),
			(p) =>
				R.map(
					R.compose(R.zipWith(R.assoc, ["x", "y"]), R.split(" ")),
					R.split(',', p),
				),
		),
		lasso,
	);
</script>

<g
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		currentLasso.value = undefined;
	}}
	onpointerdown={(evt) => {
		if(!U.isLeftButton(evt)) {
			return
		}
		evt.currentTarget.setPointerCapture(evt.pointerId);
		const pt = svgPoint;
		pt.x = evt.clientX;
		pt.y = evt.clientY;
		const svgP = pt.matrixTransform(
			rootEl.value.getScreenCTM().inverse(),
		);
		startLasso.value = { x: svgP.x, y: svgP.y };
		currentLasso.value = { x: svgP.x, y: svgP.y };
	}}
	onpointermove={(evt) => {
		if (startLasso.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			currentLasso.value = { x: svgP.x, y: svgP.y };
		}
	}}
	onpointerup={(evt) => {
		if (startLasso.value) {
			const pt = svgPoint;
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			const svgP = pt.matrixTransform(
				rootEl.value.getScreenCTM().inverse(),
			);

			if(newDrawing) {
				newDrawing.value = lasso.value
			}

			currentLasso.value = undefined;
		}
	}}>

	{@render frame()}



</g>

<g transform={rotationTransform.value}

	bind:this={rootEl.value}>
	
	<polyline points={lassoPath.value} class="draft-line" pointer-events="none" />
</g>
	

<style>

	.draft-line {
		fill: none;
		stroke: gray;
		fill-opacity: 0.2;
		fill-rule: evenodd;
		stroke-width: 4px;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}


</style>
