<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import * as Geo from "../../geometry";
	import {
		atom,
		view,
		read,
		combine,
		disableEventIf,
	} from "../../svatom.svelte.js";

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

	const piePath = view(
		({ pivotWorld, currentWorld, scale }) => {
			if (
				Math.hypot(
					pivotWorld.y - currentWorld.y,
					pivotWorld.x - currentWorld.x,
				) /
					scale <
				55
			) {
				return undefined;
			}

			return `
				 M ${pivotWorld.x} ${pivotWorld.y}
				L${
					currentWorld.x +
					scale *
						42 *
						Math.cos(
							-Math.PI / 2 +
								Math.atan2(
									pivotWorld.y - currentWorld.y,
									pivotWorld.x - currentWorld.x,
								),
						)
				} ${
					currentWorld.y -
					scale *
						42 *
						-Math.sin(
							-Math.PI / 2 +
								Math.atan2(
									pivotWorld.y - currentWorld.y,
									pivotWorld.x - currentWorld.x,
								),
						)
				}
						A ${scale * 42} ${scale * 42} 0 0 1  ${
							currentWorld.x +
							scale *
								42 *
								-Math.cos(
									-Math.PI / 2 +
										Math.atan2(
											pivotWorld.y - currentWorld.y,
											pivotWorld.x - currentWorld.x,
										),
								)
						} ${
							currentWorld.y -
							scale *
								42 *
								Math.sin(
									-Math.PI / 2 +
										Math.atan2(
											pivotWorld.y - currentWorld.y,
											pivotWorld.x - currentWorld.x,
										),
								)
						} Z`;
		},
		combine({
			pivotWorld: zoomPivotWorld,
			currentWorld: zoomPivotCurrentWorld,
			scale: cameraScale,
		}),
	);

	const currentWorld = $derived(zoomPivotCurrentWorld.value);
	const scale = $derived(cameraScale.value);
	const refWorld = $derived(zoomRefWorld.value);
</script>

<path
	d={frameBoxPath.value}
	class="rotate-surface"
	class:zooming={isActive.value}
	pointer-events="all"
	fill="none"
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		evt.stopPropagation();
	}}
	onclick={(evt) => {
		evt.stopPropagation();
	}}
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
	use:disableEventIf={{ eventType: "wheel", cond: isActive }}
/>

<g transform={rotationTransform.value} pointer-events="none">
	{#if isActive.value}
		{#if piePath.value}
			<path
				d={piePath.value}
				fill="gray"
				opacity="0.6"
				fill-rule="nonzero"
				vector-effect="non-scaling-stroke"
			/>
		{:else}
			<line
				x1={currentWorld.x}
				x2={currentWorld.x}
				y1={currentWorld.y}
				y2={currentWorld.y}
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
			x1={currentWorld.x}
			y1={currentWorld.y}
			x2={refWorld.x}
			y2={refWorld.y}
		/>
 -->

		<circle
			cx={currentWorld.x}
			cy={currentWorld.y}
			r={scale * 40}
			class="ref"
			stroke="#111"
			stroke-opacity="0.8"
			fill="none"
			stroke-width="6px"
			vector-effect="non-scaling-stroke"
		/>

		<circle
			cx={refWorld.x}
			cy={refWorld.y}
			r={scale * 5}
			class="ref"
			fill="#4477aa"
		/>
		<circle
			cx={currentWorld.x}
			cy={currentWorld.y}
			r={scale * 40}
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
			cx={currentWorld.x}
			cy={currentWorld.y}
			r={scale * 3}
			class="ref"
			fill="#4477aa"
		/>
		<circle
			cx={currentWorld.x}
			cy={currentWorld.y}
			r={scale * 3}
			class="ref"
			fill="#4477aa"
		/>
		<line
			x1={currentWorld.x}
			x2={refWorld.x}
			y1={currentWorld.y}
			y2={refWorld.y}
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
