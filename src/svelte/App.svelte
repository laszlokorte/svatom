<script>
	import * as L from "partial.lenses";
	import {
		atom,
		view,
		read,
		combine,
		combineWithRest,
		failableView,
		bindValue,
		bindScroll,
		bindSize,
		string,
	} from "./svatom.svelte.js";
	import Nested from "./Nested.svelte";
	import { clamp } from "./utils.js";
	import favicon from "../../favicon.svg";

	// Atoms
	const textScroller = atom({ x: 0, y: 0 });
	const textScrollerY = view(
		["y", L.normalize((x) => parseInt(x, 10)), L.normalize(Math.round)],
		textScroller,
	);
	const textScrollerX = view(
		["x", L.normalize((x) => parseInt(x, 10)), L.normalize(Math.round)],
		textScroller,
	);
	const tableScroller = atom({ x: 0, y: 0 });
	const tableScrollerSize = atom({ x: 0, y: 0 });
	const inputFields = atom([]);
	const size = atom(15);
	const allNames = atom([{ name: "Laszlo" }]);
	const wins = atom({ x: 100, y: 100 });
	const theNumber = atom(2);
	const settings = atom({ local: "de" });
	const translation = atom({
		de: {
			greeting: "Hallo",
		},
		en: {
			greeting: "hello",
		},
		es: {
			greeting: "Hola",
		},
	});

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
	const clampedSize = view(L.normalize(clamp(10, 30)), size);
	const fontSize = string`font-size: ${clampedSize}px`;
	const count = view("length", allNames);
	const indices = view(lindex(1), count);
	const newName = view(
		[L.appendTo, L.removable("name"), "name", L.defaults("")],
		allNames,
	);
	const peopleJson = failableView(
		L.inverse(L.json({ space: "  " })),
		allNames,
		false,
	);

	const theNumberClamped = view(
		[L.normalize(clamp(0, 200)), numeric],
		theNumber,
	);
	const theNumberDoubled = view(doubleNumber, theNumberClamped);

	const allLangs = read([L.keys, L.defaults([])], translation);
	const lang = view("local", settings);
	const langAndTranslation = combineWithRest({
		lang: view("local", settings),
		translation,
	});

	const currentTranslation = view(
		[
			L.choose((x) => {
				return ["translation", L.prop(x.lang || "de")];
			}),
		],
		langAndTranslation,
	);

	const langAndTransJson = failableView(
		L.inverse(L.json({ space: "  " })),
		langAndTranslation,
	);

	const currentGreeting = view(
		["greeting", L.defaults("")],
		currentTranslation,
	);
	const yourName = view(["name", L.removable(), L.defaults("")], settings);

	const ascii =
		atom(`                                                                                 
     *   .                  .              .        .   *          .             
  .         .                     .       .           .      .        .          
        o                             .                   .                      
         .              .                  .           .                         
          0     .                                                                
                 .          .                 ,                ,    ,            
 .          \\          .                         .                               
      .      \\   ,                                                               
   .          o     .                 .                   .            .         
     .         \\                 ,             .                .                
               #\\##\\#      .                              .        .             
             #  #O##\\###                .                        .               
   .        #*#  #\\##\\###                       .                     ,          
        .   ##*#  #\\##\\##               .                     .                  
      .      ##*#  #o##\\#         .                             ,       .        
          .     *#  #\\#     .                    .             .          ,      
                      \\          .                         .                     
____^/\\___^--____/\\____O______________/\\/\\---/\\___________---______________      
   /\\^   ^  ^    ^                  ^^ ^  '\\ ^          ^       ---              
         --           -            --  -      -         ---  __       ^          
   --  __                      ___--  ^  ^                         --  __        `);

	const scrollerContent = $derived(
		Array(Math.ceil(tableScrollerSize.value.y / 50) + 2)
			.fill(tableScroller.value.y)
			.map((y, i) => {
				return Array(Math.ceil(tableScrollerSize.value.x / 100) + 2)
					.fill(tableScroller.value.x)
					.map(
						(x, j) =>
							`${Math.floor(x / 100) + j}/${Math.floor(y / 50) + i}`,
					);
			}),
	);
</script>

<section>
	<h1>
		<img
			src={favicon}
			style="width: 1.2em; vertical-align: text-top; margin: 0 0.3em 0 0; display: inline-block;"
			alt=""
		/>Svatom
	</h1>

	<p>
		Size: {clampedSize.value} (clamped to 10&lt;v&lt;30)<br />
		CSS: {fontSize.value}<br />
		<label class="number-picker"
			>Slider A: <input
				type="range"
				bind:value={size.value}
				min="5"
				max="50"
			/>

			<output>({size.value})</output>

			<span>This slider can move outside the range</span>
		</label>
		<label class="number-picker"
			>Slider B: <input
				type="range"
				use:bindValue={clampedSize}
				min="5"
				max="50"
			/>

			<output>({clampedSize.value})</output>

			<span>This slider is forced into the range</span>
		</label>
	</p>

	<h3>Language</h3>

	<h4>
		{read(["greeting", L.valueOr("Hi")], currentTranslation).value}{read(
			[
				"name",
				L.inverse(L.dropPrefix(" ")),
				L.inverse(L.dropSuffix("!")),
				L.valueOr(", whats your name?"),
			],
			settings,
		).value}
	</h4>

	<div class="simple-form">
		<label
			><span>Your Name:</span>
			<input type="text" bind:value={yourName.value} /></label
		>
		<label
			><span>Your language:</span>
			<select bind:value={lang.value}>
				{#each allLangs.all as l}
					<option value={l}>{l}</option>
				{/each}
			</select></label
		>

		<label
			><span>Preferred Greeting:</span>
			<input type="text" bind:value={currentGreeting.value} /></label
		>
	</div>
	<p>
		The left field is editable and permits invalid JSON (but reports an
		error). The center field is read-only, the right field is editable but
		only permits valid JSON.
	</p>

	<p>
		If the left field has encountered an parse error, it resets
		automatically as soon as the backing data changes. Try to introduce an
		error and then edit the form above or the JSON in the right-most field.
	</p>

	<div class="beside">
		<textarea
			class:has-error={langAndTransJson.hasError}
			bind:value={langAndTransJson.value}
		></textarea>
		<pre>{langAndTransJson.stableValue}</pre>
		<textarea use:bindValue={langAndTransJson.stableAtom}></textarea>
	</div>
	<div class="error-message" hidden={!langAndTransJson.hasError}>
		<button type="button" onclick={langAndTransJson.reset}>Reset</button>
		{langAndTransJson.error}
	</div>

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
				{:else}
					<span>Press enter to jump to the next field.</span>
				{/if}
			</li>
		{/each}
	</ul>

	<h3>JSON</h3>

	<p>Person list formatted as json:</p>
	<p>
		The left field is editable and permits invalid JSON (but reports an
		error). The center field is read-only, the right field is editable but
		only permits valid JSON.
	</p>

	<p>
		Once the left field is in an error state it has to be reset explicitly
		to get rid of the error. Try to introduce an error and then edit the
		peole in the form above or in the right-most field.
	</p>

	<div class="beside">
		<textarea
			class:has-error={peopleJson.hasError}
			bind:value={peopleJson.value}
		></textarea>
		<pre style={fontSize.value}>{peopleJson.stableValue}</pre>

		<textarea use:bindValue={peopleJson.stableAtom}></textarea>
	</div>

	<div class="error-message" hidden={!peopleJson.hasError}>
		<button type="button" onclick={peopleJson.reset}>Reset</button>
		{peopleJson.error}
	</div>

	<div>
		<h3>Numbers</h3>

		<p>
			Numer sliders are synced. One slider has double the value of the
			other. The input fields do not allow non-numeric values. The values
			are clamped to 0-100 and 0-200, respectively.
		</p>

		<div class="number-picker">
			<input type="range" use:bindValue={theNumberClamped} max="100" />
			<input type="text" use:bindValue={theNumberClamped} max="100" />
			<output>({theNumberClamped.value})</output>
			The input is bound synchronously
		</div>

		<div class="number-picker">
			<input type="range" bind:value={theNumberDoubled.value} max="200" />
			<input type="text" bind:value={theNumberDoubled.value} max="200" />
			<output>({theNumberDoubled.value})</output>
			The input is bound deferred
		</div>
	</div>

	<h2>More Stuff</h2>
	<label class="number-picker"
		>Horizontal: <input
			type="range"
			use:bindValue={textScrollerX}
			min="0"
			max="200"
			step="1"
		/><input
			type="number"
			use:bindValue={textScrollerX}
			min="0"
			max="200"
			step="1"
		/></label
	>
	<label class="number-picker">
		Vertical: <input
			type="range"
			use:bindValue={textScrollerY}
			min="0"
			max="200"
			step="1"
		/><input
			type="number"
			use:bindValue={textScrollerY}
			min="0"
			max="200"
			step="1"
		/>
	</label>
	<div class="beside">
		<textarea
			use:bindScroll={textScroller}
			use:bindValue={ascii}
			class="asciiart scrollable"
		></textarea>
		<textarea
			use:bindScroll={textScroller}
			use:bindValue={ascii}
			class="asciiart scrollable"
		></textarea>
		<textarea
			use:bindScroll={textScroller}
			use:bindValue={ascii}
			class="asciiart scrollable"
		></textarea>

		<pre
			class="scrollable asciiart"
			use:bindScroll={textScroller}>{ascii.value}</pre>
		<pre
			class="scrollable asciiart"
			use:bindScroll={textScroller}>{ascii.value}</pre>
		<pre
			class="scrollable asciiart"
			use:bindScroll={textScroller}>{ascii.value}</pre>
	</div>

	<h3>Infinite Table</h3>

	<dl>
		<dt>Scroll Position</dt>
		<dd>{tableScroller.value.x} / {tableScroller.value.y}</dd>
		<dt>Frame Size</dt>
		<dd>{tableScrollerSize.value.x} / {tableScrollerSize.value.y}</dd>
	</dl>

	<div
		class="scroller"
		use:bindScroll={tableScroller}
		use:bindSize={tableScrollerSize}
		style:--scroll-x={tableScroller.value.x}
		style:--scroll-y={tableScroller.value.y}
		style:--scroll-ox={tableScroller.value.x % 100}
		style:--scroll-oy={tableScroller.value.y % 50}
		style:--scroll-cx={Math.floor(tableScrollerSize.value.x / 100)}
		style:--scroll-cy={Math.floor(tableScrollerSize.value.y / 50)}
		style:--scroll-rw={100}
		style:--scroll-rh={50}
		style:--scroll-w={tableScrollerSize.value.x}
		style:--scroll-h={tableScrollerSize.value.y}
	>
		<div class="scroller-space"></div>
		<div class="scroller-body">
			{#each scrollerContent as row, i (i)}
				<div class="scroller-row">
					{#each row as cell, j (j)}
						<div class="scroller-cell">
							{cell}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	@import url("app.css");
</style>
