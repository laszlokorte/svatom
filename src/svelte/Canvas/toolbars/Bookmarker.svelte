<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import { atom, view, read, update, combine } from "../../svatom.svelte.js";
    const {
        current = atom({}),
        entries = atom([]),
        selectedIndex = atom(""),
    } = $props();

    const currentLabel = atom("");
</script>

<fieldset>
    <legend>Bookmarks</legend>

    <div>
        <select
            style="width: 15em"
            size="5"
            bind:value={selectedIndex.value}
            onchange={(evt) => {
                if (evt.currentTarget.value) {
                    current.value =
                        entries.value[evt.currentTarget.value].value;
                }
            }}
        >
            {#each entries.value as e, i (i)}
                <option value={i}>{e.label}</option>
            {/each}
        </select>
        <br />
        <form
            disabled={R.isEmpty(currentLabel.value)}
            onsubmit={(evt) => {
                evt.preventDefault();
                update(
                    R.append({
                        value: current.value,
                        label: currentLabel.value,
                    }),
                    entries,
                );
                selectedIndex.value = entries.value.length - 1;
                currentLabel.value = "";
            }}
        >
            <button
                disabled={R.isEmpty(selectedIndex.value)}
                type="button"
                onclick={(evt) => {
                    update(R.remove(selectedIndex.value, 1), entries);
                    update(R.min(entries.value.length - 1), selectedIndex);
                }}>Delete</button
            >
            <input type="text" bind:value={currentLabel.value} />
            <button disabled={R.isEmpty(currentLabel.value)} type="submit"
                >Save</button
            >
        </form>
    </div>
</fieldset>
