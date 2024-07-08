<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import * as Geo from "../../geometry";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const POLAR = true;

	const {
		frameBoxPath,
		clientToCanvas,
		zoomMovement,
		rotationTransform,
		cameraScale,
	} = $props();

	const minRadius = 3;

	const zoom = atom({});
	const zoomPivotClient = view(
		[
			L.props("pivotClient", "pivotWorld", "refClient"),
			L.rewrite(({ pivotClient }) => ({
				pivotClient,
				pivotWorld: clientToCanvas(pivotClient.x, pivotClient.y),
				refClient: pivotClient,
			})),
			L.removable("pivotClient"),
			"pivotClient",
			L.removable("x", "y"),
		],
		zoom,
	);
	const zoomPivotWorld = view(["pivotWorld"], zoom);

	const zoomRefClient = view(
		[L.removable("refClient"), "refClient", L.removable("x", "y")],
		zoom,
	);

	const zoomRefWorld = view(
		[
			"refClient",
			L.reread((refClient) => clientToCanvas(refClient.x, refClient.y)),
		],
		zoom,
	);

	const zoomPivotCurrentWorld = read(
		[
			"pivotClient",
			L.reread((pivotClient) =>
				clientToCanvas(pivotClient.x, pivotClient.y),
			),
		],
		zoom,
	);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (b, o) => (b ? o : undefined)),
		zoomPivotWorld,
	);

	const zoomAngle = read(
		({ r, p }) => Math.atan2(r.y - p.y, r.x - p.x),
		combine({ r: zoomRefClient, p: zoomPivotClient }),
	);
</script>

<path
	d={frameBoxPath.value}
	class="rotate-surface"
	class:zooming={isActive.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	oncontextmenu={(evt) => {
		evt.preventDefault();
		isActive.value = false;
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary) {
			isActive.value = false;

			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);
		zoomPivotClient.value = { x: evt.clientX, y: evt.clientY };
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		const newPos = { x: evt.clientX, y: evt.clientY };

		const newDx = Math.abs(newPos.x - zoomPivotClient.value.x);
		const newDy = newPos.y - zoomPivotClient.value.y;
		const distance = Math.hypot(newDx, newDy);

		if (POLAR) {
			if (distance > minRadius) {
				const angle = Geo.angleRadBetween(
					zoomRefClient.value,
					zoomPivotClient.value,
					newPos,
				);
				const factor = Math.pow(distance / 100, 2);
				const dz = (angle / Math.PI) * factor;

				zoomMovement.value = {
					dz: dz,
					px: zoomPivotWorld.value.x,
					py: zoomPivotWorld.value.y,
				};
			}
		} else {
			const factor = newDx / 10000;
			const dz = -(newPos.y - zoomRefClient.value.y) * factor;

			zoomMovement.value = {
				dz: dz,
				px: zoomPivotWorld.value.x,
				py: zoomPivotWorld.value.y,
			};
		}

		zoomRefClient.value = newPos;
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
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
	{#if isActive.value}
		{#if Math.hypot(zoomPivotWorld.value.y - zoomPivotCurrentWorld.value.y, zoomPivotWorld.value.x - zoomPivotCurrentWorld.value.x) / cameraScale.value > 55}
			<path
				d="
				 M {zoomPivotWorld.value.x} {zoomPivotWorld.value.y}
				L{zoomPivotCurrentWorld.value.x +
					cameraScale.value *
						42 *
						Math.cos(
							-Math.PI / 2 +
								Math.atan2(
									zoomPivotWorld.value.y -
										zoomPivotCurrentWorld.value.y,
									zoomPivotWorld.value.x -
										zoomPivotCurrentWorld.value.x,
								),
						)} {zoomPivotCurrentWorld.value.y -
					cameraScale.value *
						42 *
						-Math.sin(
							-Math.PI / 2 +
								Math.atan2(
									zoomPivotWorld.value.y -
										zoomPivotCurrentWorld.value.y,
									zoomPivotWorld.value.x -
										zoomPivotCurrentWorld.value.x,
								),
						)}
						A {cameraScale.value * 42} {cameraScale.value *
					42} 0 0 1  {zoomPivotCurrentWorld.value.x +
					cameraScale.value *
						42 *
						-Math.cos(
							-Math.PI / 2 +
								Math.atan2(
									zoomPivotWorld.value.y -
										zoomPivotCurrentWorld.value.y,
									zoomPivotWorld.value.x -
										zoomPivotCurrentWorld.value.x,
								),
						)} {zoomPivotCurrentWorld.value.y -
					cameraScale.value *
						42 *
						Math.sin(
							-Math.PI / 2 +
								Math.atan2(
									zoomPivotWorld.value.y -
										zoomPivotCurrentWorld.value.y,
									zoomPivotWorld.value.x -
										zoomPivotCurrentWorld.value.x,
								),
						)} Z"
				fill="gray"
				opacity="0.6"
				fill-rule="nonzero"
				vector-effect="non-scaling-stroke"
			/>
		{:else}
			<line
				x1={zoomPivotCurrentWorld.value.x}
				x2={zoomPivotWorld.value.x}
				y1={zoomPivotCurrentWorld.value.y}
				y2={zoomPivotWorld.value.y}
				stroke="#4477aa"
				stroke-width="1px"
				opacity="0.5"
				vector-effect="non-scaling-stroke"
			/>
		{/if}
		<!-- <line
			stroke="#4477aa"
			stroke-width="1px"
			vector-effect="non-scaling-stroke"
			x1={zoomPivotWorld.value.x}
			y1={zoomPivotWorld.value.y}
			x2={zoomRefWorld.value.x}
			y2={zoomRefWorld.value.y}
		/>
 -->

		<circle
			cx={zoomPivotCurrentWorld.value.x}
			cy={zoomPivotCurrentWorld.value.y}
			r={cameraScale.value * 40}
			class="ref"
			stroke="#111"
			stroke-opacity="0.8"
			fill="none"
			stroke-width="6px"
			vector-effect="non-scaling-stroke"
		/>

		<circle
			cx={zoomRefWorld.value.x}
			cy={zoomRefWorld.value.y}
			r={cameraScale.value * 5}
			class="ref"
			fill="#4477aa"
		/>
		<circle
			cx={zoomPivotCurrentWorld.value.x}
			cy={zoomPivotCurrentWorld.value.y}
			r={cameraScale.value * 40}
			class="ref"
			stroke="white"
			fill="#4477aa"
			stroke-opacity="1"
			fill-opacity="0.1"
			stroke-width="4px"
			stroke-dasharray="6 12"
			vector-effect="non-scaling-stroke"
			stroke-dashoffset={-zoomAngle.value * 40}
		/>

		<circle
			cx={zoomPivotWorld.value.x}
			cy={zoomPivotWorld.value.y}
			r={cameraScale.value * 3}
			class="ref"
			fill="#4477aa"
		/>
		<circle
			cx={zoomPivotCurrentWorld.value.x}
			cy={zoomPivotCurrentWorld.value.y}
			r={cameraScale.value * 3}
			class="ref"
			fill="#4477aa"
		/>
		<line
			x1={zoomPivotCurrentWorld.value.x}
			x2={zoomRefWorld.value.x}
			y1={zoomPivotCurrentWorld.value.y}
			y2={zoomRefWorld.value.y}
			stroke="#4477aa"
			stroke-width="1px"
			vector-effect="non-scaling-stroke"
		/>
	{/if}
</g>

<style>
	.rotate-surface {
		stroke-width: 0;
		outline: none;
	}
</style>
