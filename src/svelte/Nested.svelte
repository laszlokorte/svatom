<script>
    let { greeting, onkeydown } = $props();

    let field = $state();

    export function focus() {
        field.focus();
    }
</script>

<label class="simple-form-field"
    ><span class="simple-form-field-label">Greeting:</span>
    <input
        {onkeydown}
        class="simple-form-field-input"
        bind:this={field}
        type="text"
        bind:value={greeting.value}
    /></label
>
