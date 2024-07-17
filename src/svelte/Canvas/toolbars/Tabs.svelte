<script>
	import * as L from "partial.lenses";
	import * as H from "partial.lenses.history"; // TODO: remove history here
	import * as R from "ramda";
	import {
		atom,
		view,
		read,
		combine,
		update,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		traverse,
		animateWith,
		adjustSize,
	} from "../../svatom.svelte.js";
	const { newTab, tabIds, closeTab, currentTabId, allTabs } = $props();
</script>

<fieldset>
	<legend>Documents</legend>

	<div class="tab-bar">
		<button
			class="doc-tab-action"
			type="button"
			onclick={() => (newTab.value = {})}
			><svg width="32" height="32" viewBox="-16 -16 32 32">
				<title>New</title>
				<path
					d="M-12,0L12,0M0,12L0,-12"
					stroke="currentColor"
					stroke-width="2px"
					vector-effect="non-scaling-stroke"
					stroke-linecap="round"
					shape-rendering="crispEdges"
				/>
			</svg></button
		>
		<hr class="tab-bar-sep" />
		{#each tabIds.value as d}
			{@const docName = view(
				[
					"tabs",
					d,
					"document",
					L.defaults(H.init({}, {})),
					H.present,
					"title",
					L.defaults(""),
				],
				allTabs,
			)}
			{@const fallbackName = view(
				[
					"tabs",
					d,
					"document",
					L.defaults(H.init({}, {})),
					H.present,
					"content",
					L.choices(
						["textes", L.first, "content"],
						["textBoxes", L.first, "content"],
					),
					L.valueOr(""),
					L.ifElse(
						R.isEmpty,
						L.inverse(L.dropPrefix("untitled")),
						L.inverse(L.dropPrefix("untitled - ")),
					),
				],
				allTabs,
			)}
			<span class="doc-tab-group" class:active={d === currentTabId.value}>
				{#if d === currentTabId.value}
					<input
						placeholder={fallbackName.value}
						class="doc-tab-titel"
						class:untitled={!docName.value}
						value={docName.value}
						onchange={(evt) => {
							docName.value = evt.currentTarget.value;
						}}
						class:active={true}
					/>
				{:else}
					<button
						class="doc-tab-titel"
						class:active={false}
						class:untitled={!docName.value}
						onclick={() => (currentTabId.value = d)}
						>{docName.value || fallbackName.value}</button
					>
				{/if}
				<button
					type="button"
					class="doc-tab-del"
					onclick={() => {
						closeTab.value = d;
					}}
					class:active={d === currentTabId.value}
					title="Close"
				>
					<svg width="10" height="10" viewBox="-16 -16 32 32">
						<title>Delete</title>
						<path
							d="M-8,-8L8,8M-8,8L8,-8"
							stroke="currentColor"
							stroke-width="4px"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</span>
		{/each}
	</div>
</fieldset>

<style>
	.tab-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		align-items: stretch;
		font-family: monospace;
		-webkit-user-select: none;
		user-select: none;
		--webkit-user-callout: none;
	}

	.tab-bar-sep {
		background: #aaa;
		flex: 2px 0 0;
		width: auto;
		height: auto;
		align-self: stretch;
		justify-self: start;
		border: none;
		margin: 2px;
	}

	.doc-tab-action {
		display: grid;
		place-content: stretch;
		place-items: stretch;
		text-align: left;
		height: 2.4em;
		width: 2.4em;
		padding: 0.5em;
		box-sizing: border-box;
	}

	.doc-tab-action > svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	.doc-tab-group {
		display: flex;
		flex-basis: 15em;
		justify-items: stretch;
		background: #eee;
		border-bottom: 2px solid #333;
		flex-shrink: 0;
		flex-grow: 0;
	}

	.doc-tab-group.active {
		border-bottom-color: #cd3e30;
	}

	.doc-tab-titel {
		display: block;
		font: inherit;
		border: none;
		font-family: monospace;
		text-align: left;
		border: 2px solid white;
		background: none;
		border: none;
		color: #333;
		flex-grow: 1;
		flex-shrink: 0;
		padding: 0.5em;
		width: 12em;
		outline: none;
		white-space: pre;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: default;
		-webkit-appearance: none;
		appearance: none;
		-webkit-border-radius: 0px;
		border-radius: none;
		box-sizing: border-box;
		border: 2px solid transparent;
		border-bottom-width: 0;
	}

	input.doc-tab-titel:focus {
		cursor: text;
		background: white;
		color: #cd3e30;
		border-color: #cd3e30;
		text-overflow: initial;
	}

	@media (hover) {
		.doc-tab-titel:hover {
			background: none;
			color: #cd3e30;
		}
	}

	.doc-tab-titel:focus-visible {
		color: #cd3e30;
	}
	.doc-tab-titel.active {
		background: #cd3e30;
		color: white;
	}
	.untitled {
		font-style: italic;
		color: #333a;
	}

	.untitled.active::placeholder {
		font-style: italic;
		color: #fffa;
	}

	.doc-tab-del {
		flex-grow: 0;
		flex-shrink: 0;
		display: grid;
		width: 2em;
		place-items: center;
		place-content: center;
		text-align: center;
		box-sizing: border-box;
		color: #333;
		background: none;
		padding: 0.5em;
		overflow: hidden;
		align-self: stretch;
		font-weight: bold;
		visibility: hidden;
		border-radius: none;
	}

	.doc-tab-del > svg {
		width: 100%;
		height: 100%;
	}

	.doc-tab-del.active {
		color: #444;
		visibility: visible;
	}

	.doc-tab-del:hover {
		color: white;
		background: #aa3333;
	}

	.doc-tab-del.active:hover,
	.doc-tab-del.active:focus-visible {
		background: #aa3333;
		color: white;
	}
	.doc-tab-del:active {
		background: #773333;
	}

	@media (hover) {
		.doc-tab-group:hover > .doc-tab-del {
			display: grid;
			visibility: visible;
		}
	}
</style>
