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

	import { Socket } from "phoenix";

	const baseUrl = false
		? "//127.0.0.1:4000"
		: "//renewcollab.laszlokorte.de/";
	const loginUrl = `${baseUrl}/api/auth/login`;
	const documentsUrl = `${baseUrl}/api/documents`;

	const token = atom(null);
	const documents = atom(null);
	const documentItems = view(["items"], documents);
	const currentDocumentId = atom(null);
	let socket = $state(null);

	$effect(() => {
		const currentToken = token.value;

		if (!documents.value && currentToken) {
			fetch(documentsUrl, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${currentToken}`,
				},
			})
				.then((r) => r.json())
				.then((j) => {
					documents.value = j.data;
					if (!socket) {
						socket = new Socket(`${baseUrl}/collaboration`, {
							params: { token: currentToken },
						});
						socket.connect();
					}
				});
		}
	});

	let channel = $state(null);

	$effect(() => {
		if (socket && documents.value && documents.value.channel) {
			if (channel && channel.topic !== documents.value.channel) {
				channel.leave();
				channel = null;
			}
			if (!channel) {
				channel = socket.channel(documents.value.channel, {});
				channel
					.join()
					.receive("ok", (resp) => {
						//console.log("Joined successfully", resp);
					})
					.receive("error", (resp) => {
						//console.log("Unable to join", resp);
					});

				channel.on("document:new", (resp) => {
					documents.value = L.set(
						["items", L.find((l) => l.href == resp.href)],
						resp,
						documents.value,
					);
				});

				channel.on("document:delete", (resp) => {
					documentItems.value = L.remove(
						L.find((l) => l.href == resp.href),
						documentItems.value,
					);
					if (currentDocumentId.value === resp.href) {
						currentDocumentId.value = undefined;
					}
				});
			}
		}
	});
</script>

{#if token.value}
	<div>
		<button
			style="margin-left: auto; display: block"
			type="button"
			onclick={(e) => {
				token.value = undefined;
				documents.value = undefined;
				currentDocumentId.value = undefined;
			}}>Logout</button
		>
	</div>
	<form
		onsubmit={(e) => {
			const form = e.currentTarget;
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
					form.reset();
					documents.value = L.set(
						["items", L.find((l) => l.href == j.data.href)],
						j.data,
						documents.value,
					);
					currentDocumentId.value = j.data.href;
				});
		}}
	>
		<select name="kind" required>
			<option value="drawing">Type: drawing</option>
		</select>
		<input
			type="text"
			name="name"
			value=""
			required
			placeholder="Document Name"
		/>
		<button type="submit">Create Document</button>
	</form>
	<ul
		style="display: flex; flex-wrap: wrap;gap: 0.5em; margin: 0; padding: 0.2em; flex-direction: row;"
	>
		{#each documentItems.value as d}
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
<hr />
<RestDocument
	doc={view(
		L.find((l) => l.href == currentDocumentId.value),
		documentItems,
	)}
	{token}
	{socket}
/>

<style>
	.active,
	.active:hover,
	.active:active {
		background: #ccc !important;
		color: #111;
	}
</style>
