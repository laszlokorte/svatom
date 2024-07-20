<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as Geo from "../../geometry";
	import * as G from "../../generators";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const {
		clientToCanvas,
		frameBoxObject,
		rotationTransform,
		cameraOrientation,
		cameraScale,
		alerts = atom([]),
		cameraFocus,
	} = $props();

	const radius = 12;

	const cameraTransform = view(
		[
			L.pick({
				box: ["frameBoxObject", "screenSpaceAligned"],
				angle: "cameraOrientation",
			}),
			({ box: { minX, minY, width, height }, angle }) => ({
				x: minX + width / 2,
				y: minY + height / 2,
				angle,
				minX,
				minY,
				width,
				height,
			}),
		],
		combine({ frameBoxObject, cameraOrientation }),
	);

	const screenspacePositions = view(
		({ alerts, rect, scale }) => {
			return R.map((p) => {
				const { minX, minY, width, height } = rect;
				return {
					screenPos: Geo.clamp2DBox(
						{ minX, minY, width, height },
						Geo.rotatePivotXYDegree(rect.x, rect.y, rect.angle, p),
					),
					x: p.x,
					y: p.y,
					msg: p.msg,
					color: p.color,
				};
			}, alerts);
		},
		combine({ rect: cameraTransform, alerts, scale: cameraScale }),
	);

	const cameraCenter = view(L.props("x", "y"), cameraFocus);

	function scrollToClick(evt) {
		const x = parseFloat(evt.currentTarget.getAttribute("data-pos-x"));
		const y = parseFloat(evt.currentTarget.getAttribute("data-pos-y"));

		cameraCenter.value = { x, y };
	}

	function scrollToKey(evt) {
		if (evt.key == "Enter" || evt.key == " ") {
			evt.preventDefault();
			const x = parseFloat(evt.currentTarget.getAttribute("data-pos-x"));
			const y = parseFloat(evt.currentTarget.getAttribute("data-pos-y"));

			cameraCenter.value = { x, y };
		}
	}

	const basePath = view(
		L.reread(
			(scale) =>
				`m 0 ${scale * radius} l ${scale * -radius} ${scale * -radius}  l ${scale * radius} ${scale * -radius}  l ${scale * radius} ${scale * radius}  z`,
		),
		cameraScale,
	);

	const paths = view(
		L.reread(({ basePath, positions }) =>
			G.map(
				(pos) => ({
					path: `M ${pos.screenPos.x} ${pos.screenPos.y} ${basePath}`,
					x: pos.x,
					y: pos.y,
					screenPos: pos.screenPos,
					msg: pos.msg,
					color: pos.color,
				}),
				positions,
			),
		),
		combine({ positions: screenspacePositions, basePath }),
	);
</script>

<g
	tabindex="-1"
	role="button"
	onclick={(evt) => {
		evt.stopPropagation();
	}}
	onkeydown={(evt) => {
		evt.stopPropagation();
	}}
>
	{#each paths.value as p, i (i)}
		<g>
			<path
				tabindex="-1"
				role="button"
				onclick={scrollToClick}
				onkeydown={scrollToKey}
				class="alert-badge"
				data-pos-x={p.x}
				data-pos-y={p.y}
				d={p.path}
				color={p.color || "darkred"}
			></path>
			<text
				x={p.screenPos.x + 18 * cameraScale.value}
				y={p.screenPos.y}
				class="alert-text-stroke"
				dominant-baseline="middle"
				font-size="{cameraScale.value}em"
				><tspan class="error-titel">Error:</tspan>
				<tspan>{p.msg}</tspan></text
			>
			<text
				tabindex="-1"
				role="button"
				onpointerdown={(evt) => {
					alert(p.msg);
				}}
				color={p.color || "darkred"}
				x={p.screenPos.x + 18 * cameraScale.value}
				y={p.screenPos.y}
				class="alert-text"
				dominant-baseline="middle"
				font-size="{cameraScale.value}em"
				><tspan class="error-titel">Error:</tspan>
				<tspan>{p.msg}</tspan></text
			>
		</g>
	{/each}
</g>

<style>
	.alert-badge {
		outline: none;
		cursor: pointer;
		fill: currentColor;
		fill-opacity: 0.4;
		stroke: currentColor;
		stroke-width: 3px;
		vector-effect: non-scaling-stroke;
		stroke-linejoin: round;
	}

	.alert-badge:hover {
		fill-opacity: 0.6;
	}

	.alert-text-stroke {
		fill: white;
		display: none;
		stroke: white;
		stroke-width: 0.3em;
	}

	.alert-text {
		fill: currentColor;
		display: none;
		stroke: none;
		stroke-width: 0;
	}

	.alert-badge:focus,
	.alert-badge:active {
		fill-opacity: 1;
	}

	.alert-badge:focus ~ .alert-text,
	.alert-badge:active ~ .alert-text,
	.alert-badge:focus ~ .alert-text-stroke,
	.alert-badge:active ~ .alert-text-stroke {
		display: initial;
	}

	.alert-badge:hover ~ .alert-text,
	.alert-badge:hover ~ .alert-text-stroke {
		display: initial;
	}

	.error-titel {
		font-weight: bold;
	}
</style>
