<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import { atom, view, read, combine } from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		rotationTransform,
		rotationTransformFunction,
		cameraOrientation,
		zoomDelta,
		zoomFrame,
		cameraScale,
	} = $props();

	const magnifierFrame = atom(undefined);

	const magnifierFrameStart = view(
		[L.removable("start"), "start", L.removable("x", "y")],
		magnifierFrame,
	);
	const magnifierFrameSize = view(
		L.ifElse(
			R.prop("start"),
			[L.removable("size"), "size", L.removable("x", "y")],
			L.zero,
		),
		magnifierFrame,
	);
	const isActive = view(
		L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
		magnifierFrameStart,
	);

	const magnifierFrameAngle = view(
		[L.removable("angle"), "angle", L.valueOr(0)],
		magnifierFrame,
	);
	const magnifierFrameAngleCos = view(
		[L.reread((r) => Math.cos((r / 180) * Math.PI))],
		magnifierFrameAngle,
	);
	const magnifierFrameAngleSin = view(
		[L.reread((r) => Math.sin((r / 180) * Math.PI))],
		magnifierFrameAngle,
	);

	const magnifierFramePath = read(
		L.reread(({ frame, b, cos, sin, t }) => {
			if (b && b.start && b.size) {
				const h = cos * b.size.x - sin * b.size.y;
				const v = sin * b.size.x + cos * b.size.y;

				const A = L.get(["start", t], b);
				const B = L.get(t, {
					x: b.start.x + cos * b.size.x,
					y: b.start.y + sin * b.size.x,
				}); // h
				const C = L.get(t, {
					x: b.start.x + cos * b.size.x - sin * b.size.y,
					y: b.start.y + sin * b.size.x + cos * b.size.y,
				}); //h v
				const D = L.get(t, {
					x: b.start.x - sin * b.size.y,
					y: b.start.y + cos * b.size.y,
				}); // v

				return U.formattedNumbers`${frame}M${A.x},${A.y}
				L${B.x},${B.y}
				L${C.x},${C.y}
				L${D.x},${D.y}z`;
			} else {
				return "";
			}
		}),
		combine({
			frame: frameBoxPath,
			b: magnifierFrame,
			sin: magnifierFrameAngleSin,
			cos: magnifierFrameAngleCos,
			t: rotationTransformFunction,
		}),
	);

	const magnifierFrameTransform = read(
		L.reread((r) => ``),
		magnifierFrame,
	);

	const magnifierFrameStretched = read(
		[
			L.valueOr({}),
			L.getter(({ start, size }) => {
				return start &&
					size &&
					(1 * cameraScale.value < Math.abs(size.x) ||
						1 * cameraScale.value < Math.abs(size.y))
					? true
					: false;
			}),
		],
		magnifierFrame,
	);

	export const canCancel = read(R.identity, isActive);
	export function cancel() {
		isActive.value = false;
	}
</script>

<path
	d={frameBoxPath.value}
	pointer-events="all"
	fill="none"
	class="magnifier-surface"
	class:magnifier-surface-active={magnifierFrameStretched.value}
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			isActive.value = false;
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary || !U.isLeftButton(evt, true)) {
			return;
		}

		evt.currentTarget.setPointerCapture(evt.pointerId);

		magnifierFrameStart.value = clientToCanvas(evt.clientX, evt.clientY);
		magnifierFrameSize.value = { x: 0, y: 0 };
		magnifierFrameAngle.value = -cameraOrientation.value;
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		isActive.value = false;
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			isActive.value = false;
			return;
		}
		if (!isActive.value) {
			return;
		}

		const worldPos = clientToCanvas(evt.clientX, evt.clientY);

		const dx = worldPos.x - magnifierFrameStart.value.x;
		const dy = worldPos.y - magnifierFrameStart.value.y;

		magnifierFrameSize.value = {
			x:
				magnifierFrameAngleCos.value * dx +
				magnifierFrameAngleSin.value * dy,
			y:
				-magnifierFrameAngleSin.value * dx +
				magnifierFrameAngleCos.value * dy,
		};
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}

		if (zoomDelta && !magnifierFrameStretched.value) {
			const worldPos = clientToCanvas(evt.clientX, evt.clientY);

			zoomDelta.value = {
				dz: evt.altKey ? -0.5 : 0.5,
				px: worldPos.x,
				py: worldPos.y,
			};
		} else if (zoomFrame) {
			zoomFrame.value = {
				start: magnifierFrameStart.value,
				size: magnifierFrameSize.value,
				angle: magnifierFrameAngle.value,
			};
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

{#if magnifierFrameStretched.value}
	<path
		transform={magnifierFrameTransform.value}
		d={magnifierFramePath.value}
		fill="none"
		class="magnifier"
		pointer-events="none"
	/>
{/if}

<style>
	.magnifier-surface {
		stroke-width: 0;
		cursor: zoom-in;
		outline: none;
	}

	.magnifier-surface-active {
		cursor: crosshair;
	}

	.magnifier {
		fill: #aaa;
		stroke: #aaa;
		fill-opacity: 0.5;
		fill-rule: evenodd;
		stroke-width: 1px;
		shape-rendering: crispEdges;
		vector-effect: non-scaling-stroke;
	}
</style>
