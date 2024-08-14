<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as Geo from "./geometry";
	import Scroller from "./Scroller.svelte";
	import Navigator from "./Canvas/camera/Navigator.svelte";

	import { frameBoxLens } from "./Canvas/camera/lenses";
	const { doc, token, socket } = $props();

	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindScrollMax,
		bindSize,
		string,
		bindBoundingBox,
		update,
	} from "./svatom.svelte.js";
	let prevHref = $state();

	const numberSvgFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5,
		useGrouping: false,
	});

	$effect(() => {
		if (doc.value && doc.value.href !== prevHref) {
			prevHref = doc.value.href;
			fetch(doc.value.href, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token.value}`,
				},
			})
				.then((r) => r.json())
				.then((j) => {
					prevHref = j.data.href;
					doc.value = j.data;
				})
				.catch((e) => {
					prevHref = undefined;
				});
		}
	});

	let channel = $state(null);

	$effect(() => {
		if (socket && doc.value && doc.value.channel) {
			if (channel && channel.topic !== doc.value.channel) {
				channel.leave();
				channel = null;
			}
			if (!channel) {
				channel = socket.channel(doc.value.channel, {});
				channel
					.join()
					.receive("ok", (resp) => {
						//alert("joined ok");
					})
					.receive("error", (resp) => {
						//alert(resp);
					});

				channel.on("element:new", (resp) => {
					doc.value = L.set(
						["elements", "items", L.appendTo],
						resp,
						doc.value,
					);
				});

				// channel.on("phx_reply", (resp) => {
				// 	console.log("pong", resp);
				// });
				//alert("joinedA");
			}
		}
	});

	function rotatedBounds(degree, rect) {
		if (!rect) {
			return {
				angle: 0,
				minX: 0,
				maxX: 0,
				minY: 0,
				maxY: 0,
			};
		}
		const rectCenterX = (rect.maxX + rect.minX) / 2;
		const rectCenterY = (rect.maxY + rect.minY) / 2;
		const halfWidth = (rect.maxX - rect.minX) / 2;
		const halfHeight = (rect.maxY - rect.minY) / 2;

		const c1 = Geo.rotateDegree(degree, { x: halfWidth, y: halfHeight });
		const c2 = Geo.rotateDegree(degree, { x: -halfWidth, y: halfHeight });
		const c3 = Geo.rotateDegree(degree, { x: halfWidth, y: -halfHeight });
		const c4 = Geo.rotateDegree(degree, { x: -halfWidth, y: -halfHeight });

		const halfWidthRot = Math.max(
			Math.abs(c1.x),
			Math.abs(c2.x),
			Math.abs(c3.x),
			Math.abs(c4.x),
		);
		const halfHeightRot = Math.max(
			Math.abs(c1.y),
			Math.abs(c2.y),
			Math.abs(c3.y),
			Math.abs(c4.y),
		);

		return {
			angle: degree,
			minX: rectCenterX - halfWidthRot,
			maxX: rectCenterX + halfWidthRot,
			minY: rectCenterY - halfHeightRot,
			maxY: rectCenterY + halfHeightRot,
		};
	}

	const camera = atom({
		focus: { x: 0, y: 0, z: 0, w: 0 },
		plane: {
			autosize: true,
			x: 1000,
			y: 1000,
		},
		frame: {
			aspect: "meet",
			alignX: "Mid",
			alignY: "Mid",
			autoPadding: true,
			size: {
				x: 100,
				y: 100,
			},
		},
	});
	const cameraScaleLens = L.reread((c) => Math.exp(-c.focus.z));

	const cameraX = view(["focus", "x"], camera);
	const cameraY = view(["focus", "y"], camera);
	const cameraScale = read(cameraScaleLens, camera);

	const scrollWindowSize = view(
		[
			L.lens(R.prop("frame"), (newSize) => ({
				frame: newSize,
				plane: newSize,
			})),
		],
		combine({
			plane: view(["plane", L.props("x", "y")], camera),
			frame: view(["frame", "size"], camera),
		}),
	);

	const viewBoxLens = L.reread((cam) => {
		return `${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.focus.y - (cam.plane.y / 2) * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.plane.x * Math.exp(-cam.focus.z))} 
		${numberSvgFormat.format(cam.plane.y * Math.exp(-cam.focus.z))}`;
	});
	const viewBox = view(viewBoxLens, camera);

	const preserveAspectRatioLens = [
		"frame",
		L.props("aspect", "alignX", "alignY"),
		L.iso(
			(frame) =>
				frame.aspect
					? `x${frame.alignX}Y${frame.alignY} ${frame.aspect}`
					: "none",
			R.compose(
				R.ifElse(
					R.prop("noAspect"),
					R.compose(R.objOf("aspect"), R.prop("noAspect")),
					R.props(["alignX", "alignY", "aspect"]),
				),
				R.prop("groups"),
				R.match(
					/^((?<noAspect>none)|x(?:(?<alignX>Min|Mid|Max)Y(?<alignY>Min|Mid|Max) (?<aspect>meet|slice)))$/,
				),
			),
		),
	];

	const preserveAspectRatio = read(preserveAspectRatioLens, camera);

	const extension = atom({ minX: 0, maxX: 0, minY: 0, maxY: 0 });

	const cameraBounds = read(
		({ c, e }) => {
			return rotatedBounds(c.focus.w, e);
		},
		combine({ c: camera, e: extension }),
	);

	const cameraInBounds = view(
		L.lens(
			({ x, y, s, w, b }) => {
				const rot = Geo.rotatePivotXYDegree(
					(b.minX + b.maxX) / 2,
					(b.minY + b.maxY) / 2,
					b.angle,
					{ x, y },
				);

				return {
					x: (rot.x - b.minX) / s - w.x / 2,
					y: (rot.y - b.minY) / s - w.y / 2,
				};
			},
			({ x, y }, { s, w, b }) => {
				const rot = Geo.rotatePivotXYDegree(
					(b.minX + b.maxX) / 2,
					(b.minY + b.maxY) / 2,
					-b.angle,
					{
						x: (x + w.x / 2) * s + b.minX,
						y: (y + w.y / 2) * s + b.minY,
					},
				);

				return {
					x: rot.x,
					y: rot.y,
				};
			},
		),
		combine(
			{
				x: cameraX,
				y: cameraY,
				s: cameraScale,
				w: scrollWindowSize,
				b: cameraBounds,
			},
			{ x: true, y: true },
		),
	);

	const scrollContentSize = view(
		({ s, w, b }) => ({
			x: (b.maxX - b.minX) / s,
			y: (b.maxY - b.minY) / s,
		}),
		combine({
			s: cameraScale,
			b: cameraBounds,
		}),
	);

	const integerLens = L.lens(
		(x) => Math.floor(x),
		(newV, oldV) => Math.ceil(newV) + (oldV - Math.floor(oldV)),
	);

	const scrollPosition = view(
		[
			L.pick({ x: ["x", integerLens], y: ["y", integerLens] }),
			L.setter((newScroll, old) => ({
				x:
					(newScroll.atMinX && old.x < newScroll.x) ||
					(newScroll.atMaxX && old.x > newScroll.x)
						? old.x
						: newScroll.x,
				y:
					(newScroll.atMinY && old.y < newScroll.y) ||
					(newScroll.atMaxY && old.y > newScroll.y)
						? old.y
						: newScroll.y,
			})),
		],
		cameraInBounds,
	);

	const boxPathLens = L.reread(
		({ minX, minY, width, height }) =>
			`M${numberSvgFormat.format(minX)},${numberSvgFormat.format(minY)}h${numberSvgFormat.format(width)}v${numberSvgFormat.format(height)}h${numberSvgFormat.format(-width)}z`,
	);

	const frameBoxPath = read(
		[frameBoxLens, "screenSpaceAligned", boxPathLens],
		camera,
	);
</script>

{#if doc.value}
	<form
		onsubmit={(e) => {
			e.preventDefault();

			fetch(doc.value.href, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token.value}`,
				},
			})
				.then((r) => {
					if (r.ok) {
						return r.text();
					}
					throw new Error("Deletion failed");
				})
				.then((j) => {
					doc.value = undefined;
				})
				.catch(() => {
					console.log("deletion failed");
				});
		}}
	>
		<button type="submit">Delete</button>
	</form>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			channel.push("ping", { bar: "foo" });
		}}
	>
		<button type="submit">Text</button>
	</form>

	<Scroller
		allowOverscroll={false}
		alignment="center"
		extraScrollPadding={atom(true)}
		{scrollPosition}
		contentSize={scrollContentSize}
		{scrollWindowSize}
	>
		<svg
			class="canvas"
			viewBox={viewBox.value}
			preserveAspectRatio={preserveAspectRatio.value}
			tabindex="-1"
			role="button"
			onpointermove={(e) => {
				if (!e.isPrimary) {
					return;
				}
				if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
					return;
				}

				const pt = e.currentTarget.createSVGPoint();
				pt.x = e.clientX;
				pt.y = e.clientY;
				var cursorpt = pt.matrixTransform(
					e.currentTarget.getScreenCTM().inverse(),
				);
				channel.push("create_element", {
					element: {
						z_index: 42,
						position_x: cursorpt.x,
						position_y: cursorpt.y,
					},
				});
			}}
			onpointerdown={(e) => {
				if (!e.isPrimary) {
					return;
				}
				e.currentTarget.setPointerCapture(e.pointerId);
				e.preventDefault();
				const pt = e.currentTarget.createSVGPoint();
				pt.x = e.clientX;
				pt.y = e.clientY;
				var cursorpt = pt.matrixTransform(
					e.currentTarget.getScreenCTM().inverse(),
				);

				fetch(doc.value.elements.href, {
					method: "post",
					body: JSON.stringify({
						element: {
							z_index: 42,
							position_x: cursorpt.x,
							position_y: cursorpt.y,
						},
					}),
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token.value}`,
					},
				})
					.then((r) => r.json())
					.then((j) => {
						// doc.value = L.set(
						//      ["elements", "items", L.appendTo],
						//      j.data,
						//      doc.value,
						// );
					});
			}}
		>
			<Navigator {camera} {frameBoxPath}>
				{#if doc.value.elements}
					{#each doc.value.elements.items as e}
						{#if e.text}
							<text fill="black" x={e.position_x} y={e.position_y}
								>{e.text.body}</text
							>
						{/if}

						{#if e.box}
							<rect
								x={e.position_x}
								y={e.position_y}
								width={e.box.width}
								height={e.box.height}
								stroke-width="3"
								stroke="black"
								fill="rgb(112, 219, 147)"
							></rect>
						{/if}

						{#if e.connection}
							<path
								stroke-width="3"
								stroke="black"
								fill="none"
								d="M{e.connection.source_x},{e.connection
									.source_y}
						{e.connection.waypoints.map(({ x, y }) => `L ${x},${y}`).join(' ')}
							L{e.connection.target_x},{e.connection.target_y}"
							/>
						{/if}

						{#if !e.connection && !e.box && !e.text}
							<circle
								r="3"
								cx={e.position_x}
								cy={e.position_y}
								fill="red"
							></circle>
						{/if}
					{:else}
						<text font-size="80" x="0" y="0" text-anchor="middle"
							>Click to Place a circle</text
						>
					{/each}
				{/if}
			</Navigator>
		</svg>
	</Scroller>
	<details>
		<summary>JSON</summary>

		<pre>
		{JSON.stringify(doc)}
	</pre>
	</details>
{:else}
	<div
		style="display: flex; place-content: center; place-items: center; height: 10em;"
	>
		No Document Selected
	</div>
{/if}

<style>
	svg {
		display: block;
		width: 100%;
		touch-action: none;
	}

	.canvas {
		contain: strict;
		-webkit-user-callout: none;
		width: 100%;
		resize: both;

		position: absolute;
		display: block;
		grid-area: 1/1/1/1;
		place-self: stretch;
		width: 100%;
		height: 100%;

		user-select: none;
		-webkit-user-select: none;
		touch-action: none;

		-webkit-touch-callout: none;
		-webkit-user-callout: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-user-modify: none;
		-webkit-highlight: none;
	}
</style>
