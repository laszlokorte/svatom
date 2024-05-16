<script>
	import * as L from "partial.lenses";
	import { atom, view, read } from "./svatom.svelte.js";
	import Nested from "./Nested.svelte";
	import { clamp } from "./utils.js";

	// Atoms
	const inputFields = atom([]);
	const size = atom(15);
	const allNames = atom([{ name: "Laszlo" }]);
	const wins = atom({ x: 100, y: 100 });
	const theNumber = atom(2);

	// Predefined Lenses
	const numeric = L.lens(
		(x) => x,
		(v, old) => (isNaN(parseInt(v, 10)) ? old : parseInt(v, 10)),
	);
	const lindex = (xtra) =>
		L.lens(
			(a) =>
				Array(a + xtra)
					.fill(0)
					.map((_, i) => i),
			(c, a) => c.length - xtra,
		);
	const indexedName = (i) => [i, L.removable("name"), "name", L.defaults("")];
	const doubleNumber = L.lens(
		(x) => x * 2,
		(x, a) => (a * 2 > x ? Math.floor(x / 2) : Math.ceil(x / 2)),
	);

	// Views into the Atom
	const clampedSize = read(L.normalize(clamp(10, 30)), size);
	const fontSize = read(
		L.lens(
			(s) => `font-size: ${s}px`,
			(n, o) => o,
		),
		clampedSize,
	);
	const count = view("length", allNames);
	const indices = view(lindex(1), count);
	const newName = view(
		[L.appendTo, L.removable("name"), "name", L.defaults("")],
		allNames,
	);
	const json = view(L.inverse(L.json({ space: "  " })), allNames);

	const theNumberClamped = view(
		[L.normalize(clamp(0, 200)), numeric],
		theNumber,
	);
	const theNumberDoubled = view(doubleNumber, theNumberClamped);
</script>

<section>
	<h1>Optix Booooom</h1>

	<p>
		Size: {clampedSize.value} (clamped to 10&lt;v&lt;30)<br />
		CSS: {fontSize.value}<br />
		<input type="range" bind:value={size.value} min="5" max="50" />
	</p>

	<h3>People ({count.value})</h3>

	<p>
		People with empty names get removed. If the Greeting is exactly
		<em>Hello</em>, it is not stored.
	</p>

	<div class="controls">
		<button type="button" onclick={() => (newName.value = "New")}>
			Add Person
		</button>
	</div>

	<ul>
		{#each indices.value as i (i)}
			{@const thisEntry = view(i, allNames)}
			{@const thisInputName = view([i, "name"], inputFields)}
			{@const nextInputName = view([i + 1, "name"], inputFields)}
			{@const thisInputGreet = view([i, "greet"], inputFields)}
			{@const nextInputGreet = view([i + 1, "greet"], inputFields)}
			{@const thisName = view(indexedName(i), allNames)}
			{@const thisGreeting = view(
				[i, "greeting", L.defaults("Hello")],
				allNames,
			)}
			<li>
				<button
					class:phantom={!thisEntry.value}
					type="button"
					onclick={() => (thisName.value = "")}>x</button
				>
				<label
					>Name: <input
						bind:this={thisInputName.value}
						type="text"
						bind:value={thisName.value}
						onkeydown={(evt) => {
							if (evt.key === "Enter" && nextInputName.value) {
								nextInputName.value.focus();
							}
						}}
					/></label
				>
				{#if thisEntry.value}
					<Nested
						greeting={thisGreeting}
						bind:this={thisInputGreet.value}
						onkeydown={(evt) => {
							if (evt.key === "Enter" && nextInputGreet.value) {
								nextInputGreet.value.focus();
							}
						}}
					/>
				{/if}
			</li>
		{/each}
	</ul>

	<h3>JSON</h3>

	<p>Person list is formatted as json</p>

	<pre style={fontSize.value}>{json.value}</pre>

	<h3>Also Editable</h3>

	<p>
		Edit the JSON below and see how it is kept in sync with the list above.
	</p>

	<textarea bind:value={json.value}></textarea>

	<div>
		<h3>Numbers</h3>

		<p>
			Numer sliders are synced. One slider has double the value of the
			other. The input fields do not allow non-numeric values. The values
			are clamped to 0-100 and 0-200, respectively.
		</p>

		<div class="number-picker">
			<input type="range" bind:value={theNumberClamped.value} max="100" />
			<input type="text" bind:value={theNumberClamped.value} max="100" />
			<output>({theNumberClamped.value})</output>
		</div>

		<div class="number-picker">
			<input type="range" bind:value={theNumberDoubled.value} max="200" />
			<input type="text" bind:value={theNumberDoubled.value} max="200" />
			<output>({theNumberDoubled.value})</output>
		</div>
	</div>
</section>

<style>
	section {
		margin: 3em auto;
		max-width: 60em;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		gap: 0.5em;
		flex-direction: column;
	}

	pre {
		white-space: pre-wrap;
		background: #333;
		color: #fff;
		height: 10em;
		overflow: auto;
		resize: vertical;
		padding: 1em;
		box-sizing: border-box;
	}

	textarea {
		white-space: pre-wrap;
		background: #ffffee;
		color: #000;
		width: 100%;
		min-height: 10em;
		border: 0;
		resize: vertical;
		padding: 1em;
		box-sizing: border-box;
	}

	.number-picker {
		display: flex;
		align-items: center;
		gap: 1em;
	}

	input[type="range"] {
		padding: 1em;
		margin: 0;
	}

	input[type="text"] {
		margin: 0;
	}

	.phantom {
		visibility: hidden;
	}

	.controls {
		display: flex;
		margin: 1em 0;
	}

	button {
		border: none;
		background: #111;
		color: #fff;
		padding: 0.3em 0.5em;
		display: inline-block;
		font: inherit;
		cursor: pointer;
	}
</style>
