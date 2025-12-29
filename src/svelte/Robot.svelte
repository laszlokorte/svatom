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
                        op: "checkWallAhead",
                        spaces: "",
                    },
                    {
                        op: "turnLeft",
                        spaces: " ",
                        comment: "# Program starts here",
                    },
                    {
                        op: "turnRight",
                        spaces: "",
                    },
                    {
                        op: "turnAround",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: " ",
                        comment: "# write comments",
                    },
                    {
                        op: "drop",
                        spaces: "",
                    },
                    {
                        op: "turnAround",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "drop",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "drop",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "turnLeft",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "turnLeft",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "pick",
                        spaces: "",
                    },
                    {
                        empty: "",
                    },
                    {
                        empty: "",
                    },
                    {
                        empty: "",
                    },
                    {
                        empty: "",
                    },
                    {
                        empty: "",
                    },
                ],
            },
            {
                level: "empty",
                commands: [
                    {
                        op: "turnAround",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "forward",
                        spaces: "",
                    },
                    {
                        op: "checkWallAhead",
                        spaces: "",
                    },
                    {
                        op: "jump",
                        spaces: "",
                    },
                ],
            },
        ]),
        world = atom({
            dirty: false,
            started: false,
            running: false,
            error: null,
            level: {
                size: { x: 10, y: 10 },
                start: { x: 5, y: 5 },
                walls: Array(10 * 10).fill(false),
                crystals: Array(10 * 10).fill(false),
            },
            player: {
                pos: { x: 0, y: 0 },
                dir: { x: 0, y: 1 },
            },
            choice: null,
            program: {
                next: 0,
                commands: [],
            },
        }),
    } = $props();
    const resolution = 32;

    const levelKey = atom("lvl1");
    const currentCommands = $derived(
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
                    L.valueOr([]),
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
                ? `${cmd.invalid}${cmd.comment || ""}`
                : cmd.empty
                  ? `${cmd.empty}${cmd.comment || ""}`
                  : `${cmd.op || ""}${cmd.spaces || ""}${cmd.comment || ""}`,
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
            currentCommands,
        ),
    );
    const text = $derived(view(L.inverse(L.split("\n")), lines));
    const level = $derived(view("level", world));
    const player = $derived(view("player", world));
    const choice = $derived(view("choice", world));
    const program = $derived(view("program", world));
    const running = $derived(view("running", world));
    const started = $derived(view("started", world));
    const currentChoiceYesNo = $derived(
        view(
            [
                "choice",
                L.lens(
                    (r) => (r ? "yes" : "no"),
                    (r) => r === "yes",
                ),
            ],
            world,
        ),
    );
    const executionError = $derived(view("error", world));
    const executionErrorLine = $derived(view("command", executionError));
    const executionErrorMessage = $derived(view("message", executionError));
    const executionErrorPosition = $derived(view("location", executionError));

    function reloadLevel() {
        const lvl = currentLevel.value;
        const cmds = currentCommands.value;
        update((w) => {
            return {
                ...w,
                dirty: false,
                running: false,
                started: false,
                error: null,
                program: {
                    next: 0,
                    commands: cmds,
                },
                level: {
                    size: lvl.size,
                    crystals: lvl.crystals,
                    walls: lvl.walls,
                },
                player: {
                    pos: {
                        x: lvl.start.x,
                        y: lvl.start.y,
                    },
                    dir: { x: 1, y: 0 },
                },
                choice: null,
            };
        }, world);
    }

    reloadLevel();
    const lineCount = $derived(view("length", lines));
    const json = $derived(
        view(L.inverse(L.json({ space: "  " })), currentCommands),
    );
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
            "jump",
            "halt",
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
                    player: {
                        ...player,
                        dir: { x: -player.dir.y, y: player.dir.x },
                    },
                };
            case "turnLeft":
                return {
                    player: {
                        ...player,
                        dir: { x: player.dir.y, y: -player.dir.x },
                    },
                };
            case "turnAround":
                return {
                    player: {
                        ...player,
                        dir: { x: -player.dir.x, y: -player.dir.y },
                    },
                };
            case "forward":
                return {
                    player: {
                        ...player,
                        pos: {
                            x: player.pos.x + player.dir.x,
                            y: player.pos.y + player.dir.y,
                        },
                    },
                };
        }
        return { player: player };
    }
    function runLevelOp(op, cell) {
        switch (op.op) {
            case "pick":
                if (!cell) {
                    return { error: "There is no crystal to pick" };
                }
                return { newCell: false };
            case "drop":
                if (cell) {
                    return { error: "There is is already a crystal" };
                }
                return { newCell: true };
        }
        return { newCell: cell };
    }

    function runChoiceOp(op, player, level) {
        switch (op.op) {
            case "checkWallAhead": {
                const frontPos = {
                    x: player.pos.x + player.dir.x,
                    y: player.pos.y + player.dir.y,
                };
                return (
                    frontPos.y == -1 ||
                    frontPos.y == level.size.y ||
                    frontPos.x == -1 ||
                    frontPos.x == level.size.x ||
                    level.walls[frontPos.x + frontPos.y * level.size.x] === true
                );
            }
            case "checkBeeperAhead": {
                const frontPos = {
                    x: player.pos.x + player.dir.x,
                    y: player.pos.y + player.dir.y,
                };
                if (
                    frontPos.y == -1 ||
                    frontPos.y == level.size.y ||
                    frontPos.x == -1 ||
                    frontPos.x == level.size.x
                ) {
                    return false;
                }
                return;
                level.crystals[frontPos.x + frontPos.y * level.size.x] === true;
            }
            case "checkBeeper":
                return (
                    level.crystals[
                        player.pos.x + player.pos.y * level.size.x
                    ] === true
                );
        }
        return null;
    }
    function runConrolOp(op, line, choice) {
        switch (op.op) {
            case "halt":
                return { line };
            case "jump":
                if (choice === true) {
                    return {
                        line: 0,
                    };
                } else {
                    return { line: line + 1 };
                }
        }
        if (choice !== null) {
            return { error: "Must jump after check" };
        }
        return {
            line: line + 1,
        };
    }
    function runOp(op, level, player, line, choice) {
        const newPlayerResult = runPlayerOp(op, player);
        if (newPlayerResult.player) {
            const newPlayer = newPlayerResult.player;

            if (newPlayer.pos.x >= level.size.x || newPlayer.pos.x < 0) {
                return { error: "Player hit a wall" };
            }
            if (newPlayer.pos.y >= level.size.y || newPlayer.pos.y < 0) {
                return { error: "Player hit a wall" };
            }
            if (level.walls[newPlayer.pos.x + newPlayer.pos.y * level.size.x]) {
                return { error: "Player hit a wall" };
            }

            const newLevel = {
                ...level,
                crystals: level.crystals.reduce((acc, c, i) => {
                    if (acc.error) {
                        return acc;
                    }
                    if (
                        i ===
                        newPlayer.pos.x + newPlayer.pos.y * level.size.x
                    ) {
                        const result = runLevelOp(op, c);
                        if (result.error) {
                            return result;
                        }

                        return [result.newCell, ...acc];
                    } else {
                        return [c, ...acc];
                    }
                }, []),
                next: line,
            };
            if (newLevel.crystals.error) {
                return { error: newLevel.crystals.error };
            }

            const nextControl = runConrolOp(op, line, choice);

            if (nextControl.error) {
                return { error: nextControl.error };
            }
            return {
                player: newPlayer,
                choice: runChoiceOp(op, player, level),
                level: {
                    ...level,
                    crystals: newLevel.crystals.reverse(),
                },
                next: nextControl.line,
            };
        } else {
            console.log(newPlayerResult);
            return { error: newPlayerResult.error };
        }
    }
    function startExecution() {}
    function pauseExecution() {}
    function resetLine() {
        update(R.always({ next: 0 }), program);
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
            ({ program: { next }, player, commands, level, choice }) => {
                if (next < commands.length) {
                    const result = runOp(
                        commands[next],
                        level,
                        player,
                        next,
                        choice,
                    );
                    if (result.error) {
                        return {
                            error: {
                                message: result.error,
                                command: next,
                                location: player,
                            },
                            program: { next },
                            player: player,
                            level: level,
                            running: false,
                            started: true,
                        };
                    } else {
                        return {
                            program: { next: result.next },
                            player: result.player,
                            level: result.level,
                            choice: result.choice,
                            error: null,
                            running: true,
                            started: true,
                        };
                    }
                } else {
                    return {
                        program: { next: commands.length },
                        player,
                        level,
                        choice,
                        error: null,
                        running: false,
                        started: true,
                    };
                }
            },
            combine(
                {
                    program,
                    player,
                    choice,
                    commands: currentCommands,
                    level,
                    error: executionError,
                    running: running,
                    started: started,
                },
                {
                    program: true,
                    player: true,
                    choice: true,
                    commands: false,
                    level: true,
                    error: true,
                    running: true,
                    started: true,
                },
            ),
        );
    }
</script>

<label>
    Level: <select
        bind:value={levelKey.value}
        onchange={(evt) => reloadLevel()}
    >
        {#each allLevels.value as l, li (l.id)}
            <option value={l.id} selected={levelKey.value === l.id}
                >{l.name}</option
            >
        {/each}
    </select>
    <button
        onclick={(evt) => {
            reloadLevel();
        }}>Reload</button
    >
</label>
<div
    style="display: grid; grid-template-columns: 1fr 1fr; border: 2px solid gray; border-bottom: none; box-sizing: border-box;"
>
    <div style="display: grid; grid-template-rows: 1fr auto;">
        <textarea
            style="font-family: monospace; align-self: stretch; resize: none; margin: 1ex; box-sizing: border-box; width: auto;
            white-space: pre;
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
                    style="display: grid; grid-template-rows: auto 1fr; background-color: #333; max-height: 100%; align-self: stretch; overflow-y: auto;"
                >
                    <div class="toolbar">
                        <button type="button" onclick={reloadLevel}
                            >Reset
                        </button>
                        <button
                            type="button"
                            onclick={executeLine}
                            disabled={!currentCommands.value.length ||
                                executionError.value}
                            >Execute ({program.value.next})</button
                        >
                        <button
                            type="button"
                            disabled={!currentCommands.value.length ||
                                executionError.value}
                            onclick={startExecution}
                            >Play
                        </button>
                        <button
                            type="button"
                            disabled={!currentCommands.value.length ||
                                executionError.value}
                            onclick={pauseExecution}
                            >Pause
                        </button>
                    </div>
                    <div
                        class={{
                            "line-numbered": true,
                            disabled: started.value,
                        }}
                    >
                        <div class="line-numbers">
                            {#each { length: lineCount.value } as _, l (l)}
                                <span
                                    class={{
                                        "line-number": true,
                                        active: program.value.next == l,
                                        error: executionErrorLine.value == l,
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
                                {#each currentCommands.value as l}
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
                                            <span class="empty">{l.empty}</span
                                            ><span class="comment"
                                                >{l.comment}</span
                                            ><span>{" "}</span>
                                        {:else if l.invalid}<span
                                                class="invalid"
                                                >{l.invalid || " "}</span
                                            ><span class="comment"
                                                >{l.comment || ""}</span
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
                                            ><span>{" "}</span>
                                        {/if}
                                    </span>
                                {/each}
                            </div>
                            <div
                                style="z-index: 100; pointer-events: none;"
                                class={{
                                    "overlay-layer": true,
                                    "overlay-annotations": true,
                                    "annoatation-right": true,
                                }}
                            >
                                {#each currentCommands.value as l, li}
                                    <span
                                        style="background: none;"
                                        class={{
                                            annotation: true,
                                        }}
                                    >
                                        {#if l.empty !== undefined}
                                            <span>{" "}</span>
                                        {:else if l.invalid}
                                            <span class="inlay error"
                                                >Invalid syntax</span
                                            >
                                        {:else}<span>{" "}</span>
                                            {#if !isOpValid(l.op)}
                                                <span class="inlay error"
                                                    >{"unknown command"}</span
                                                >
                                            {/if}
                                            {#if executionErrorLine.value === li}
                                                <span class="inlay error"
                                                    >{executionErrorMessage.value}</span
                                                >
                                            {/if}
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
                                readonly={started.value}
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
                                {@const isWall =
                                    level.value.walls[
                                        y * level.value.size.x + x
                                    ]}
                                {@const isCrystal =
                                    level.value.crystals[
                                        y * level.value.size.x + x
                                    ]}
                                {#if isCrystal}
                                    {@render diamond(x, y, resolution)}
                                {/if}
                                {#if isWall}
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
                            choice.value,
                        )}
                        {#if executionErrorPosition.value}
                            {@render error(
                                executionErrorPosition.value.pos.x,
                                executionErrorPosition.value.pos.y,
                                resolution,
                            )}
                        {/if}
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
    {#snippet robot(x, y, dx, dy, size, choice)}
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
                class={{
                    "choice-yes": choice === true,
                    "choice-no": choice === false,
                }}
                r="2.5"
                stroke-width="1.5"
                stroke="#3300ff"
                cx={size * x + size / 2 - size / 7}
                cy={size * y + size / 2 - size / 4}
            ></circle>
            <circle
                fill="white"
                class={{
                    "choice-yes": choice === true,
                    "choice-no": choice === false,
                }}
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
    {#snippet error(x, y, size)}
        <polygon
            stroke-linejoin="round"
            stroke-linecap="round"
            stroke="red"
            stroke-widht="3"
            fill-opacity="0.8"
            fill="#aa0000"
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

        padding: 1ex;
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
        display: inline;
        background-color: #fff3;
        position: relative;
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
        position: sticky;
        left: 0;
        background-color: inherit;
        z-index: 100;
        padding: 1ex;
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

    .line-number.error {
        background: palevioletred;
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
        line-height: 1.5;
        border: 4px solid transparent;
        position: relative;
        overflow: auto;
    }
    .line-numbered:not(.disabled):has(:focus-visible) {
        border-color: orangered;
    }
    .line-numbered.disabled:has(:focus-visible) {
        border-color: gray;
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
    .inlay {
        z-index: 100;
        color: #ffeeee;
        background-color: #550000;
        padding: 0.2ex 1ex;
        border: none;
        font-size: 0.8em;
        font-style: italic;
        vertical-align: middle;
        margin-left: auto;
        margin-right: 0.5ex;
    }
    .inlay.error::before {
        content: "! ";
    }
    .annoatation-right {
        text-align: right;
    }

    .choice-no {
        fill: red;
    }
    .choice-yes {
        fill: green;
    }
</style>
