<script>
	let { greeting, onkeydown } = $props();

	let field = $state();

	export function focus() {
		field.focus();
	}
</script>

<label
	>Greeting: <input
		{onkeydown}
		bind:this={field}
		type="text"
		bind:value={greeting.value}
	/></label
>
