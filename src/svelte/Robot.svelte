<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import { atom, view, bindValue } from "./svatom.svelte.js";
    import Split from "./SplitView/Split.svelte";
    const {
        lines = atom([
            "forward",
            "drop",
            "turnLeft",
            "pick",
            "mstake",
            "",
            "",
            "",
        ]),
    } = $props();

    const text = $derived(view(L.inverse(L.split("\n")), lines));

    const lineCount = $derived(view("length", lines));
    function isValidCommand(cmd) {
        return [
            "turnLeft",
            "turnRight",
            "forward",
            "turnAround",
            "drop",
            "pick",
        ].includes(cmd);
    }
</script>

<div class="robot-container">
    <Split
        content={atom([
            { size: 30, content: "x" },
            { size: 30, content: "y" },
        ])}
    >
        {#snippet children(i)}
            {#if i == 1}
                <div class="line-numbered">
                    <div class="line-numbers">
                        {#each { length: lineCount.value } as _, l (l)}
                            <span class="line-number">{l}</span>
                        {/each}
                    </div>
                    <div class="overlay">
                        <div
                            class={{
                                "overlay-layer": true,
                                "overlay-annotations": true,
                            }}
                        >
                            {#each lines.value as l}
                                <span class="annotation">
                                    <span
                                        class={{
                                            "annotation-body": true,
                                            empty: l === "",
                                            valid: isValidCommand(l),
                                        }}>{l || " "}</span
                                    >
                                </span>
                            {/each}
                        </div>
                        <textarea
                            cols="0"
                            rows="0"
                            use:bindValue={text}
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            class={{
                                "overlay-layer": true,
                                "overlay-input": true,
                            }}
                        ></textarea>
                    </div>
                </div>
            {:else}
                <div class="canvas-container">
                    <svg
                        class="canvas"
                        viewBox="-100 -100 200 200"
                        preserveAspectRatio="meet xMidYMid"
                    >
                        <rect
                            x="-80"
                            y="-80"
                            width="160"
                            height="160"
                            fill="lightgrey"
                        ></rect>
                        <rect
                            x="-10"
                            y="-10"
                            width="20"
                            height="20"
                            fill="darkblue"
                        ></rect>
                    </svg>
                </div>
            {/if}
        {/snippet}
    </Split>
</div>

<style>
    .overlay {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        justify-content: stretch;
        align-content: stretch;
        overflow: auto;
    }

    .overlay-layer {
        grid-area: 1 / 1 / -1 / -1;
        resize: none;
    }

    .overlay-annotations {
        z-index: 10;
        display: flex;
        flex-direction: column;
        white-space: pre;
    }
    .annotation {
        background-color: #fff3;
        color: transparent;
    }

    .annotation-body:not(.empty) {
        background-color: red;
        padding: 1px 5px 1px 3px;
        border-radius: 3px;
    }
    .annotation-body.valid {
        background-color: green;
    }

    .overlay-input {
        z-index: 20;
        font: inherit;
        padding: 0;
        border: none;
        margin: 0;
        outline: none;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        max-width: none;
        max-height: none;
        background-color: transparent;
        color: inherit;
        padding-left: 3px;
    }

    .line-numbers {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }

    .line-number {
        text-align: right;
        min-width: 2em;
        color: #aaa;
    }

    .line-numbered {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1ex;
        font-family: monospace;
        font-size: 1.2em;
        background-color: #333;
        color: #fff;
        padding: 1ex;
        line-height: 1.5;
    }
    .line-numbered:has(:focus-visible) {
        outline: 4px solid orangered;
    }

    .robot-container {
        display: block;
        resize: vertical;
        height: 30em;
        width: 100%;
        overflow: auto;
        border: 2px solid gray;
    }
    .canvas-container {
        position: relative;
        width: 100%;
        height: 100%;
    }
    .canvas {
        height: 100%;
        width: 100%;
        display: block;
        position: absolute;
    }
</style>
