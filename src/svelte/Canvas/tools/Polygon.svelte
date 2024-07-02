<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import {
		atom,
		view,
		read,
		combine,
		disableTouchEventsIf,
	} from "../../svatom.svelte.js";

	const {
		frameBoxPath,
		clientToCanvas,
		cameraScale,
		rotationTransform,
		newDrawing,
	} = $props();

	const snapRadius = 8;
	const snapRadiusVisual = 8;

	const polygon = atom({ path: [], draft: null });
	const dragging = view(["dragging", L.valueOr(false)], polygon);
	const path = view([L.removable("path"), "path", L.defaults([])], polygon);
	const isActive = view(
		[L.lens(R.compose(R.lt(0), R.length), (n, o) => (n ? o : []))],
		path,
	);
	const draft = view(["draft"], polygon);
	const freeDraft = view(
		[
			L.pick({
				pos: "pos",
				type: ["type", L.define("free"), L.normalize(R.always("free"))],
			}),
			"pos",
		],
		draft,
	);
	const closeDraft = view(
		[
			L.pick({
				pos: "pos",
				type: [
					"type",
					L.define("close"),
					L.normalize(R.always("close")),
				],
			}),
			"pos",
		],
		draft,
	);
	const finishDraft = view(
		[
			L.pick({
				pos: "pos",
				type: [
					"type",
					L.define("finish"),
					L.normalize(R.always("finish")),
				],
			}),
			"pos",
		],
		draft,
	);
	const popDraft = view(
		[
			L.pick({
				pos: "pos",
				type: ["type", L.define("pop"), L.normalize(R.always("pop"))],
			}),
			"pos",
		],
		draft,
	);
	const draftPos = view("pos", draft);
	const draftSnappedFinish = view(
		[
			"type",
			L.lens(R.equals("finish"), (force, old) =>
				force ? "finish" : old,
			),
		],
		draft,
	);
	const draftSnappedClose = view(
		[
			"type",
			L.lens(R.equals("close"), (force, old) => (force ? "close" : old)),
		],
		draft,
	);
	const draftSnappedPop = view(
		[
			"type",
			L.lens(R.equals("pop"), (force, old) => (force ? "pop" : old)),
		],
		draft,
	);

	const startPath = view([L.index(0), L.defaults(false)], path);
	const currentPath = view(
		[L.appendTo, L.removable("x", "y"), L.defaults(false)],
		path,
	);

	const pathPath = view(
		L.iso(
			R.ifElse(
				R.length,
				R.compose(
					R.join(" "),
					R.map(R.compose(R.join(","), R.props(["x", "y"]))),
				),
				R.always(""),
			),
			R.compose(
				R.map(R.compose(R.zipWith(R.assoc, ["x", "y"]), R.split(","))),
				R.split(" "),
			),
		),
		path,
	);

	const draftPath = read(
		({ p, d }) =>
			(p
				? R.join(" ", R.props(["x", "y"], R.last(p)))
				: R.join(" ", R.props(["x", "y"], d))) +
			" " +
			R.join(" ", R.props(["x", "y"], d)),
		combine({ p: path, d: draftPos }),
	);

	const pathLength = read([L.valueOr([]), "length"], path);
	const pathRoot = read([0], path);
	const pathHead = read(L.last, path);
	const pathNeck = read(
		L.choose((l) => (l && l.length >= 2 ? l.length - 2 : L.zero)),
		path,
	);

	const pathCanFinish = read(R.lt(1), pathLength);
	const pathCanClose = read(R.lt(2), pathLength);
	const pathCanPop = read(R.lt(1), pathLength);

	export function cancel() {
		isActive.value = false;
	}
</script>

<g
	role="button"
	tabindex="-1"
	class:dragging={dragging.value}
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			if (dragging.value) {
				dragging.value = false;
			} else {
				path.value = [];
			}
		}
		if (evt.key === "b") {
			path.value = path.value.slice(0, path.value.length - 1);
		}
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		if (dragging.value) {
			dragging.value = false;
		} else if (pathCanFinish.value) {
			newDrawing.value = path.value;
			path.value = [];
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary) {
			return;
		}

		if (!U.isLeftButton(evt)) {
			return;
		}

		dragging.value = true;
		const p = clientToCanvas(evt.clientX, evt.clientY);
		evt.currentTarget.setPointerCapture(evt.pointerId);

		if (!startPath.value) {
			currentPath.value = p;
			finishDraft.value = pathRoot.value;
		} else if (
			!pathCanFinish.value &&
			Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) <
				cameraScale.value * snapRadius +
					Math.hypot(evt.width, evt.height) / 2
		) {
			path.value = [];
			return;
		}

		if (
			pathCanFinish.value &&
			Math.hypot(pathHead.value.x - p.x, pathHead.value.y - p.y) <
				cameraScale.value * snapRadius +
					Math.hypot(evt.width, evt.height) / 2
		) {
			finishDraft.value = pathHead.value;
		} else if (
			pathCanClose.value &&
			Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) <
				cameraScale.value * snapRadius +
					Math.hypot(evt.width, evt.height) / 2
		) {
			closeDraft.value = pathRoot.value;
		} else if (
			pathNeck.value &&
			Math.hypot(pathNeck.value.x - p.x, pathNeck.value.y - p.y) <
				cameraScale.value * snapRadius +
					Math.hypot(evt.width, evt.height) / 2
		) {
			popDraft.value = pathNeck.value;
		} else {
			freeDraft.value = p;
		}
	}}
	onpointermove={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}
		const p = clientToCanvas(evt.clientX, evt.clientY);
		if (
			pathHead.value &&
			Math.hypot(pathHead.value.x - p.x, pathHead.value.y - p.y) <
				cameraScale.value * snapRadius +
					Math.hypot(evt.width, evt.height) / 2
		) {
			if (pathCanFinish.value) {
				finishDraft.value = pathHead.value;
			} else {
				draftSnappedPop.value = pathNeck.value;
			}
		} else if (
			pathCanClose.value &&
			Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) <
				cameraScale.value * snapRadius +
					Math.hypot(evt.width, evt.height) / 2
		) {
			closeDraft.value = pathRoot.value;
		} else if (
			pathNeck.value &&
			Math.hypot(pathNeck.value.x - p.x, pathNeck.value.y - p.y) <
				cameraScale.value * snapRadius +
					Math.hypot(evt.width, evt.height) / 2
		) {
			popDraft.value = pathNeck.value;
		} else {
			freeDraft.value = p;
		}
	}}
	onpointerup={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!isActive.value) {
			return;
		}
		if (!dragging.value) {
			return;
		}

		dragging.value = false;
		const p = clientToCanvas(evt.clientX, evt.clientY);

		if (draftSnappedFinish.value) {
			finishDraft.value = pathHead.value;
			currentPath.value = pathHead.value;
			newDrawing.value = path.value;
			path.value = [];
		} else if (draftSnappedClose.value) {
			if (pathCanClose.value) {
				closeDraft.value = pathRoot.value;
				currentPath.value = pathRoot.value;
				newDrawing.value = path.value;
				path.value = [];
			}
		} else if (draftSnappedPop.value) {
			path.value = path.value.slice(0, path.value.length - 1);
			freeDraft.value = p;
		} else {
			if (
				pathRoot.value &&
				Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) >
					cameraScale.value * snapRadius +
						Math.hypot(evt.width, evt.height) / 2
			) {
				currentPath.value = draftPos.value;
				finishDraft.value = pathHead.value;
			}
		}
	}}
	onpointercancel={(evt) => {
		if (!evt.isPrimary) {
			return;
		}
		if (!dragging.value) {
			return;
		}

		dragging.value = false;
	}}
>
	<path
		use:disableTouchEventsIf={startPath}
		class="polygon-surface"
		d={frameBoxPath.value}
		pointer-events="all"
		stroke="none"
		fill="none"
	/>

	<g transform={rotationTransform.value} pointer-events="none">
		<polyline
			points={pathPath.value}
			pointer-events="none"
			fill="none"
			class="draft-line"
		/>

		<polyline
			points={draftPath.value}
			fill="none"
			class="draft-line-head"
			pointer-events="none"
		/>
		{#if pathCanClose.value}
			<circle
				cx={pathRoot.value.x}
				cy={pathRoot.value.y}
				r={snapRadiusVisual * cameraScale.value}
				role="button"
				tabindex="-1"
				class="capture-spot close"
				class:snapped={draftSnappedClose.value}
			></circle>
		{/if}
		{#if pathLength.value > 0}
			<circle
				cx={pathHead.value.x}
				cy={pathHead.value.y}
				r={snapRadiusVisual * cameraScale.value}
				class="capture-spot finish"
				class:snapped={draftSnappedFinish.value}
			></circle>

			<circle
				cx={pathHead.value.x}
				cy={pathHead.value.y}
				r={(snapRadiusVisual / 2) * cameraScale.value}
				class="capture-spot-center"
			></circle>
		{/if}
		{#if pathNeck.value}
			<circle
				pointer-events="all"
				cx={pathNeck.value.x}
				cy={pathNeck.value.y}
				r={snapRadiusVisual * cameraScale.value}
				class="cancel-spot"
				class:snapped={draftSnappedPop.value}
			></circle>
		{/if}
	</g>
</g>

<style>
	.polygon-surface {
		stroke-width: 0;
		cursor: default;
		outline: none;
	}

	.draft-line {
		fill: none;
		stroke: darkgray;
		stroke-width: 3px;
		stroke-opacity: 0.8;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.draft-line-head {
		fill: none;
		stroke: darkgray;
		stroke-width: 3px;
		stroke-opacity: 0.3;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	[role="button"] {
		outline: none;
	}

	.capture-spot {
		stroke: #ff6e60;
		fill: #ffcec0;
		vector-effect: non-scaling-stroke;
	}
	.capture-spot.close {
		stroke: #0e70dd;
		fill: #3ea0ff;
		vector-effect: non-scaling-stroke;
	}
	.capture-spot.finish {
		stroke: #1e9910;
		fill: #5edd50;
		vector-effect: non-scaling-stroke;
	}
	.capture-spot-center {
		fill: #1e9910;
	}

	.capture-spot.snapped {
		fill: #ff6e60;
	}
	.capture-spot.close.snapped {
		fill: #0e70dd;
	}
	.capture-spot.finish.snapped {
		fill: #1e9910;
	}

	.cancel-spot {
		stroke: #aa0000;
		fill: #ff8888;
		vector-effect: non-scaling-stroke;
	}

	.cancel-spot.snapped {
		fill: #aa0000;
	}

	.dragging {
		cursor: move;
	}
</style>
