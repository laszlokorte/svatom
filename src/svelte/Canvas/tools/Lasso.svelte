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

	const {frame} = $props();

	const rootEl = atom(null);
	const gEl = view(L.setter((g) => g.ownerSVGElement), rootEl);
	const svgPoint = $derived(rootEl.value ? rootEl.value.createSVGPoint() : null);

	const lasso = atom([]);

	const startLasso = view([L.index(0), L.defaults(false)], lasso);
	const currentLasso = view(
		[
			L.setter(R.takeLast(100)), // limit the lasso length just for fun
			L.setter(
				// discard very close samples
				R.dropRepeatsWith(
					R.compose(
						R.gt(10),
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
					p,
				),
		),
		lasso,
	);
</script>

<g
	bind:this={gEl.value}
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		currentLasso.value = undefined;
	}}
	onpointerdown={(evt) => {
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

			currentLasso.value = undefined;
		}
	}}>

	{@render frame()}
</g>

	
<polygon points={lassoPath.value} class="lasso-area" pointer-events="none" />
<!-- 	{#each lasso.value as v, i (i)}
	<circle class="lasso" cx={v.x} cy={v.y} r="1px"></circle>
{/each} -->

<style>
	.lasso {
		fill: #100baa;
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}

	.lasso-area {
		fill: #100baa;
		fill-opacity: 0.2;
		fill-rule: evenodd;
		stroke-dasharray: 5 5;
		stroke: #100baa;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}
</style>
