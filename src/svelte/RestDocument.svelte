<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	const { doc, token, socket } = $props();

	$effect(() => {
		if (doc.value && !doc.value.elements) {
			fetch(doc.value.href, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token.value}`,
				},
			})
				.then((r) => r.json())
				.then((j) => {
					doc.value = j.data;
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
						console.log("Joined successfully", resp);
					})
					.receive("error", (resp) => {
						console.log("Unable to join", resp);
					});

				channel.on("element:new", (resp) => {
					doc.value = L.set(
						["elements", "items", L.appendTo],
						resp,
						doc.value,
					);
				});
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

	<svg
		viewBox="-500 -500 1000 1000"
		onpointerdown={(e) => {
			if (!e.isPrimary) {
				return;
			}
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
		<text>Hello</text>
		{#if doc.value.elements}
			{#each doc.value.elements.items as e}
				<circle r="20" fill="red" cx={e.position_x} cy={e.position_y} />
			{/each}
		{/if}
	</svg>
	<pre>
		{JSON.stringify(doc)}
	</pre>
{/if}

<style>
	svg {
		display: block;
		width: 100%;
		max-height: 20em;
	}
</style>
