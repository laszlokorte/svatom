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

	const polygon = atom({ path: [], draft: null });
	const pointerId = view(["pointerId"], polygon);
	const path = view([L.removable("path"), "path"], polygon);
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

	const pathCanFinish = read(R.lt(1), pathLength);
	const pathCanClose = read(R.lt(2), pathLength);
</script>

<g
	role="button"
	tabindex="-1"
	onkeydown={(evt) => {
		if (evt.key === "Escape" || evt.key === "Esc") {
			if (pointerId.value !== undefined && pathLength.value > 1) {
				pointerId.value = undefined;
			} else {
				path.value = undefined;
			}
		}
	}}
	oncontextmenu={(evt) => {
		evt.preventDefault();
		if (pointerId.value !== undefined) {
			pointerId.value = undefined;
		}
	}}
	onpointerdown={(evt) => {
		if (!evt.isPrimary) {
			return;
		} else if (!U.isLeftButton(evt)) {
			if (pointerId.value !== undefined) {
				pointerId.value = undefined;
			} else {
				newDrawing.value = path.value;
				path.value = undefined;
			}
			return;
		}

		const p = clientToCanvas(evt.clientX, evt.clientY);

		if (!startPath.value) {
			currentPath.value = p;
			finishDraft.value = pathRoot.value;

			pointerId.value = evt.pointerId;
		} else if (
			!pathCanClose.value &&
			Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) <
				cameraScale.value * snapRadius
		) {
			path.value = undefined;
			pointerId.value = undefined;
		} else {
			pointerId.value = evt.pointerId;

			if (
				pathCanFinish.value &&
				Math.hypot(pathHead.value.x - p.x, pathHead.value.y - p.y) <
					cameraScale.value * snapRadius
			) {
				finishDraft.value = pathHead.value;
			} else if (
				pathCanClose.value &&
				Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) <
					cameraScale.value * snapRadius
			) {
				closeDraft.value = pathRoot.value;
			} else {
				freeDraft.value = p;
			}
		}
	}}
	onpointermove={(evt) => {
		if (
			pointerId.value === evt.pointerId ||
			(pointerId.value === undefined && startPath.value)
		) {
			const p = clientToCanvas(evt.clientX, evt.clientY);
			if (
				pathCanFinish.value &&
				Math.hypot(pathHead.value.x - p.x, pathHead.value.y - p.y) <
					cameraScale.value * snapRadius
			) {
				finishDraft.value = pathHead.value;
			} else if (
				pathCanClose.value &&
				Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) <
					cameraScale.value * snapRadius
			) {
				closeDraft.value = pathRoot.value;
			} else {
				freeDraft.value = p;
			}
		}
	}}
	onpointerup={(evt) => {
		if (pointerId.value === evt.pointerId) {
			const p = clientToCanvas(evt.clientX, evt.clientY);

			if (
				pathCanFinish.value &&
				Math.hypot(pathHead.value.x - p.x, pathHead.value.y - p.y) <
					cameraScale.value * snapRadius
			) {
				finishDraft.value = pathHead.value;
				currentPath.value = pathHead.value;
				newDrawing.value = path.value;
				path.value = undefined;
			} else if (
				pathCanClose.value &&
				Math.hypot(pathRoot.value.x - p.x, pathRoot.value.y - p.y) <
					cameraScale.value * snapRadius
			) {
				closeDraft.value = pathRoot.value;
				currentPath.value = pathRoot.value;
				newDrawing.value = path.value;
				path.value = undefined;
			} else {
				currentPath.value = draftPos.value;
				finishDraft.value = pathHead.value;
				pointerId.value = undefined;
			}
		}
	}}
	onpointercancel={(evt) => {
		if (pointerId.value === evt.pointerId) {
			pointerId.value = undefined;
		}
	}}
>
	<path
		use:disableTouchEventsIf={startPath}
		class="polygon-surface"
		d={frameBoxPath.value}
		class:dragging={pointerId.value !== undefined}
		pointer-events="all"
		stroke="none"
		fill="none"
	/>

	<g transform={rotationTransform.value} pointer-events="none">
		<polyline points={pathPath.value} fill="none" class="draft-line" />

		<polyline
			points={draftPath.value}
			fill="none"
			class="draft-line-head"
		/>
		{#if pathCanClose.value}
			<circle
				cx={pathRoot.value.x}
				cy={pathRoot.value.y}
				r={snapRadius * cameraScale.value}
				stroke="#ff6e60"
				fill="#ffcec0"
				role="button"
				tabindex="-1"
				class="capture-spot"
				class:snapped={draftSnappedClose.value}
			></circle>
		{/if}
		{#if pathLength.value > 0}
			<circle
				cx={pathHead.value.x}
				cy={pathHead.value.y}
				r={snapRadius * cameraScale.value}
				stroke="#ff6e60"
				fill="#ffcec0"
				stroke-opacity={pointerId.value === undefined ? 1 : 0}
				class="capture-spot"
				class:snapped={draftSnappedFinish.value}
			></circle>

			<circle
				cx={pathHead.value.x}
				cy={pathHead.value.y}
				r={(snapRadius / 2) * cameraScale.value}
				fill="#ff6e60"
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
		stroke: #ff6e60;
		stroke-width: 3px;
		stroke-opacity: 0.6;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.draft-line-head {
		fill: none;
		stroke: #ff6e60;
		fill-opacity: 0.2;
		stroke-width: 3px;
		stroke-opacity: 0.1;
		vector-effect: non-scaling-stroke;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	[role="button"] {
		outline: none;
	}

	.capture-spot {
		vector-effect: non-scaling-stroke;
	}

	.capture-spot.snapped {
		fill: #ff6e60;
		opacity: 1;
	}

	.dragging {
		cursor: move;
	}
</style>
