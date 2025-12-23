<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import {
        atom,
        view,
        read,
        combine,
        combineWithRest,
        failableView,
        bindValue,
        bindScroll,
        bindScrollMax,
        bindSize,
        string,
    } from "./svatom.svelte.js";
    import Nested from "./Nested.svelte";
    import Table from "./Table.svelte";
    import Scroller from "./Scroller.svelte";
    import SplashScreen from "./SplashScreen.svelte";
    import Canvas from "./Canvas/Root.svelte";
    import Split from "./SplitView/Split.svelte";
    import ThreeDee from "./ThreeDee.svelte";
    import Robot from "./Robot.svelte";
    import ThreeDeeFresh from "./ThreeDeeFresh.svelte";
    import RenewImport from "./Renew/Import.svelte";
    import asciiLogo from "../data/asciiLogo.txt?raw";
    import { clamp, lerp } from "./utils.js";
    import favicon from "/favicon.svg";

    const numberFormat = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // Atoms
    const summingValues = atom([10, 10, 10]);
    const summingValuesSum = $derived(
        view(
            L.lens(R.sum, (n, o) => {
                const factor = n / R.sum(o);
                return R.map(R.multiply(factor), o);
            }),
            summingValues,
        ),
    );
    const textScroller = atom({ x: 0, y: 0 });
    const textScrollerMax = atom({ x: 0, y: 0 });
    const textScrollerY = $derived(
        view(
            ["y", L.normalize((x) => parseInt(x, 10)), L.normalize(Math.round)],
            textScroller,
        ),
    );
    const textScrollerX = $derived(
        view(
            ["x", L.normalize((x) => parseInt(x, 10)), L.normalize(Math.round)],
            textScroller,
        ),
    );
    const inputFields = atom([]);
    const size = atom(15);
    const allNamesInternal = atom([{ name: "Laszlo" }]);
    const allNames = $derived(view(L.define([]), allNamesInternal));
    const wins = atom({ x: 100, y: 100 });
    const theNumber = atom(2);
    const settings = atom({ local: "de" });
    const translation = atom({
        de: {
            greeting: "Hallo",
        },
        en: {
            greeting: "hello",
        },
        es: {
            greeting: "Hola",
        },
    });

    // Predefined Lenses
    const numeric = L.lens(
        (x) => x,
        (v, old) => (isNaN(parseInt(v, 10)) ? old : parseInt(v, 10)),
    );

    const summingLens = (i, forceSum = null) =>
        L.lens(
            (a) => a[i],
            (n, o) => {
                const sum = R.isNil(forceSum) ? R.sum(o) : forceSum;
                const remaining = sum - n;
                const denom = sum - (o[i] || 0);
                const shrink = denom
                    ? R.multiply(remaining / denom)
                    : R.always(remaining / (o.length - 1));

                return [
                    ...o.slice(0, i).map(shrink),
                    n,
                    ...o.slice(i + 1).map(shrink),
                ];
            },
        );

    const indexedName = (i) => [i, L.removable("name"), "name", L.defaults("")];
    const doubleNumber = L.lens(
        (x) => x * 2,
        (x, a) => (a * 2 > x ? Math.floor(x / 2) : Math.ceil(x / 2)),
    );

    // Views into the Atom
    const clampedSize = $derived(view(L.normalize(R.clamp(10, 30)), size));
    const fontSize = $derived(string`font-size: ${clampedSize}px`);
    const count = $derived(view("length", allNames));
    const newName = $derived(
        view(
            [L.appendTo, L.removable("name"), "name", L.defaults("")],
            allNames,
        ),
    );
    const peopleJson = $derived(
        failableView(L.inverse(L.json({ space: "  " })), allNames, false),
    );

    const theNumberClamped = $derived(
        view([L.normalize(R.clamp(0, 200)), numeric], theNumber),
    );
    const theNumberDoubled = $derived(view(doubleNumber, theNumberClamped));

    const allLangs = $derived(
        read(L.foldTraversalLens(L.collect, L.keys), translation),
    );
    const allLangsCount = $derived(read("length", allLangs));
    const lang = $derived(view("local", settings));
    const langAndTranslation = combineWithRest({
        lang: view("local", settings),
        translation,
    });

    const currentTranslation = $derived(
        view(
            [
                L.choose((x) => {
                    return ["translation", L.prop(x.lang || "de")];
                }),
            ],
            langAndTranslation,
        ),
    );

    const langAndTransJson = $derived(
        failableView(L.inverse(L.json({ space: "  " })), langAndTranslation),
    );

    const currentGreeting = $derived(
        view(["greeting", L.defaults("")], currentTranslation),
    );
    const yourName = $derived(
        view(["name", L.removable(), L.defaults("")], settings),
    );

    const ascii = atom(asciiLogo);

    const scrollerState = atom({
        pos: { x: 0, y: 0 },
        window: { x: 0, y: 0 },
        content: { x: 2000, y: 4000 },
        extraPadding: true,
    });
    const scrollerPosition = $derived(view("pos", scrollerState));
    const rawScrollPos = $derived(view("rawPos", scrollerState));
    const browserChromeOverscroll = $derived(
        view(["overscroll", L.define({ x: 0, y: 0 })], scrollerState),
    );
    const scrollerDebug = $derived(
        view(["debug", L.defaults(true)], scrollerState),
    );
    const scrollerWindow = $derived(view("window", scrollerState));
    const extraScrollPadding = $derived(view("extraPadding", scrollerState));
    const scrollerSize = $derived(view("content", scrollerState));
    const scrollerSizeX = $derived(view("x", scrollerSize));
    const scrollerSizeY = $derived(view("y", scrollerSize));
    const scrollerPositionX = $derived(view("x", scrollerPosition));
    const scrollerPositionY = $derived(view("y", scrollerPosition));

    const scrollerPositionXClamped = $derived(
        read(
            ({ v, max, w }) => R.clamp(0, Math.max(0, max - w.x), v),
            combine({
                v: scrollerPositionX,
                max: scrollerSizeX,
                w: scrollerWindow,
            }),
        ),
    );
    const scrollerPositionYClamped = $derived(
        read(
            ({ v, max, w }) => R.clamp(0, Math.max(0, max - w.y), v),
            combine({
                v: scrollerPositionY,
                max: scrollerSizeY,
                w: scrollerWindow,
            }),
        ),
    );

    const scrollerPositionXClampedSoft = $derived(
        read(
            ({ v, max, w }) =>
                lerp(R.clamp(0, Math.max(0, max - w.x), v), v, 0.8),
            combine({
                v: scrollerPositionX,
                max: scrollerSizeX,
                w: scrollerWindow,
            }),
        ),
    );
    const scrollerPositionYClampedSoft = $derived(
        read(
            [
                ({ v, max, w }) =>
                    lerp(R.clamp(0, Math.max(0, max - w.y), v), v, 0.8),
            ],
            combine({
                v: scrollerPositionY,
                max: scrollerSizeY,
                w: scrollerWindow,
            }),
        ),
    );

    const bgOffsetX = $derived(view([R.negate], scrollerPositionXClampedSoft));
    const bgOffsetY = $derived(view([R.negate], scrollerPositionYClampedSoft));

    const scrollerOutside = $derived(
        read(
            ({ x, y, xc, yc, win }) =>
                Math.pow(
                    Math.min(
                        2,
                        Math.hypot(
                            Math.abs(x - xc) / (win.x || 1),
                            Math.abs(y - yc) / (win.y || 1),
                        ),
                    ) / 1.4,
                    1,
                ),
            combine({
                x: scrollerPositionX,
                y: scrollerPositionY,
                xc: scrollerPositionXClamped,
                yc: scrollerPositionYClamped,
                win: scrollerWindow,
            }),
        ),
    );

    const browserChromeOverscrollSum = $derived(
        view(({ x, y }) => Math.hypot(x, y) / 100, browserChromeOverscroll),
    );

    const formatedGreeting = $derived(
        string`${read(["greeting", L.valueOr("Hi")], currentTranslation)}${read(
            [
                "name",
                L.inverse(L.dropPrefix(" ")),
                L.inverse(L.dropSuffix("!")),
                L.valueOr(", whats your name?"),
            ],
            settings,
        )}`,
    );
</script>

<SplashScreen icon={favicon} color="#fef0f0" />

<section>
    <h1>
        <img
            src={favicon}
            style="width: 1.2em; vertical-align: text-top; margin: 0 0.3em 0 0; display: inline-block;"
            alt=""
        />Svatom
    </h1>

    <p>
        This is an experiment to apply the <a
            href="https://github.com/calmm-js/documentation/blob/master/introduction-to-calmm.md"
            target="_blank">CalmmJs</a
        >
        architecture to
        <a href="https://svelte.dev/" target="_blank">Svelte (version 5)</a>.
    </p>
    <p>
        The core idea is to compose <a
            href="https://github.com/calmm-js/partial.lenses">lenses</a
        > to construct a bidirectional data flow between UI components.
    </p>

    <p>
        All the interactive elements below are connected to each other in
        various interesting ways that you might find cumbersome to achieve using
        popular state management solutions like <code>useState</code>,
        <code>RxJS</code>, <code>Flux</code> or <code>Redux</code>. For each
        component observe the detailed behavior and think about how you would
        replicate the exact behavior in your favourite JavaScript frontend
        toolkit.
    </p>

    <hr />

    <p>
        Size: {clampedSize.value} (clamped to 10&lt;v&lt;30)<br />
        CSS: {fontSize.value}<br />
        <label class="number-picker"
            ><span class="number-picker-label">Slider A:</span>
            <input
                type="range"
                class="number-picker-slider"
                bind:value={size.value}
                min="5"
                max="50"
                style:--accent-color={clampedSize.value != size.value
                    ? "#c00"
                    : "unset"}
                style:--track-color={clampedSize.value != size.value
                    ? "#a00"
                    : "unset"}
            />

            <output class="number-picker-value ro">({size.value})</output>

            <span class="number-picker-help"
                >This slider can move outside the range</span
            >
        </label>
        <label class="number-picker"
            ><span class="number-picker-label">Slider B:</span>
            <input
                type="range"
                class="number-picker-slider"
                use:bindValue={clampedSize}
                min="5"
                max="50"
            />

            <output class="number-picker-value ro">({clampedSize.value})</output
            >

            <span class="number-picker-help"
                >This slider is forced into the range</span
            >
        </label>
    </p>

    <h3>Language</h3>

    <h4>
        {formatedGreeting.value}
    </h4>

    <div class="simple-form">
        <label class="simple-form-field"
            ><span class="simple-form-field-label">Your Name:</span>
            <input
                class="simple-form-field-input"
                type="text"
                placeholder=" "
                bind:value={yourName.value}
            /></label
        >
        <label class="simple-form-field"
            ><span class="simple-form-field-label">Your language:</span>
            <select class="simple-form-field-input" bind:value={lang.value}>
                {#each { length: allLangsCount.value }, l}
                    {@const lang = view(l, allLangs)}
                    <option value={lang.value}>{lang.value}</option>
                    }
                {/each}
            </select></label
        >

        <label class="simple-form-field"
            ><span class="simple-form-field-label">Preferred Greeting:</span>
            <input
                class="simple-form-field-input"
                type="text"
                placeholder=" "
                bind:value={currentGreeting.value}
            /></label
        >
    </div>
    <p>
        The left field is editable and permits invalid JSON (but reports an
        error). The center field is read-only, the right field is editable but
        only permits valid JSON.
    </p>

    <p>
        If the left field has encountered an parse error, it resets
        automatically as soon as the backing data changes. Try to introduce an
        error and then edit the form above or the JSON in the right-most field.
    </p>

    <div class="beside">
        <textarea
            class={[{ "has-error": langAndTransJson.hasError }]}
            bind:value={langAndTransJson.value}
        ></textarea>
        <pre>{langAndTransJson.stableValue}</pre>
        <textarea use:bindValue={langAndTransJson.stableAtom}></textarea>
    </div>
    <div class="error-message" hidden={!langAndTransJson.hasError}>
        <button type="button" onclick={langAndTransJson.reset}>Reset</button>
        {langAndTransJson.error}
    </div>

    <h3>People ({count.value})</h3>

    <p>
        People with empty names get removed. If the Greeting is exactly
        <em>Hello</em>, it is not stored.
    </p>

    <div class="controls">
        <button
            type="button"
            onclick={(evt) => {
                newName.value = "New";
            }}
        >
            Add Person
        </button>
        <button
            style:--button-color="#a00"
            type="button"
            onclick={(evt) => {
                allNames.value = [];
            }}
        >
            Remove all
        </button>
    </div>

    <ul
        style="display: grid; grid-template-columns: auto repeat(2, auto 1fr); align-items: baseline;"
    >
        {#each { length: count.value + 1 }, i (i)}
            {@const thisEntry = view(i, allNames)}
            {@const thisInputName = view([i, "name"], inputFields)}
            {@const prevInputName = view(
                [(i - 1 + count.value) % count.value, "name"],
                inputFields,
            )}
            {@const nextInputName = view([i + 1, "name"], inputFields)}
            {@const thisInputGreet = view([i, "greet"], inputFields)}
            {@const prevInputGreet = view(
                [(i - 1 + count.value) % count.value, "greet"],
                inputFields,
            )}
            {@const nextInputGreet = view([i + 1, "greet"], inputFields)}
            {@const thisName = view(indexedName(i), allNames)}
            {@const thisGreeting = view(
                [i, "greeting", L.defaults("Hello")],
                allNames,
            )}
            <li style="display: contents;">
                <button
                    class={[
                        "simple-form-button",
                        { phantom: !thisEntry.value },
                    ]}
                    type="button"
                    onclick={(evt) => {
                        thisName.value = "";
                    }}
                    aria-label="Delete"
                >
                    <svg width="10" height="10" viewBox="-16 -16 32 32">
                        <title>Delete</title>
                        <path
                            d="M-8,-8L8,8M-8,8L8,-8"
                            stroke="currentColor"
                            stroke-width="4px"
                            stroke-linecap="round"
                        />
                    </svg></button
                >
                <label class="simple-form-field"
                    ><span class="simple-form-field-label">Name:</span>
                    <input
                        bind:this={thisInputName.value}
                        type="text"
                        class="simple-form-field-input"
                        bind:value={thisName.value}
                        onkeydown={(evt) => {
                            if (
                                evt.key === "Enter" &&
                                !evt.shiftKey &&
                                nextInputName.value
                            ) {
                                nextInputName.value.focus();
                            }

                            if (
                                evt.key === "Enter" &&
                                evt.shiftKey &&
                                prevInputName.value
                            ) {
                                prevInputName.value.focus();
                            }
                        }}
                    /></label
                >
                {#if thisEntry.value}
                    <Nested
                        greeting={thisGreeting}
                        bind:this={thisInputGreet.value}
                        onkeydown={(evt) => {
                            if (
                                evt.key === "Enter" &&
                                !evt.shiftKey &&
                                nextInputGreet.value
                            ) {
                                nextInputGreet.value.focus();
                            }
                            if (
                                evt.key === "Enter" &&
                                evt.shiftKey &&
                                prevInputGreet.value
                            ) {
                                prevInputGreet.value.focus();
                            }
                        }}
                    />
                {:else}
                    <span class="simple-form-help"
                        >Press enter to jump to the next field.</span
                    >
                {/if}
            </li>
        {/each}
    </ul>

    <h3>JSON</h3>

    <p>Person list formatted as json:</p>
    <p>
        The left field is editable and permits invalid JSON (but reports an
        error). The center field is read-only, the right field is editable but
        only permits valid JSON.
    </p>

    <p>
        Once the left field is in an error state it has to be reset explicitly
        to get rid of the error. Try to introduce an error and then edit the
        peole in the form above or in the right-most field.
    </p>

    <div class="beside">
        <textarea
            class={{ "has-error": peopleJson.hasError }}
            bind:value={peopleJson.value}
        ></textarea>
        <pre style={fontSize.value}>{peopleJson.stableValue}</pre>

        <textarea use:bindValue={peopleJson.stableAtom}></textarea>
    </div>

    <div class="error-message" hidden={!peopleJson.hasError}>
        <button type="button" onclick={peopleJson.reset}>Reset</button>
        {peopleJson.error}
    </div>

    <div>
        <h3>Numbers</h3>

        <p>
            Numer sliders are synced. One slider has double the value of the
            other. The input fields do not allow non-numeric values. The values
            are clamped to 0-100 and 0-200, respectively.
        </p>

        <div class="number-picker">
            <span class="number-picker-label">Slider A</span>
            <input
                type="range"
                class="number-picker-slider"
                use:bindValue={theNumberClamped}
                max="100"
            />
            <input
                class="number-picker-numberfield"
                type="text"
                use:bindValue={theNumberClamped}
                max="100"
            />
            <output class="number-picker-value"
                >({theNumberClamped.value})</output
            >
            <span class="number-picker-help"
                >The input is bound synchronously</span
            >
        </div>

        <div class="number-picker">
            <span class="number-picker-label">Slider B</span>
            <input
                type="range"
                class="number-picker-slider"
                bind:value={theNumberDoubled.value}
                step={2}
                max="200"
            />
            <input
                class="number-picker-numberfield"
                type="text"
                bind:value={theNumberDoubled.value}
                max="200"
            />
            <output class="number-picker-value"
                >({theNumberDoubled.value})</output
            >
            <span class="number-picker-help">The input is bound deferred</span>
        </div>
    </div>

    <h3>Scroll Sync</h3>

    <p>
        The the scroll positions of the text fields are all in sync. Scrolling
        one textfield causes the others to scroll as well. The content of the
        bright yellow text fields can be edited. The content is also
        synchronzied between all 6 fields. It should be impossible to make them
        diverge.
    </p>

    <label class="number-picker"
        ><span class="number-picker-label">Horizontal:</span>
        <input
            type="range"
            class="number-picker-slider"
            use:bindValue={textScrollerX}
            min="0"
            max={textScrollerMax.value.x}
            disabled={textScrollerMax.value.x < 1}
            step="1"
        /><input
            type="number"
            class="number-picker-numberfield"
            use:bindValue={textScrollerX}
            min="0"
            max={textScrollerMax.value.x}
            disabled={textScrollerMax.value.x < 1}
            step="1"
        /></label
    >
    <label class="number-picker">
        <span class="number-picker-label">Vertical:</span>
        <input
            type="range"
            class="number-picker-slider"
            use:bindValue={textScrollerY}
            min="0"
            max={textScrollerMax.value.y}
            disabled={textScrollerMax.value.y < 1}
            step="1"
        /><input
            type="number"
            class="number-picker-numberfield"
            use:bindValue={textScrollerY}
            min="0"
            max={textScrollerMax.value.y}
            disabled={textScrollerMax.value.y < 1}
            step="1"
        />
    </label>
    <div class="beside">
        <textarea
            use:bindScroll={textScroller}
            use:bindScrollMax={textScrollerMax}
            use:bindValue={ascii}
            class="asciiart scrollable"
        ></textarea>
        <textarea
            use:bindScroll={textScroller}
            use:bindScrollMax={textScrollerMax}
            use:bindValue={ascii}
            class="asciiart scrollable"
        ></textarea>
        <textarea
            use:bindScroll={textScroller}
            use:bindScrollMax={textScrollerMax}
            use:bindValue={ascii}
            class="asciiart scrollable"
        ></textarea>

        <pre
            class="scrollable asciiart"
            use:bindScroll={textScroller}
            use:bindScrollMax={textScrollerMax}>{ascii.value}</pre>
        <pre
            class="scrollable asciiart"
            use:bindScroll={textScroller}
            use:bindScrollMax={textScrollerMax}>{ascii.value}</pre>
        <pre
            class="scrollable asciiart"
            use:bindScroll={textScroller}
            use:bindScrollMax={textScrollerMax}>{ascii.value}</pre>
    </div>

    <h3>Summed Slider</h3>

    <p>
        The sliders below are setup to always sum to <code>30.0</code>.
        Increasing the value of one slider decreases all the other slider values
        and vice versa.
    </p>

    {#each [0, 1, 2, 3, 4, 5] as i}
        {@const entry = view(
            [summingLens(i), L.valueOr(0), L.getter(numberFormat.format)],
            summingValues,
        )}

        <label class="number-picker"
            ><span class="number-picker-label"
                >Value {String.fromCharCode(65 + i)}:</span
            >
            <input
                type="range"
                class="number-picker-slider"
                bind:value={entry.value}
                max={R.sum(summingValues.value)}
                step="0.01"
            />

            <output class="number-picker-value ro"
                >({numberFormat.format(entry.value)})</output
            >
        </label>
    {/each}

    <label class="number-picker"
        ><span class="number-picker-label">Sum:</span>
        <input
            type="range"
            class="number-picker-slider"
            bind:value={summingValuesSum.value}
            min="10"
            max="50"
            step="0.01"
        />

        <output class="number-picker-value ro"
            >({numberFormat.format(summingValuesSum.value)})</output
        >
    </label>

    <h3>Scroller</h3>

    <Scroller
        debug={scrollerDebug.value}
        scrollPosition={scrollerPosition}
        scrollWindowSize={scrollerWindow}
        contentSize={scrollerSize}
        raw={rawScrollPos}
        {browserChromeOverscroll}
        {extraScrollPadding}
    >
        <div
            class={[
                "stack",
                { dropshadow: browserChromeOverscrollSum.value > 0 },
            ]}
            style:--shadow-x="{Math.round(browserChromeOverscroll.value.x) /
                3}px"
            style:--shadow-y="{Math.round(browserChromeOverscroll.value.y) /
                3}px"
            style:--shadow-sum="{browserChromeOverscrollSum.value * 40}px"
            style:--shadow-opacity={Math.min(
                browserChromeOverscrollSum.value,
                4,
            ) / 4}
        >
            <div
                class="checker-pattern"
                style:--bg-offset-x="{bgOffsetX.value}px"
                style:--bg-offset-y="{bgOffsetY.value}px"
                style:--fade={scrollerOutside.value}
            ></div>
            <div
                style="padding: 3em; align-self: center; justify-self: center; background: white; box-shadow: 0 0.5em 1.5em -.5em #0007;"
            >
                <div class="number-picker">
                    <span class="number-picker-label">Content Width:</span>

                    <input
                        type="range"
                        class="number-picker-slider"
                        min="0"
                        step="1"
                        max="5000"
                        bind:value={scrollerSizeX.value}
                    />
                    <output class="number-picker-value ro"
                        >({scrollerSizeX.value})</output
                    >
                </div>

                <label class="number-picker"
                    ><span class="number-picker-label">Content Height:</span>
                    <input
                        type="range"
                        class="number-picker-slider"
                        min="0"
                        step="1"
                        max="5000"
                        bind:value={scrollerSizeY.value}
                    />
                    <output class="number-picker-value ro"
                        >({scrollerSizeY.value})</output
                    >
                </label>

                <label class="checkbox-control"
                    ><span class="checkbox-control-titel"
                        >Extra Scroll Padding:</span
                    >
                    <span>{extraScrollPadding.value ? "Yes" : "No"}</span>
                    <span class="checkbox-control-body">
                        <input
                            type="checkbox"
                            bind:checked={extraScrollPadding.value}
                        /> Allow to scroll outsize the content
                    </span>
                </label>
                <br />
                <label class="checkbox-control"
                    ><span class="checkbox-control-titel">Debug:</span>
                    <span>{scrollerDebug.value ? "Visible" : "Hidden"}</span>
                    <span class="checkbox-control-body">
                        <input
                            type="checkbox"
                            bind:checked={scrollerDebug.value}
                        />
                        Show Debug Panel
                    </span>
                </label>
            </div>
        </div>
    </Scroller>

    <h3>Huge Table</h3>

    <p>
        The table below has 1120 columns and 15000 rows. Each cell can be
        edited. Columns and rows can be pinned to stay visible while scrolling
        through the table.
    </p>

    <Table />

    <h3>How about Canvas</h3>

    <p>
        Below you find an classic implementation of a simple canvas drawing
        widget.
    </p>
    <p>
        You can select between various tools. Freehand shapes can be drawn and
        various elements can be placed on the canvas.
    </p>
    <p>
        Use your mouse wheel to zoom in and out. You the scrollbars to pan the
        camera or use the controls below the canvas to position the camera in a
        specific way.
    </p>

    <Canvas />

    <RenewImport />

    <h2>Split View</h2>

    <div
        style="display: grid; grid-template-columns: 1fr; grid-auto-rows: 20em;gap: 1em"
    >
        <Split>
            {#snippet children(i, c)}
                <div class="split-content">A{i}</div>
            {/snippet}
        </Split>
        <Split direction="column">
            {#snippet children(i, c)}
                <div class="split-content">B{i}</div>
            {/snippet}
        </Split>

        <Split direction="column">
            {#snippet children(i, c)}
                <Split>
                    {#snippet children(j, d)}
                        <div class="split-content">C{i}/D{j}</div>
                    {/snippet}
                </Split>
            {/snippet}
        </Split>

        <Split>
            {#snippet children(i, e)}
                <Split>
                    {#snippet children(j, f)}
                        <div class="split-content">E{i}/F{j}</div>
                    {/snippet}
                </Split>{/snippet}
        </Split>
    </div>

    <h2>Three Dimensional</h2>

    <ThreeDee />

    <h2>Clipping</h2>

    <ThreeDeeFresh />
    <h2>Robot</h2>
    <Robot></Robot>
    <div style:height="60vh"></div>
</section>

<style>
    @import url("app.css");

    .split-content {
        display: grid;
        align-content: center;
        justify-content: center;
        font-size: 1.3em;
        color: #eee;
    }

    .stack {
        display: grid;
        place-content: stretch;
        place-items: stretch;
    }

    .dropshadow {
        box-shadow: var(--shadow-x, 0) var(--shadow-y, 0) var(--shadow-sum, 0) 0
            rgba(20, 10, 0, var(--shadow-opacity, 0));
    }

    .stack > * {
        grid-column: 1/1;
        grid-row: 1/1;
    }

    .checker-pattern {
        z-index: -1;
        user-select: none;
        display: grid;
        place-content: center;
        --band-width: 50px; /* control the size*/
        --gap-width: 10px; /* control the size*/
        --c1: hsla(10, calc(100% - 100% * var(--fade, 1)), 77%);
        --c2: hsla(0, calc(30% - 30% * var(--fade, 1)), 55%);

        background:
            conic-gradient(
                at var(--band-width) calc(100% - var(--band-width)),
                #0000 270deg,
                var(--c1) 0
            ),
            linear-gradient(var(--c2) var(--band-width), #0000 0),
            conic-gradient(
                    at var(--band-width) calc(100% - var(--band-width)),
                    #0000 90deg,
                    var(--c2) 0 180deg,
                    var(--c1) 0
                )
                #e4e4ed;
        background-position:
            calc(var(--band-width) + var(--gap-width) + var(--bg-offset-x, 0))
                var(--bg-offset-y, 0),
            var(--bg-offset-x, 0) calc(var(--gap-width) + var(--bg-offset-y, 0)),
            var(--bg-offset-x, 0) var(--bg-offset-y, 0);
        background-size: calc(2 * (var(--band-width) + var(--gap-width)))
            calc(2 * (var(--band-width) + var(--gap-width)));
        background-color: hsl(120, 0%, calc(100% - 20% * var(--fade, 1)));
    }

    .checkbox-control {
        display: grid;
        grid-template-columns: 1fr auto;
        margin: 0;
    }

    .checkbox-control-titel {
        font-weight: bold;
    }

    .checkbox-control-body {
        grid-column: 1 / span 2;
    }
</style>
