<script>
	import { tick } from "svelte";
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as Geo from "./geometry";
	import * as U from "./utils";
	import Scroller from "./Scroller.svelte";
	import RenewText from "./RenewText.svelte";
	import RenewConnection from "./RenewConnection.svelte";
	import RenewBox from "./RenewBox.svelte";
	import Navigator from "./Canvas/camera/Navigator.svelte";

	import Pen from "./Canvas/tools/Pen.svelte";

	import { frameBoxLens } from "./Canvas/camera/lenses";
	import { constructLenses } from "./Canvas/camera/live.js";
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

	let cameraFit = $state(false);

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
					if (j.data.href === doc.value.href) {
						cameraFit = false;
						doc.value = j.data;
						refitCamera();
					}
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
						[
							"elements",
							"items",
							L.setter(R.sortBy(R.prop("z_index"))),
							L.appendTo,
						],
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

	const boundsLens = [
		"elements",
		L.prop("items"),
		L.elems,
		L.pick({
			connection: [
				"connection",
				L.pick({
					minX: [
						L.foldTraversalLens(L.minimum, [
							L.props("source_x", "target_x"),
							L.values,
						]),
					],
					maxX: [
						L.foldTraversalLens(L.maximum, [
							L.props("source_x", "target_x"),
							L.values,
						]),
					],
					minY: [
						L.foldTraversalLens(L.minimum, [
							L.props("source_y", "target_y"),
							L.values,
						]),
					],
					maxY: [
						L.foldTraversalLens(L.maximum, [
							L.props("source_y", "target_y"),
							L.values,
						]),
					],
				}),
			],
			waypoints: [
				"connection",
				"waypoints",
				L.pick({
					minX: [L.foldTraversalLens(L.minimum, [L.elems, "x"])],
					maxX: [L.foldTraversalLens(L.maximum, [L.elems, "x"])],
					minY: [L.foldTraversalLens(L.minimum, [L.elems, "y"])],
					maxY: [L.foldTraversalLens(L.maximum, [L.elems, "y"])],
				}),
			],
			pos: {
				minX: "position_x",
				maxX: L.reread(
					(r) => 1 * r.position_x + 1 * (r.box?.width ?? 0),
				),
				minY: "position_y",
				maxY: L.reread(
					(r) => 1 * r.position_y + 1 * (r.box?.height ?? 0),
				),
			},
		}),
		L.values,
	];

	const extension = view(
		[
			L.pick({
				minX: [
					L.foldTraversalLens(L.minimum, [boundsLens, "minX"]),
					L.reread((x) => (isNaN(x) ? -100 : x)),
					L.defaults(-500),
				],
				maxX: [
					L.foldTraversalLens(L.maximum, [boundsLens, "maxX"]),
					L.reread((x) => (isNaN(x) ? 100 : x)),
					L.defaults(500),
				],
				minY: [
					L.foldTraversalLens(L.minimum, [boundsLens, "minY"]),
					L.reread((x) => (isNaN(x) ? -100 : x)),
					L.defaults(-100),
				],
				maxY: [
					L.foldTraversalLens(L.maximum, [boundsLens, "maxY"]),
					L.reread((x) => (isNaN(x) ? 100 : x)),
					L.defaults(100),
				],
			}),
		],
		doc,
	);

	const cameraBounds = view(
		L.reread(({ c, e }) => {
			return rotatedBounds(c.focus.w, e);
		}),
		combine({ c: camera, e: extension }),
	);

	function refitCamera() {
		const bounds = cameraBounds.value;
		const cam = camera.value;
		update(
			L.set(["focus", L.props("z", "x", "y", "w")], {
				x: (bounds.maxX + bounds.minX) / 2,
				y: (bounds.maxY + bounds.minY) / 2,
				z: -Math.max(
					Math.log(Math.max(1, bounds.maxX - bounds.minX + 100)) -
						Math.log(cam.plane.x),
					Math.log(Math.max(1, bounds.maxY - bounds.minY + 100)) -
						Math.log(cam.plane.y),
				),
				w: bounds.angle,
			}),
			camera,
		);
		cameraFit = true;
	}

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

	const cameraRotationTransformLens = L.reread(
		(c) => `rotate(${c.focus.w}, ${c.focus.x}, ${c.focus.y})`,
	);

	const cameraRotationInverseTransformLens = L.reread(
		(c) => `rotate(${-c.focus.w}, ${c.focus.x}, ${c.focus.y})`,
	);

	const rotationTransform = read(cameraRotationTransformLens, camera);
	const rotationInverseTransform = read(
		cameraRotationInverseTransformLens,
		camera,
	);

	const jsonOpen = atom(false);

	let rotator = $state();
	const svgElement = atom();
	const {
		clientToCanvas,
		canvasToClient,
		clientToPage,
		pageToClient,
		worldPageIso,
		worldClientIso,
	} = constructLenses(svgElement, camera);

	function createDrawing(e) {
		channel.push("draw_line", {
			element: {
				z_index: -1,
				points: e,
			},
		});
	}
</script>

<!--
onpointermove={(e) => {
					if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
						return;
					}
					if (!e.isPrimary || !U.isLeftButton(e)) {
						return;
					}

					e.preventDefault();
					const pt = e.currentTarget.createSVGPoint();
					pt.x = e.clientX;
					pt.y = e.clientY;
					var cursorpt = pt.matrixTransform(
						rotator.getScreenCTM().inverse(),
					);
					channel.push("create_element", {
						element: {
							z_index: -1,
							position_x: cursorpt.x,
							position_y: cursorpt.y,
						},
					});
				}}
				onpointerdown={(e) => {
					if (e.shiftKey || e.altKey || e.ctrlKey) {
						return;
					}
					if (!e.isPrimary || !U.isLeftButton(e)) {
						return;
					}
					e.currentTarget.setPointerCapture(e.pointerId);
					e.preventDefault();
					const pt = e.currentTarget.createSVGPoint();
					pt.x = e.clientX;
					pt.y = e.clientY;
					var cursorpt = pt.matrixTransform(
						rotator.getScreenCTM().inverse(),
					);

					fetch(doc.value.elements.href, {
						method: "post",
						body: JSON.stringify({
							element: {
								z_index: -1,
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
 -->

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
		<button type="submit">Delete Drawing</button>
	</form>
	<div class="loader" class:loading={!cameraFit}>
		<Scroller
			allowOverscroll={false}
			alignment="center"
			extraScrollPadding={atom(true)}
			{scrollPosition}
			contentSize={scrollContentSize}
			{scrollWindowSize}
		>
			<svg
				bind:this={svgElement.value}
				class="canvas"
				viewBox={viewBox.value}
				preserveAspectRatio={preserveAspectRatio.value}
				tabindex="-1"
				role="button"
			>
				<Navigator {camera} {frameBoxPath}>
					<g
						bind:this={rotator}
						pointer-events="none"
						transform={rotationTransform.value}
						shape-rendering="geometricPrecision"
						text-rendering="geometricPrecision"
					>
						{#if doc.value.elements}
							{#each doc.value.elements.items as e (e.id)}
								{#if e.text}
									<RenewText element={e} />
								{/if}

								{#if e.box}
									<RenewBox element={e} />
								{/if}

								{#if e.connection}
									<RenewConnection element={e} />
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
								<text
									font-size="20"
									x="0"
									y="10"
									text-anchor="middle"
									dominant-baseline="text-top"
									>Click to Place a circle</text
								>
							{/each}
						{/if}
					</g>

					<Pen
						{clientToCanvas}
						{frameBoxPath}
						{cameraScale}
						{rotationTransform}
						{createDrawing}
					/>
				</Navigator>
			</svg>
		</Scroller>
	</div>
	<details bind:open={jsonOpen.value}>
		<summary>JSON</summary>

		{#if jsonOpen.value}
			<pre>
		{JSON.stringify(doc)}
	</pre>
		{/if}
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

	.loader :global(> *) {
		transition: opacity 0.2s ease;
	}

	.loader {
		border: 1px solid #333;
	}
	.loading :global(> *) {
		opacity: 0;
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

	summary {
		display: block;
		background: #eee;
		padding: 1em;
		cursor: pointer;
		text-decoration: underline;
	}

	details {
		margin: 1em 0;
	}

	details[open] > summary {
		background: #ccc;
	}
</style>
