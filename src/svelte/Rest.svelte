<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import RestDocument from "./RestDocument.svelte";
	import {
		atom,
		view,
		read,
		combine,
		bindScroll,
		bindSize,
	} from "./svatom.svelte.js";

	const loginUrl = "https://renewcollab.laszlokorte.de//api/auth/login";
	const documentsUrl = "https://renewcollab.laszlokorte.de//api/documents";

	const token = atom(null);
	const documents = atom(null);
	const currentDocumentId = atom(null);

	$effect(() => {
		const currentToken = token.value;

		if (token.value) {
			fetch(documentsUrl, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token.value}`,
				},
			})
				.then((r) => r.json())
				.then((j) => {
					documents.value = j.data;
				});
		}
	});
</script>

{#if token.value}
	<ul
		style="display: flex; flex-wrap: wrap;gap: 0.5em; margin: 0; padding: 0.2em; flex-direction: row;"
	>
		{#each documents.value as d}
			<li>
				<button
					class:active={currentDocumentId.value === d.href}
					onclick={(e) => {
						e.preventDefault();
						currentDocumentId.value = d.href;
					}}>{d.name}</button
				>
			</li>
		{/each}
	</ul>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			fetch(documentsUrl, {
				method: "post",
				body: JSON.stringify({
					document: Object.fromEntries(
						new FormData(e.currentTarget).entries(),
					),
				}),
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token.value}`,
				},
			})
				.then((r) => r.json())
				.then((j) => {
					documents.value = [...documents.value, j.data];
					currentDocumentId.value = j.data.href;
				});
		}}
	>
		<select name="kind">
			<option value="drawing">drawing</option>
		</select>
		<input type="text" name="name" value="" />
		<button type="submit">Create Document</button>
	</form>
	<button
		type="button"
		onclick={(e) => {
			token.value = undefined;
		}}>Logout</button
	>
{:else}
	<form
		onsubmit={(e) => {
			e.preventDefault();
			fetch(loginUrl, {
				method: "post",
				body: JSON.stringify(
					Object.fromEntries(new FormData(e.currentTarget).entries()),
				),
				headers: {
					"Content-Type": "application/json",
				},
			})
				.then((r) => {
					if (r.ok) {
						return r.json();
					} else {
						throw new Error("Login Failed");
					}
				})
				.then((j) => {
					token.value = j.token;
				});
		}}
	>
		<input type="password" name="password" />
		<button type="submit">Login</button>
	</form>
{/if}

<RestDocument
	doc={view(
		L.find((l) => l.href == currentDocumentId.value),
		documents,
	)}
	{token}
/>

<style>
	.active,
	.active:hover,
	.active:active {
		background: #ccc !important;
		color: #111;
	}
</style>
