<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
	import * as C from "../../combinators";
	import { atom, view, read } from "../../svatom.svelte.js";
	const {
		children,
		createText,
		clientToCanvas,
		cameraScale,
		cameraOrientation,
		createNode,
		createShape,
		dragging = atom(0),
	} = $props();

	const onDragOver = (evt) => {
		if (evt.dataTransfer.items.length < 1) {
			dragging.value = 0;
			return;
		}
		evt.preventDefault();
		evt.dataTransfer.dropEffect = "copy";
	};

	const onDragEnter = (evt) => {
		if (evt.dataTransfer.items.length < 1) {
			return;
		}
		evt.preventDefault();
		dragging.value++;
	};

	const onDragLeave = (evt) => {
		if (evt.dataTransfer.items.length < 1) {
			dragging.value = 0;
			return;
		}
		evt.preventDefault();
		dragging.value--;
	};

	const onDragDrop = (evt) => {
		evt.preventDefault();
		const position = clientToCanvas(evt.clientX, evt.clientY);

		dragging.value = 0;

		// Work-around for
		// https://bugs.chromium.org/p/chromium/issues/detail?id=1293803&no_tracker_redirect=1
		// chrome on android supports only text/plain mimeTypes in drag drop data transfer
		let useWorkaround = true;

		for (let item of evt.dataTransfer.items) {
			if (useWorkaround !== true && item.type === "x-custom/text") {
				useWorkaround = false;
				item.getAsString((s) => {
					dropText(JSON.parse(s), position);
				});
			} else if (
				useWorkaround !== true &&
				item.type === "x-custom/node"
			) {
				useWorkaround = false;
				item.getAsString((s) => {
					dropNode(JSON.parse(s), position);
				});
			} else if (
				useWorkaround !== true &&
				item.type === "x-custom/shape"
			) {
				useWorkaround = false;
				item.getAsString((s) => {
					dropShape(JSON.parse(s), position);
				});
			} else if (item.type === "text/plain") {
				if (useWorkaround !== false) {
					useWorkaround = true;

					item.getAsString((s) => {
						const n = JSON.parse(s);

						const mime = n.mime;
						const data = n.data;

						switch (mime) {
							case "x-custom/text":
								dropText(data, position);
								break;
							case "x-custom/node":
								dropNode(data, position);
								break;
							case "x-custom/shape":
								dropShape(data, position);
								break;
						}
					});
				}
			} else if (useWorkaround !== true && item.kind === "string") {
				alert(item.type);
				item.getAsString((s) => {
					alert("dropped: " + s);
				});
			} else if (item.kind === "file") {
				alert("dropped file ");
			}
		}
	};

	const dropShape = (n, position) => {
		const box = n.box.split(" ");
		const w = (box[2] * cameraScale.value) / 2;
		const h = (box[3] * cameraScale.value) / 2;
		const a = -cameraOrientation.value;
		const cos = Math.cos((a / 180) * Math.PI);
		const sin = Math.sin((a / 180) * Math.PI);
		createShape({
			placement: {
				start: {
					x: position.x - (cos * w - sin * h) / 2,
					y: position.y - (sin * w + cos * h) / 2,
				},
				size: { x: w, y: h },
				angle: a,
			},
			content: {
				box: n.box,
				paths: n.paths,
			},
		});
	};

	const dropNode = (n, position) => {
		createNode({
			x: position.x,
			y: position.y,
		});
	};

	const dropText = (n, position) => {
		createText({
			x: position.x,
			y: position.y,
			fontSize: 4 * cameraScale.value,
			content: n.text,
		});
	};
</script>

<div
	class={["drop-zone", { active: dragging.value > 0 }]}
	role="application"
	pointer-events="all"
	ondragover={onDragOver}
	ondragenter={onDragEnter}
	ondragleave={onDragLeave}
	ondrop={onDragDrop}
>
	{@render children()}
	<div
		class={["blocker", { active: dragging.value > 0 }]}
		ondragenter={onDragEnter}
		ondragleave={onDragLeave}
		role="application"
	></div>
</div>

<style>
	.drop-zone {
		display: block;
		position: relative;
		min-width: max-content;
		min-height: max-content;
	}

	.drop-zone.active {
		outline: 0.5em solid #22ee88;
	}

	.blocker {
		position: absolute;
		inset: 0;
		color: #22ee88;
		padding: 1em;
		font-size: 2em;
		display: none;
		font-family: sans-serif;
		pointer-events: none;
	}

	.blocker.active {
		display: grid;
		pointer-events: all;
		touch-action: none;
	}
</style>
