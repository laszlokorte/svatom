<fieldset>
	<legend>Properties</legend>

	<div>
		<label>Fill Color<input type="color" value="#00aaff" /></label>
		<label>Stroke Color<input type="color" value="#0044aa" /></label>
		<label>Text Color<input type="color" value="#003355" /></label>
	</div>
	<div>
		<label
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
		<label
			>Font Family
			<select>
				<option>Arial</option>
				<option>Consolas</option>
				<option>Times New Roman</option>
			</select>
		</label>

		<label
			>Stroke Width
			<input
				type="number"
				value="1"
				min="0"
				step="1"
				style="width: 4em"
			/>
		</label>

		<label
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

		<label
			>Function
			<input type="text" style="width: 6em" />
		</label>

		<div>
			Alignment:
			<label><input type="radio" name="alignment" checked /> Left</label>
			<label><input type="radio" name="alignment" /> Center</label>
			<label><input type="radio" name="alignment" /> Right</label>
		</div>

		<div>
			Text Style:
			<label><input type="checkbox" /> Bold</label>
			<label><input type="checkbox" /> Italic</label>
			<label><input type="checkbox" /> Underline</label>
			<label><input type="checkbox" /> Strike</label>
		</div>
		<label
			>Dashes
			<select>
				<option>Solid</option>
				<option>Dotted</option>
				<option>Dashed</option>
				<option>Dashed Long</option>
				<option>Dash-Dotted</option>
			</select>
		</label>
		<div>
			Arrows:
			<label><input type="checkbox" /> Start</label>
			<label><input type="checkbox" /> End</label>
		</div>
	</div>
</fieldset>
