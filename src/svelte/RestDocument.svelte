<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	const { doc, token, socket } = $props();

	let prevHref = $state();

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

	<svg
		viewBox="-500 -500 1000 1000"
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
					// 	["elements", "items", L.appendTo],
					// 	j.data,
					// 	doc.value,
					// );
				});
		}}
	>
		{#if doc.value.elements}
			{#each doc.value.elements.items as e}
				<circle r="20" fill="red" cx={e.position_x} cy={e.position_y} />
			{:else}
				<text font-size="80" cx="0" cy="0" text-anchor="middle"
					>Click to Place a circle</text
				>
			{/each}
		{/if}
	</svg>
	<details>
		<summary>JSON</summary>

		<pre>
		{JSON.stringify(doc)}
	</pre>
	</details>
{:else}
	<svg viewBox="-500 -500 1000 1000">
		<text font-size="80" cx="0" cy="0" text-anchor="middle"
			>No Document Selected</text
		>
	</svg>
{/if}

<style>
	svg {
		display: block;
		width: 100%;
		max-height: 20em;
		touch-action: none;
	}
</style>
