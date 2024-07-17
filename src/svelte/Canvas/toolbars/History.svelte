<script>
	const { canvasUndoIndex, canvasRedoIndex } = $props();
</script>

<fieldset>
	<legend>History</legend>

	<button
		type="button"
		disabled={canvasUndoIndex.value < 1}
		onclick={(evt) => {
			canvasUndoIndex.value--;
		}}>Undo</button
	>
	<button
		type="button"
		disabled={canvasRedoIndex.value < 1}
		onclick={(evt) => {
			canvasRedoIndex.value--;
		}}>Redo</button
	>
</fieldset>
