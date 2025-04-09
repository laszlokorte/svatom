<script>
	import * as L from "partial.lenses";
	import * as R from "ramda";
	import * as U from "../../utils";
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
		autofocusIf,
		string,
	} from "../../svatom.svelte.js";

	const { properties = atom({}) } = $props();

	const currentFillColor = view(
		["fillColor", L.valueOr("#00aaff")],
		properties,
	);
</script>

<fieldset>
	<legend>Properties</legend>

	<div class="property-bar">
		<label class="property-field small"
			>Fill <span class="hidden-label">Color</span><input
				type="color"
				bind:value={currentFillColor.value}
			/></label
		>
		<label class="property-field small"
			>Stroke <span class="hidden-label">Color</span><input
				type="color"
				value="#0044aa"
			/></label
		>
		<label class="property-field small"
			>Text <span class="hidden-label">Color</span><input
				type="color"
				value="#003355"
			/></label
		>
		<label class="property-field"
			>Font size
			<select>
				<option>6</option>
				<option>8</option>
				<option>10</option>
				<option>12</option>
				<option>14</option>
				<option>16</option>
				<option>18</option>
				<option>20</option>
				<option>22</option>
			</select>
		</label>
		<label class="property-field"
			>Font Family
			<select>
				<option>Arial</option>
				<option>Consolas</option>
				<option>Times New Roman</option>
			</select>
		</label>

		<label class="property-field"
			>Stroke Width
			<input
				type="number"
				value="1"
				min="0"
				step="1"
				style="width: 4em"
			/>
		</label>

		<label class="property-field"
			>Opacity
			<input
				type="range"
				min="0"
				max="1"
				value="1"
				step="0.01"
				style="flex-basis: 5em; flex-shrink: 1; flex-grow: 1; min-width: 5em;"
			/>
		</label>

		<div class="property-field-filled">
			<span class="property-field-label">Text Align:</span>
			<label class="icon-label"
				><input type="radio" name="alignment" checked />
				<svg viewBox="0 0 32 32">
					<title>Left</title>

					<rect
						x="0"
						width="28"
						height="4"
						y="4"
						fill="currentColor"
					/>

					<rect
						x="0"
						width="16"
						height="4"
						y="14"
						fill="currentColor"
					/>

					<rect
						x="0"
						width="22"
						height="4"
						y="24"
						fill="currentColor"
					/>
				</svg>
			</label>
			<label class="icon-label"
				><input type="radio" name="alignment" />
				<svg viewBox="0 0 32 32">
					<title>Center</title>

					<rect
						x="2"
						width="28"
						height="4"
						y="4"
						fill="currentColor"
					/>

					<rect
						x="8"
						width="16"
						height="4"
						y="14"
						fill="currentColor"
					/>

					<rect
						x="5"
						width="23"
						height="4"
						y="24"
						fill="currentColor"
					/>
				</svg></label
			>
			<label class="icon-label"
				><input type="radio" name="alignment" />
				<svg viewBox="0 0 32 32">
					<title>Right</title>

					<rect
						x="4"
						width="28"
						height="4"
						y="4"
						fill="currentColor"
					/>

					<rect
						x="20"
						width="16"
						height="4"
						y="14"
						fill="currentColor"
					/>

					<rect
						x="10"
						width="22"
						height="4"
						y="24"
						fill="currentColor"
					/>
				</svg></label
			>
		</div>

		<div class="property-field-filled">
			<span class="property-field-label">Text Style:</span>
			<label class="icon-label"
				><input type="checkbox" />
				<svg viewBox="0 0 32 32">
					<title>Bold</title>

					<text
						font-weight="bold"
						x="16"
						y="28"
						dominant-baseline="auto"
						text-anchor="middle"
						fill="currentColor"
						font-size="36">B</text
					>
				</svg></label
			>
			<label class="icon-label"
				><input type="checkbox" />
				<svg viewBox="0 0 32 32">
					<title>Italic</title>

					<text
						font-style="italic"
						x="16"
						y="28"
						dominant-baseline="auto"
						text-anchor="middle"
						fill="currentColor"
						font-size="36">I</text
					>
				</svg></label
			>
			<label class="icon-label"
				><input type="checkbox" />
				<svg viewBox="0 0 32 32">
					<title>Underlined</title>

					<text
						text-decoration="underline"
						x="16"
						y="28"
						dominant-baseline="auto"
						text-anchor="middle"
						fill="currentColor"
						font-size="36">U</text
					>
				</svg></label
			>
			<label class="icon-label"
				><input type="checkbox" />
				<svg viewBox="0 0 32 32">
					<title>Stroke</title>

					<text
						text-decoration="line-through"
						x="16"
						y="28"
						dominant-baseline="auto"
						text-anchor="middle"
						fill="currentColor"
						font-size="36">S</text
					>
				</svg></label
			>
		</div>
		<label class="property-field"
			>Dashes
			<select>
				<option>Solid</option>
				<option>Dotted</option>
				<option>Dashed</option>
				<option>Dashed Long</option>
				<option>Dash-Dotted</option>
			</select>
		</label>
		<div class="property-field-filled">
			<span class="property-field-label">Arrow Heads:</span>
			<label class="icon-label"
				><input type="checkbox" />
				<svg viewBox="0 0 32 32">
					<title>Start</title>

					<rect
						x="12"
						width="16"
						height="4"
						y="14"
						fill="currentColor"
					/>
					<polygon points="2 16 12 6 12 26" fill="currentColor" />
				</svg></label
			>
			<label class="icon-label"
				><input type="checkbox" />
				<svg viewBox="0 0 32 32">
					<title>End</title>

					<rect
						x="4"
						width="16"
						height="4"
						y="14"
						fill="currentColor"
					/> <polygon points="30 16 20 6 20 26" fill="currentColor" />
				</svg></label
			>
		</div>

		<label class="property-field"
			>Function
			<input type="text" style="width: 6em" />
		</label>
	</div>
</fieldset>

<style>
	.property-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		align-items: stretch;
	}

	.property-field {
		background: #f0f0f0;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.2em 0.2em 0.2em 0.5em;
		min-height: 1.6em;
		box-sizing: border-box;
		flex-basis: max-content;
		flex-grow: 1;
		flex-shrink: 1;
	}

	.property-field.small {
		flex-grow: 0;
	}

	.property-field-filled {
		background: #f0f0f0;
		display: flex;
		align-items: stretch;
		gap: 2px;
		padding: 2px;
		min-height: 1.6em;
		box-sizing: border-box;
	}

	input[type="color"] {
		width: 2em;
		height: 2em;
		padding: 0;
		border: 0;
		cursor: pointer;
		margin: 0;
		box-sizing: border-box;
	}

	input[type="number"] {
		height: 2em;
		padding: 0.5em;
		margin: 0;
		box-sizing: border-box;
		flex-grow: 1;
	}

	input[type="text"] {
		flex-grow: 1;
		padding: 0.5em;
		box-sizing: border-box;
	}

	select {
		flex-grow: 1;
		padding: 0.2em;
		box-sizing: border-box;
	}

	label {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.icon-label {
		display: flex;
		align-items: center;
		padding: 0 0.4em;
		color: #777;
		background: #0001;
	}

	.icon-label > svg {
		display: block;
		width: 1em;
		height: 1em;
	}

	.icon-label > input {
		display: none;
	}

	.icon-label:has(:checked) {
		background: #ee3f10;
		color: #fff;
	}

	.property-field-label {
		align-self: center;
		padding: 0 0.5em;
	}

	.hidden-label {
		display: none;
	}
</style>
