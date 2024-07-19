<fieldset>
	<legend>Properties</legend>

	<div class="property-bar">
		<label class="property-field"
			>Fill Color<input type="color" value="#00aaff" /></label
		>
		<label class="property-field"
			>Stroke Color<input type="color" value="#0044aa" /></label
		>
		<label class="property-field"
			>Text Color<input type="color" value="#003355" /></label
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
				style="width: 6em"
			/>
		</label>

		<label class="property-field"
			>Function
			<input type="text" style="width: 6em" />
		</label>

		<div class="property-field-filled">
			<span class="property-field-label">Text Align:</span>
			<label class="icon-label"
				><input type="radio" name="alignment" checked /> Left</label
			>
			<label class="icon-label"
				><input type="radio" name="alignment" /> Center</label
			>
			<label class="icon-label"
				><input type="radio" name="alignment" /> Right</label
			>
		</div>

		<div class="property-field-filled">
			<span class="property-field-label">Text Style:</span>
			<label class="icon-label"><input type="checkbox" /> Bold</label>
			<label class="icon-label"><input type="checkbox" /> Italic</label>
			<label class="icon-label"><input type="checkbox" /> Underline</label
			>
			<label class="icon-label"><input type="checkbox" /> Strike</label>
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
			<span class="property-field-label">Arrows:</span>
			<label class="icon-label"><input type="checkbox" /> Start</label>
			<label class="icon-label"><input type="checkbox" /> End</label>
		</div>
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
	}

	.property-field-filled {
		background: #f0f0f0;
		display: flex;
		align-items: stretch;
		gap: 2px;
		padding: 2px;
	}

	input[type="color"] {
		width: 1.5em;
		height: 1.5em;
		padding: 0;
		border: 0;
		cursor: pointer;
	}

	label {
		cursor: pointer;
	}

	.icon-label {
		display: flex;
		align-items: center;
		padding: 0 0.4em;
		color: #777;
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
</style>
