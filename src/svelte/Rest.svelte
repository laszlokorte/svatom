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
		string,
		failableView,
		mutableView,
		strictView,
	} from "./svatom.svelte.js";

	import { Socket } from "phoenix";

	const prod = true;
	const secure = atom(true);
	const securePrefix = view(
		L.reread((b) => (b ? "s" : "")),
		secure,
	);
	const domain = atom(prod ? "renewcollab.laszlokorte.de" : "127.0.0.1:4000");
	const baseUrl = string`${securePrefix}://${domain}`;
	const loginUrl = string`http${baseUrl}/api/auth/login`;
	const documentsUrl = string`http${baseUrl}/api/documents`;
	const socketUrl = string`ws${baseUrl}/collaboration`;

	const token = mutableView(R.always(undefined), baseUrl);
	const error = atom(null);
	const socketParams = mutableView(
		(t) =>
			t
				? {
						params: { token: t },
					}
				: undefined,
		token,
	);
	const socket = mutableView((p, old) => {
		if (old) {
			old.disconnect();
		}
		if (!p) {
			return undefined;
		}
		const socket = new Socket(socketUrl.value, p);
		socket.connect();

		return socket;
	}, socketParams);

	const documents = mutableView(R.always(undefined), token);
	const documentItems = view(["items"], documents);
	const currentDocumentId = atom(null);

	$effect(() => {
		const currentToken = token.value;

		if (!documents.value && currentToken) {
			fetch(documentsUrl.value, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${currentToken}`,
				},
			})
				.then((r) => r.json())
				.then((j) => {
					documents.value = j.data;
				});
		}
	});

	let channel = $state(null);

	$effect(() => {
		if (socket.value && documents.value && documents.value.channel) {
			if (channel && channel.topic !== documents.value.channel) {
				channel.leave();
				channel = null;
			}
			if (!channel) {
				channel = socket.value.channel(documents.value.channel, {});
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

API:
<div class="url-form">
	<label class="checkbox-toggle"
		><input type="checkbox" bind:checked={securePrefix.value} />
		<span class="checkbox-yes">https://</span><span class="checkbox-no"
			>http://</span
		></label
	>
	<input type="text" bind:value={domain.value} />
</div>

{#if token.value}
	<form
		onsubmit={(e) => {
			const form = e.currentTarget;
			e.preventDefault();
			fetch(documentsUrl.value, {
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
		<div style="display: flex;flex-direction: row;gap:5px;margin: 5px 0">
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

			<button
				style="margin-left: auto; display: block"
				type="button"
				onclick={(e) => {
					e.preventDefault();
					token.value = undefined;
					documents.value = undefined;
					currentDocumentId.value = undefined;
				}}>Logout</button
			>
		</div>
	</form>
	<ul
		style="display: flex; flex-wrap: wrap;gap: 2px; margin: 0; margin: 0.2em 0; flex-direction: row;"
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
			const form = e.currentTarget;
			form.disabled = true;
			error.value = undefined;
			fetch(loginUrl.value, {
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
					form.disabled = false;
				})
				.catch((e) => {
					form.disabled = false;
					error.value = e.message;
				});
		}}
	>
		{#if error.value}
			<div style="color:#aa0000">{error.value}</div>
		{/if}
		<div style="display: flex;flex-direction: row;gap:5px;margin:5px 0">
			<input type="text" name="email" />
			<input type="password" name="password" required />
			<button type="submit">Login</button>
		</div>
	</form>
{/if}
<hr />
<RestDocument
	doc={view(
		L.find((l) => l.href == currentDocumentId.value),
		documentItems,
	)}
	{token}
	socket={socket.value}
/>

<style>
	.active,
	.active:hover,
	.active:active {
		background: #ccc !important;
		color: #111;
	}

	.url-form {
		display: flex;
		flex-direction: row;
		gap: 2px;
	}

	.checkbox-toggle {
		user-select: none;
		cursor: pointer;
		background: #eee;
		font-family: monospace;
		display: grid;
		text-align: center;
	}

	.checkbox-toggle > span {
		visibility: hidden;
		grid-column: 1 / span 1;
		grid-row: 1 / span 1;
		padding: 3px 7px;
		border: 1px solid #ccc;
		border-radius: 3px;
	}

	.checkbox-toggle > input {
		display: none;
	}

	.checkbox-toggle > input:checked ~ .checkbox-yes {
		visibility: visible;
		color: #006600;
		border-color: #006600;
		background: #aaffaa;
	}
	.checkbox-toggle > input:not(:checked) ~ .checkbox-no {
		visibility: visible;
		color: #660000;
		border-color: #660000;
		background: #ffaaaa;
	}
</style>
