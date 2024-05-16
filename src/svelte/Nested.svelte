<script>
	let {greeting} = $props()
</script>

<label>Greeting: <input type="text" bind:value={greeting.value} /></label>