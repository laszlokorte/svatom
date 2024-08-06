<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	const { doc, token } = $props();

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
					doc.value = L.set(
						["elements", "items", L.appendTo],
						j.data,
						doc.value,
					);
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
