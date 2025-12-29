<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import {
        atom,
        view,
        update,
        combine,
        failableView,
        bindValue,
    } from "./svatom.svelte.js";
    import Split from "./SplitView/Split.svelte";

    const {
        allLevels = atom([
            {
                id: "empty",
                name: "Empty",
                level: {
                    size: { x: 10, y: 10 },
                    start: { x: 5, y: 5 },
                    walls: Array(10 * 10).fill(false),
                    crystals: Array(10 * 10).fill(false),
                },
            },
            {
                id: "lvl1",
                name: "Level 1",
                level: {
                    size: { x: 10, y: 10 },
                    start: { x: 3, y: 4 },
                    walls: Array(10 * 10)
                        .fill(false)
                        .map((d, i) =>
                            i % 17 == 0 ? d : i % 19 == 2 ? true : d,
                        ),
                    crystals: Array(10 * 10)
                        .fill(false)
                        .map((d, i) => (i % 17 == 0 ? true : d)),
                },
            },
        ]),
        allCommands = atom([
            {
                level: "lvl1",
                commands: [
                    {
                        op: "turnLeft",
                        spaces: " ",
                        comment: "# Program starts here",
                        invalid: false,
                    },
                    { op: "turnRight", spaces: "" },
                    {
                        op: "turnAround",
                        spaces: "",
                        comment: "",
                        invalid: false,
                    },
                    { op: "forward", spaces: "" },
                    {
                        op: "forward",
                        spaces: " ",
                        comment: "# write comments",
                        invalid: false,
                    },
                    { op: "drop", spaces: "" },
                    { op: "turnAround", spaces: "" },
                    { op: "forward", spaces: "" },
                    { op: "forward", spaces: "" },
                    { op: "forward", spaces: "" },
                    { op: "drop", spaces: "" },
                    { op: "forward", spaces: "" },
                    { op: "pick", spaces: "" },
                ],
            },
        ]),
        world = atom({
            dirty: false,
            error: null,
            level: {
                size: { x: 0, y: 0 },
                walls: [],
                crystals: [],
            },
            player: {
                pos: { x: 0, y: 0 },
                dir: { x: 0, y: 0 },
            },
            program: {
                next: 0,
                commands: [],
            },
        }),
        level = atom({
            size: { x: 10, y: 10 },
            cells: Array(10 * 10)
                .fill(".")
                .map((d, i) => (i % 17 == 0 ? "*" : i % 19 == 2 ? "x" : d)),
        }),
        player = atom({
            pos: {
                x: 2,
                y: 3,
            },
            dir: {
                x: 1,
                y: 0,
            },
        }),
        program = atom({
            line: 0,
        }),
    } = $props();
    const resolution = 32;

    const levelKey = atom("empty");
    const commands = $derived(
        view(
            [
                L.choose(({ levelKey }) => [
                    "allCommands",
                    L.valueOr([]),
                    L.find(R.whereEq({ level: levelKey })),
                    L.valueOr({
                        level: levelKey,
                    }),
                    "commands",
                ]),
            ],
            combine({ allCommands, levelKey }),
        ),
    );
    const currentLevel = $derived(
        view(
            L.choose(({ levelKey }) => [
                "allLevels",
                L.valueOr([]),
                L.whereEq({ id: levelKey }),
                "level",
                L.valueOr({
                    size: { x: 10, y: 10 },
                    start: { x: 5, y: 5 },
                    walls: Array(10 * 10).fill(false),
                    crystals: Array(10 * 10).fill(false),
                }),
            ]),
            combine({ allLevels, levelKey }),
        ),
    );

    const command = L.iso(
        (cmd) =>
            cmd.invalid
                ? cmd.invalid
                : cmd.empty ||
                  `${cmd.op || ""}${cmd.spaces || ""}${cmd.comment || ""}`,
        R.pipe(
            R.match(
                /((?<op>[^\s#]+)(?<spaces>\s*)|(?<empty>\s*)|(?<invalid>[^#]+))(?<comment>#.*)?$/,
            ),
            R.prop("groups"),
        ),
    );
    const lines = $derived(
        view(
            [
                L.iso(
                    (array) => (array ? [...array, undefined] : [undefined]),
                    (array) =>
                        array.length == 0 ||
                        array[array.length - 1].empty == undefined ||
                        array[array.length - 1].empty != "" ||
                        array[array.length - 1].comment
                            ? array
                            : array.slice(0, -1),
                ),
                L.array([
                    L.defaults({
                        empty: "",
                    }),
                    command,
                ]),
            ],
            commands,
        ),
    );
    const text = $derived(view(L.inverse(L.split("\n")), lines));

    const lineCount = $derived(view("length", lines));
    const json = $derived(view(L.inverse(L.json({ space: "  " })), commands));
    const levelError = atom();
    const currentLevelText = $derived(
        failableView(
            [
                L.iso(
                    ({ size, walls, crystals, start }) =>
                        Array(size.y)
                            .fill(size.x)
                            .map((xs, y) =>
                                Array(xs)
                                    .fill(null)
                                    .map((_, x) => {
                                        if (start.x === x && start.y === y) {
                                            return "s";
                                        } else if (walls[y * xs + x]) {
                                            return "x";
                                        } else if (crystals[y * xs + x]) {
                                            return "*";
                                        } else {
                                            return ".";
                                        }
                                    })
                                    .join(""),
                            )
                            .join("\n"),

                    (text) => {
                        const lines = text.split("\n");
                        const maxWidth = lines.reduce(
                            (acc, l) => Math.max(acc, l.length),
                            0,
                        );
                        const minWidth = lines.reduce(
                            (acc, l) => Math.min(acc, l.length),
                            Infinity,
                        );
                        if (maxWidth !== minWidth) {
                            return new Error(
                                "invalid size " + maxWidth + ", " + minWidth,
                            );
                        }
                        const width = maxWidth;
                        const startIndex = text.indexOf("s");
                        if (startIndex < 0) {
                            return new Error("missing start position");
                        }
                        return {
                            size: { y: lines.length, x: width },
                            start: {
                                y: Math.floor(startIndex / (width + 1)),
                                x: startIndex % (width + 1),
                            },
                            walls: Array(lines.length * width)
                                .fill(false)
                                .map((def, i) => {
                                    const x = i % width;
                                    const y = Math.floor(i / width);

                                    return lines[y].slice(x, x + 1) === "x";
                                }),
                            crystals: Array(lines.length * width)
                                .fill(false)
                                .map((def, i) => {
                                    const x = i % width;
                                    const y = Math.floor(i / width);

                                    return lines[y].slice(x, x + 1) === "*";
                                }),
                        };
                    },
                ),
                L.setter((t, oldText) => {
                    const changedLine = Math.max(
                        0,
                        R.findIndex(
                            R.identity,
                            R.zipWith(
                                (a, b) => {
                                    return Math.abs(a.length - b.length) == 1;
                                },
                                t.split("\n"),
                                oldText.split("\n"),
                            ),
                        ),
                    );
                    const changedColumn = R.findIndex(
                        R.identity,
                        R.zipWith(
                            (a, b) => {
                                return a != b;
                            },
                            t.split("\n")[changedLine].split(""),
                            oldText.split("\n")[changedLine].split(""),
                        ),
                    );
                    const lines = t.split("\n");
                    const maxWidth =
                        changedColumn < 0
                            ? lines[changedLine].length
                            : oldText.split("\n")[0].length;
                    return lines
                        .map((l, _i, all) => {
                            return (
                                l + Array(maxWidth).fill(".").join("")
                            ).slice(0, maxWidth);
                        })
                        .join("\n");
                }),
            ],
            currentLevel,
            false,
            levelError,
        ),
    );
    function isOpValid(op) {
        return [
            "turnLeft",
            "turnRight",
            "turnAround",
            "forward",
            "pick",
            "drop",
            "checkWallAhead",
            "checkBeeperAhead",
            "checkBeeper",
        ].includes(op);
    }

    const viewBox = $derived(
        view(
            ({ size }) =>
                `-10 -10 ${size.x * resolution + 20} ${size.y * resolution + 20}`,
            level,
        ),
    );
    function runPlayerOp(op, player) {
        switch (op.op) {
            case "turnRight":
                return {
                    ...player,
                    dir: { x: -player.dir.y, y: player.dir.x },
                };
            case "turnLeft":
                return {
                    ...player,
                    dir: { x: player.dir.y, y: -player.dir.x },
                };
            case "turnAround":
                return {
                    ...player,
                    dir: { x: -player.dir.x, y: -player.dir.y },
                };
            case "forward":
                return {
                    ...player,
                    pos: {
                        x: player.pos.x + player.dir.x,
                        y: player.pos.y + player.dir.y,
                    },
                };
        }
        return player;
    }
    function runLevelOp(op, cell) {
        switch (op.op) {
            case "pick":
                return ".";
            case "drop":
                return "*";
        }
        return cell;
    }
    function runConrolOp(op, line) {
        return line + 1;
    }
    function runOp(op, level, player, line) {
        const newPlayer = runPlayerOp(op, player);
        if (newPlayer.pos.x >= level.size.x || newPlayer.pos.x < 0) {
            return { player, level, line };
        }
        if (newPlayer.pos.y >= level.size.y || newPlayer.pos.y < 0) {
            return { player, level, line };
        }
        if (
            level.cells[newPlayer.pos.x + newPlayer.pos.y * level.size.x] == "x"
        ) {
            return { player, level, line };
        }
        const newLevel = {
            ...level,
            cells: level.cells.map((c, i) =>
                i === newPlayer.pos.x + newPlayer.pos.y * level.size.x
                    ? runLevelOp(op, c)
                    : c,
            ),
            line: line,
        };
        return {
            player: newPlayer,
            level: newLevel,
            line: runConrolOp(op, line),
        };
    }
    function startExecution() {}
    function pauseExecution() {}
    function resetLine() {
        update(R.always({ line: 0 }), program);
        update(
            (player = { pos }) => ({
                ...player,
                pos: {
                    x: 2,
                    y: 3,
                },
                dir: {
                    x: 1,
                    y: 0,
                },
            }),
            player,
        );
    }
    function executeLine() {
        update(
            ({ program: { line }, player, commands, level }) => {
                if (line < commands.length) {
                    const result = runOp(commands[line], level, player, line);
                    return {
                        program: { ...program, line: result.line },
                        player: result.player,
                        level: result.level,
                    };
                } else {
                    return { program: { line: line }, player, level };
                }
            },
            combine(
                {
                    program,
                    player,
                    commands,
                    level,
                },
                { program: true, player: true, commands: false, level: true },
            ),
        );
    }
</script>

<label>
    Level: <select bind:value={levelKey.value}>
        {#each allLevels.value as l, li (l.id)}
            <option value={l.id} selected={levelKey.value === l.id}
                >{l.name}</option
            >
        {/each}
    </select>
</label>
<div
    style="display: grid; grid-template-columns: 1fr 1fr; border: 2px solid gray; border-bottom: none; box-sizing: border-box;"
>
    <div style="display: grid; grid-template-rows: 1fr auto;">
        <textarea
            style="font-family: monospace; align-self: stretch; resize: none; margin: 1ex; box-sizing: border-box; width: auto;
            white-space: pre;
              overflow-wrap: normal;
              overflow-x: auto;
            "
            use:bindValue={currentLevelText}
        ></textarea>
        <div
            style="background-color: #fee; align-items: center;gap: 1em;overflow: auto;"
            style:display={levelError.value ? "flex" : "none"}
        >
            <button
                onclick={() => {
                    update((t) => {
                        const lines = t.trim().split("\n");
                        const maxWidth = lines[0].length;
                        return lines
                            .map((l, _i, all) => {
                                return (
                                    l + Array(maxWidth).fill(".").join("")
                                ).slice(0, maxWidth);
                            })
                            .join("\n");
                    }, currentLevelText);
                }}>auto fix</button
            >

            {levelError.value}
        </div>
    </div>
    <pre
        style="overflow: auto; height: 10em; margin: 1ex; font-family: monospace;">{json.value}</pre>
</div>

<div class="robot-container">
    <Split
        content={atom([
            { size: 30, content: "x" },
            { size: 30, content: "y" },
        ])}
    >
        {#snippet children(i)}
            {#if i == 1}
                <div
                    style="display: grid; grid-template-rows: auto 1fr; background-color: #333;"
                >
                    <div class="toolbar">
                        <button type="button" onclick={executeLine}
                            >Execute ({program.value.line})</button
                        >
                        <button type="button" onclick={resetLine}
                            >Reset
                        </button>
                        <button type="button" onclick={startExecution}
                            >Play
                        </button>
                        <button type="button" onclick={pauseExecution}
                            >Pause
                        </button>
                    </div>
                    <div class="line-numbered">
                        <div class="line-numbers">
                            {#each { length: lineCount.value } as _, l (l)}
                                <span
                                    class={{
                                        "line-number": true,
                                        active: program.value.line == l,
                                    }}
                                >
                                    {l}
                                </span>
                            {/each}
                        </div>
                        <div class="overlay">
                            <div
                                class={{
                                    "overlay-layer": true,
                                    "overlay-annotations": true,
                                }}
                            >
                                {#each commands.value as l}
                                    <span
                                        class={{
                                            annotation: true,
                                            invalid:
                                                l.empty !== "" &&
                                                (!!l.invalid ||
                                                    !isOpValid(l.op)),
                                        }}
                                    >
                                        {#if l.empty !== undefined}
                                            <span class="empty"
                                                >{l.empty || " "}</span
                                            >
                                        {:else if l.invalid}<span
                                                class="invalid"
                                                >{l.invalid || " "}</span
                                            >
                                        {:else}
                                            <span
                                                class={{
                                                    "annotation-body": true,
                                                    empty: !!l.empty,
                                                    valid: isOpValid(l.op),
                                                }}>{l.op || " "}</span
                                            ><span class="spaces"
                                                >{l.spaces || ""}</span
                                            ><span class="comment"
                                                >{l.comment || ""}</span
                                            >
                                        {/if}
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
                </div>
            {:else}
                <div class="canvas-container">
                    <svg
                        class="canvas"
                        viewBox={viewBox.value}
                        preserveAspectRatio="xMidYMin meet"
                    >
                        {#each { length: level.value.size.y } as _, y}
                            {#each { length: level.value.size.x } as _, x}
                                {@const cell =
                                    level.value.cells[
                                        y * level.value.size.x + x
                                    ]}
                                <rect
                                    x={x * resolution}
                                    y={y * resolution}
                                    width={resolution}
                                    height={resolution}
                                    fill="#f0f0f0"
                                    stroke="#ccc"
                                    shape-rendering="geometricPrecision"
                                    vector-effect="non-scaling-stroke"
                                ></rect>
                            {/each}
                        {/each}
                        {#each { length: level.value.size.y } as _, y}
                            {#each { length: level.value.size.x } as _, x}
                                {@const cell =
                                    level.value.cells[
                                        y * level.value.size.x + x
                                    ]}
                                {#if cell === "*"}
                                    {@render diamond(x, y, resolution)}
                                {/if}
                                {#if cell === "x"}
                                    {@render wall(x, y, resolution)}
                                {/if}
                            {/each}
                        {/each}
                        {@render robot(
                            player.value.pos.x,
                            player.value.pos.y,
                            player.value.dir.x,
                            player.value.dir.y,
                            resolution,
                        )}
                        <rect
                            x={-3}
                            y={-3}
                            width={resolution * level.value.size.x + 6}
                            height={resolution * level.value.size.y + 6}
                            fill="none"
                            stroke-width="6"
                            stroke="#555"
                            shape-rendering="crispEdges"
                        ></rect>
                    </svg>
                </div>
            {/if}
        {/snippet}
    </Split>
    {#snippet robot(x, y, dx, dy, size)}
        <g
            transform="rotate({(Math.atan2(dy, dx) * 180) / Math.PI + 90} {x *
                size +
                size / 2} {y * size + size / 2})"
        >
            <rect
                x={x * size}
                y={y * size + (size * (1 - 1 / 1.9)) / 2}
                width={size}
                height={size / 1.9}
                fill="#3300ff"
                stroke-width="1"
                stroke="#110022"
                rx="10"
                ry="10"
                vector-effect="non-scaling-stroke"
            ></rect>
            <circle
                cx={x * size + size / 2}
                cy={y * size + size / 2}
                r={size / 1.6 / 2}
                fill="#aaaadd"
                stroke-width="2"
                stroke="#1100aa"
                rx="10"
                ry="10"
                vector-effect="non-scaling-stroke"
            ></circle>
            <polyline
                stroke="#000"
                fill="none"
                stroke-width="2"
                points="{size * x + size / 2 - size / 6} {size * y +
                    size / 2 +
                    size / 20}
                {size * x + size / 2} {size * y +
                    size / 2 -
                    size / 6 +
                    size / 20}
                    {size * x + size / 2 + size / 6} {size * y +
                    size / 2 +
                    size / 20}"
            ></polyline>
            <circle
                fill="white"
                r="2.5"
                stroke-width="1.5"
                stroke="#3300ff"
                cx={size * x + size / 2 - size / 7}
                cy={size * y + size / 2 - size / 4}
            ></circle>
            <circle
                fill="white"
                r="2.5"
                stroke-width="1.5"
                stroke="#3300ff"
                cx={size * x + size / 2 + size / 7}
                cy={size * y + size / 2 - size / 4}
            ></circle>
        </g>
    {/snippet}

    {#snippet wall(x, y, size)}
        <rect
            x={x * size}
            y={y * size}
            width={size}
            height={size}
            fill="#555"
            stroke-width="0"
            shape-rendering="crispEdges"
        ></rect>
    {/snippet}
    {#snippet diamond(x, y, size)}
        <polygon
            fill="#48f273"
            points="{size * x + size / 2} {size * y + size / 2} {size *
                x} {size * y + size / 2} {size * x + size / 2} {size * y} "
        ></polygon>
        <polygon
            fill="#28a233"
            points="{size * x + size / 2} {size * y + size / 2} {size * x +
                size} {size * y + size / 2} {size * x + size / 2} {size * y} "
        ></polygon>
        <polygon
            fill="#28b233"
            points="{size * x + size / 2} {size * y + size / 2} {size *
                x} {size * y + size / 2} {size * x + size / 2} {size * y +
                size} "
        ></polygon>
        <polygon
            fill="#285233"
            points="{size * x + size / 2} {size * y + size / 2} {size * x +
                size} {size * y + size / 2} {size * x + size / 2} {size * y +
                size} "
        ></polygon>
        <polygon
            stroke-linejoin="round"
            stroke-linecap="round"
            stroke="#285233"
            fill="none"
            points="{size * x + size / 2} {size * y}
            {size * x + size} {size * y + size / 2}
            {size * x + size / 2} {size * y + size}
            {size * x} {size * y + size / 2}

            "
        ></polygon>
    {/snippet}
</div>

<style>
    .toolbar {
        display: flex;
        gap: 1ex;
        padding: 0.5ex;
        background-color: #333;
        border-bottom: 2px solid #fff;
        font-family: monospace;
    }
    button {
        font: inherit;
        padding: 1ex;
        margin: 0;
    }
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
        padding: 1px 0;
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
        white-space: pre;
    }

    .line-numbers {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }

    .line-number {
        text-align: right;
        min-width: 2em;
        padding-right: 1ex;
        color: #aaa;
    }
    .line-number.active {
        background: aquamarine;
        color: #000;
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
        border: 4px solid transparent;
    }
    .line-numbered:has(:focus-visible) {
        border-color: orangered;
    }

    .robot-container {
        display: block;
        resize: vertical;
        height: 30em;
        width: 100%;
        overflow: auto;
        border: 2px solid gray;
        box-sizing: border-box;
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
    .comment {
        background-color: gray;
    }
    .comment:not(:empty) {
        border-radius: 4px;
        padding: 2px;
    }
    .invalid {
        background-color: #500;
    }
</style>
