<script>
	import * as L from "partial.lenses";
	import * as G from "./generators";
	import * as R from "ramda";
	import * as U from "./utils";
	import {
		atom,
		view,
		read,
		combine,
		failableView,
		bindValue,
		autofocusIf,
	} from "./svatom.svelte.js";
	import Scroller from "./Scroller.svelte";

	const numberFormat = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
		useGrouping: false,
	});

	const extractIndices = (pred = R.identity) =>
		R.compose(
			R.map(R.prop("i")),
			R.filter(R.compose(pred, R.prop("v"))),
			R.addIndex(R.map)((v, i) => ({
				v,
				i,
			})),
		);

	const blueNoiseSequence = (w, i) =>
		Math.round((((i * 1.61803) % 1) + 1) * w);

	const startAccum = R.mapAccum((acc, size) => [acc + size, acc]);
	const endAccum = R.mapAccum((acc, size) => [acc + size, acc + size]);

	const numColumns = 1500;
	const numRows = 15000;
	const defaultPinNumX = 1;
	const defaultPinNumY = 2;

	const columnHeadWidths = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(30, 2)),
	);
	const rowHeadHeights = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(20, 2)),
	);

	const columnPins = atom(
		R.concat(
			R.repeat(true, defaultPinNumX),
			R.repeat(false, numColumns - defaultPinNumX),
		),
	);
	const rowPins = atom(
		R.concat(
			R.repeat(true, defaultPinNumY),
			R.repeat(false, numRows - defaultPinNumY),
		),
	);

	const columnSizes = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(100, numColumns)),
	);
	const rowSizes = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(30, numRows)),
	);

	const focus = atom(null);

	const scrollPosition = atom({ x: 0, y: 0 });
	const scrollWindowSize = atom({ x: 0, y: 0 });

	const contentSize = read(
		L.reread(
			R.compose(
				({ x, hx, y, hy }) => ({ x: hx + x, y: hy + y }),
				R.map(R.sum),
			),
		),
		combine({
			x: columnSizes,
			y: rowSizes,
			hx: columnHeadWidths,
			hy: rowHeadHeights,
		}),
	);

	const columnHeadStarts = read(
		(hw) => R.last(startAccum(0, hw)),
		columnHeadWidths,
	);

	const columnHeadWidthSum = view((x) => endAccum(0, x)[0], columnHeadWidths);
	const rowHeadStarts = view(
		(rhh) => R.last(startAccum(0, rhh)),
		rowHeadHeights,
	);
	const rowHeadHeightSum = view((rhh) => endAccum(0, rhh)[0], rowHeadHeights);

	const columnPinnedIndices = view(extractIndices(), columnPins);
	const rowPinnedIndices = view(extractIndices(), rowPins);
	const columnNotPinnedIndices = view(extractIndices(R.not), columnPins);
	const rowNotPinnedIndices = view(extractIndices(R.not), rowPins);

	const columnPinnedSizes = view(
		({ s, is }) => R.map((i) => s[i], is),
		combine({ s: columnSizes, is: columnPinnedIndices }),
	);
	const rowPinnedSizes = view(
		({ s, is }) => R.map((i) => s[i], is),
		combine({ s: rowSizes, is: rowPinnedIndices }),
	);
	const columnNotPinnedSizes = view(
		({ s, is }) => R.map((i) => s[i], is),
		combine({ s: columnSizes, is: columnNotPinnedIndices }),
	);
	const rowNotPinnedSizes = view(
		({ s, is }) => R.map((i) => s[i], is),
		combine({ s: rowSizes, is: rowNotPinnedIndices }),
	);

	const columnPinnedStarts = view(
		({ a, b }) => R.last(startAccum(a, b)),
		combine({ a: columnHeadWidthSum, b: columnPinnedSizes }),
	);
	const columnPinnedSizeSum_columnPinnedEnds = view(
		({ a, b }) => endAccum(a, b),
		combine({ a: columnHeadWidthSum, b: columnPinnedSizes }),
	);
	const columnPinnedSizeSum = view(
		R.nth(0),
		columnPinnedSizeSum_columnPinnedEnds,
	);
	const columnPinnedEnds = view(
		R.nth(1),
		columnPinnedSizeSum_columnPinnedEnds,
	);

	const rowPinnedStarts = view(
		({ a, b }) => R.last(startAccum(a, b)),
		combine({ a: rowHeadHeightSum, b: rowPinnedSizes }),
	);
	const rowPinnedSizeSum_rowPinnedEnds = view(
		({ a, b }) => endAccum(a, b),
		combine({ a: rowHeadHeightSum, b: rowPinnedSizes }),
	);

	const rowPinnedSizeSum = view(R.nth(0), rowPinnedSizeSum_rowPinnedEnds);
	const rowPinnedEnds = view(R.nth(1), rowPinnedSizeSum_rowPinnedEnds);

	const firstPinnedColumn = view(
		({ chw, cpe }) => R.findIndex(R.lte(chw), cpe),
		combine({ cpe: columnPinnedEnds, chw: columnHeadWidthSum }),
	);
	const lastPinnedColumn = view(
		({ ws, cps }) => R.findLastIndex(R.gte(ws.x), cps),
		combine({ ws: scrollWindowSize, cps: columnPinnedStarts }),
	);
	const firstPinnedRow = view(
		({ rhs, rpe }) => R.findIndex(R.lte(rhs), rpe),
		combine({ rhs: rowHeadHeightSum, rpe: rowPinnedEnds }),
	);
	const lastPinnedRow = view(
		({ rps, sw }) => R.findLastIndex(R.gte(sw.y), rps),
		combine({
			rps: rowPinnedStarts,
			sw: scrollWindowSize,
		}),
	);

	const visiblePinnedColumns = view(
		({ fpc, lpc }) => Array.from(G.range(fpc, R.inc(lpc))),
		combine({ fpc: firstPinnedColumn, lpc: lastPinnedColumn }),
	);
	const visiblePinnedRows = view(
		({ fpr, lpr }) => Array.from(G.range(fpr, R.inc(lpr))),
		combine({ fpr: firstPinnedRow, lpr: lastPinnedRow }),
	);

	const columnStarts = view(
		({ a, b }) => R.last(startAccum(a, b)),
		combine({ a: columnPinnedSizeSum, b: columnNotPinnedSizes }),
	);
	const columnSizeSum_columnEnds = view(
		({ a, b }) => endAccum(a, b),
		combine({ a: columnPinnedSizeSum, b: columnNotPinnedSizes }),
	);
	const columnSizeSum = view(R.nth(0), columnSizeSum_columnEnds);
	const columnEnds = view(R.nth(1), columnSizeSum_columnEnds);

	const rowStarts = view(
		({ a, b }) => R.last(startAccum(a, b)),
		combine({ a: rowPinnedSizeSum, b: rowNotPinnedSizes }),
	);
	const rowSizeSum_rowEnds = view(
		({ a, b }) => endAccum(a, b),
		combine({ a: rowPinnedSizeSum, b: rowNotPinnedSizes }),
	);

	const rowSizeSum = view(R.nth(0), rowSizeSum_rowEnds);
	const rowEnds = view(R.nth(1), rowSizeSum_rowEnds);

	const firstColumn = view(
		({ sp, cps, ce }) => R.findIndex(R.lte(sp.x + cps), ce),
		combine({
			sp: scrollPosition,
			cps: columnPinnedSizeSum,
			ce: columnEnds,
		}),
	);
	const lastColumn = view(
		({ sp, sw, cs }) => R.findLastIndex(R.gte(sp.x + sw.x), cs),
		combine({
			sp: scrollPosition,
			sw: scrollWindowSize,
			cs: columnStarts,
		}),
	);
	const firstRow = view(
		({ a, b, c }) => R.findIndex(R.lte(a.y + b), c),
		combine({
			a: scrollPosition,
			b: rowPinnedSizeSum,
			c: rowEnds,
		}),
	);
	const lastRow = view(
		({ a, b, c }) => R.findLastIndex(R.gte(a.y + b.y), c),
		combine({
			a: scrollPosition,
			b: scrollWindowSize,
			c: rowStarts,
		}),
	);

	const visibleColumns = view(
		({ a, b }) => Array.from(G.range(a, R.inc(b))),
		combine({ a: firstColumn, b: lastColumn }),
	);
	const visibleRows = view(
		({ a, b }) => Array.from(G.range(a, R.inc(b))),
		combine({ a: firstRow, b: lastRow }),
	);

	const lastHeadColumn = view(
		({ a, b }) => R.findLastIndex(R.gte(a.x), b),
		combine({ a: scrollWindowSize, b: columnHeadStarts }),
	);
	const lastHeadRow = view(
		({ a, b }) => R.findLastIndex(R.gte(a.y), b),
		combine({ a: scrollWindowSize, b: rowHeadStarts }),
	);
	const visibleHeadColumns = view(
		(x) => Array.from(G.range(0, R.inc(x))),
		lastHeadColumn,
	);
	const visibleHeadRows = view(
		(lhr) => Array.from(G.range(0, R.inc(lhr))),
		lastHeadRow,
	);

	const cellValues = atom({});

	const cellValuesJson = failableView(
		L.inverse([
			L.alternatives(
				L.dropPrefix(
					"// Or try to edit this Json (only edits that keep the structure valid are possible)\n",
				),
				L.identity,
			),
			L.json({ space: "  " }),
			L.ifElse(
				U.isPlainObject,
				L.identity,
				L.getter(R.always(new Error("fooo"))),
			),
		]),
		cellValues,
	);

	function isFocused(f, x, y) {
		return f.value && f.value.x == x && f.value.y == y;
	}

	function onFocus(evt) {
		const x = parseInt(evt.currentTarget.getAttribute("data-cell-x"), 10);
		const y = parseInt(evt.currentTarget.getAttribute("data-cell-y"), 10);

		focus.value = { x, y };
	}

	function onBlur(evt) {
		const x = parseInt(evt.currentTarget.getAttribute("data-cell-x"), 10);
		const y = parseInt(evt.currentTarget.getAttribute("data-cell-y"), 10);
		if (isFocused(focus, x, y)) {
			focus.value = null;
		}
	}
</script>

<code>Focus: {!focus.value ? "none" : `${focus.value.x}/${focus.value.y}`}</code
>

<Scroller {scrollPosition} {scrollWindowSize} {contentSize}>
	<div
		class="grid-corner"
		style:--row-height={rowHeadHeightSum.value}
		style:--column-width={columnHeadWidthSum.value}
	>
		<span>x: {numberFormat.format(scrollPosition.value.x)}</span>
		<span>y: {numberFormat.format(scrollPosition.value.y)}</span>
	</div>
	<div key="head-rows">
		{#each visibleHeadRows.value as y, i (i)}
			<div
				name="virtual-{i}"
				class="grid-head-row"
				style:--row-height={rowHeadHeights.value[y]}
				style:--row-start={rowHeadStarts.value[y]}
			>
				<div key="pinned">
					{#each visiblePinnedColumns.value as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-cell grid-pinned-column"
							style:--column-width={columnPinnedSizes.value[x]}
							style:--column-start={columnPinnedStarts.value[x]}
						>
							{#if i == 1}
								{String.fromCharCode(
									65 + (columnPinnedIndices.value[x] % 26),
								)}{Math.floor(
									columnPinnedIndices.value[x] / 26,
								)}
							{:else}
								{@const pinnedColumn = view(
									[
										columnPinnedIndices.value[x],
										L.valueOr(false),
									],
									columnPins,
								)}

								<input
									type="checkbox"
									bind:checked={pinnedColumn.value}
								/>
							{/if}
						</label>
					{/each}
				</div>

				<div key="not-pinned">
					{#each visibleColumns.value as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-cell"
							style:--column-width={columnNotPinnedSizes.value[x]}
							style:--column-start={columnStarts.value[x]}
						>
							{#if i == 1}
								{String.fromCharCode(
									65 + (columnNotPinnedIndices.value[x] % 26),
								)}{Math.floor(
									columnNotPinnedIndices.value[x] / 26,
								)}
							{:else}
								{@const pinnedColumn = view(
									[
										columnNotPinnedIndices.value[x],
										L.valueOr(false),
									],
									columnPins,
								)}

								<input
									type="checkbox"
									bind:checked={pinnedColumn.value}
								/>
							{/if}
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div key="pinned-rows">
		{#each visiblePinnedRows.value as y, i (i)}
			{@const pinnedRow = view(
				[rowPinnedIndices.value[y], L.valueOr(false)],
				rowPins,
			)}
			<div
				name="virtual-{i}"
				class="grid-row grid-pinned-row"
				style:--row-height={rowPinnedSizes.value[y]}
				style:--row-start={rowPinnedStarts.value[y]}
			>
				<div key="heads">
					{#each visibleHeadColumns.value as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-column"
							style:--column-width={columnHeadWidths.value[x]}
							style:--column-start={columnHeadStarts.value[x]}
						>
							{#if j == 1}
								{String.fromCharCode(
									65 + (rowPinnedIndices.value[y] % 26),
								)}{Math.floor(rowPinnedIndices.value[y] / 26)}
							{:else}
								<input
									type="checkbox"
									bind:checked={pinnedRow.value}
								/>
							{/if}
						</label>
					{/each}
				</div>

				<div key="pinned">
					{#each visiblePinnedColumns.value as x, j (j)}
						{@const val = view(
							[
								`val-${rowPinnedIndices.value[y]}-${columnPinnedIndices.value[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell grid-pinned-column"
							style:--column-width={columnPinnedSizes.value[x]}
							style:--column-start={columnPinnedStarts.value[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnPinnedIndices.value[x],
									rowPinnedIndices.value[y],
								)}
								data-cell-x={columnPinnedIndices.value[x]}
								data-cell-y={rowPinnedIndices.value[y]}
								onfocus={onFocus}
								onblur={onBlur}
							/>
						</div>
					{/each}
				</div>

				<div key="not-pinned">
					{#each visibleColumns.value as x, j (j)}
						{@const val = view(
							[
								`val-${rowPinnedIndices.value[y]}-${columnNotPinnedIndices.value[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell"
							style:--column-width={columnNotPinnedSizes.value[x]}
							style:--column-start={columnStarts.value[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnNotPinnedIndices.value[x],
									rowPinnedIndices.value[y],
								)}
								data-cell-x={columnNotPinnedIndices.value[x]}
								data-cell-y={rowPinnedIndices.value[y]}
								onfocus={onFocus}
								onblur={onBlur}
							/>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div key="not-pinned">
		{#each visibleRows.value as y, i (i)}
			{@const pinnedRow = view(
				[rowNotPinnedIndices.value[y], L.valueOr(false)],
				rowPins,
			)}
			<div
				name="virtual-{i}"
				class="grid-row"
				style:--row-height={rowNotPinnedSizes.value[y]}
				style:--row-start={rowStarts.value[y]}
			>
				<div key="heads">
					{#each visibleHeadColumns.value as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-column"
							style:--column-width={columnHeadWidths.value[x]}
							style:--column-start={columnHeadStarts.value[x]}
						>
							{#if j == 1}
								{String.fromCharCode(
									65 + (rowNotPinnedIndices.value[y] % 26),
								)}{Math.floor(
									rowNotPinnedIndices.value[y] / 26,
								)}
							{:else}
								<input
									type="checkbox"
									bind:checked={pinnedRow.value}
								/>
							{/if}
						</label>
					{/each}
				</div>

				<div key="pinned">
					{#each visiblePinnedColumns.value as x, j (j)}
						{@const val = view(
							[
								`val-${rowNotPinnedIndices.value[y]}-${columnPinnedIndices.value[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell grid-pinned-column"
							style:--column-width={columnPinnedSizes.value[x]}
							style:--column-start={columnPinnedStarts.value[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnPinnedIndices.value[x],
									rowNotPinnedIndices.value[y],
								)}
								data-cell-x={columnPinnedIndices.value[x]}
								data-cell-y={rowNotPinnedIndices.value[y]}
								onfocus={onFocus}
								onblur={onBlur}
							/>
						</div>
					{/each}
				</div>

				<div key="not-pinned">
					{#each visibleColumns.value as x, j (j)}
						{@const val = view(
							[
								`val-${rowNotPinnedIndices.value[y]}-${columnNotPinnedIndices.value[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell"
							style:--column-width={columnNotPinnedSizes.value[x]}
							style:--column-start={columnStarts.value[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnNotPinnedIndices.value[x],
									rowNotPinnedIndices.value[y],
								)}
								data-cell-x={columnNotPinnedIndices.value[x]}
								data-cell-y={rowNotPinnedIndices.value[y]}
								onfocus={onFocus}
								onblur={onBlur}
							/>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</Scroller>

<h4>Sparse Cell Values</h4>
<p>
	Edit some cells in the table above and see how they appear in the json
	object below:
</p>
<textarea use:bindValue={cellValuesJson.stableAtom}></textarea>

<style>
	.grid-corner {
		height: calc(var(--row-height, 0) * 1px - 1px);
		width: calc(var(--column-width, 0) * 1px - 1px);
		background: #222;
		color: #fff;
		top: 0;
		left: 0;
		position: absolute;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		place-items: center;
		place-content: center;
		outline: 1px solid #444;
		box-shadow: 0px 0px 15px 1px #000a;
		font-family: monospace;
		-webkit-user-select: none;
		user-select: none;
		white-space: pre;
		font-size: 0.9em;
	}

	.grid-row {
		position: absolute;
		top: calc(var(--row-start, 0) * 1px - var(--scroll-y, 0) * 1px);
		height: calc(var(--row-height, 128) * 1px);
		left: 0;
	}

	.grid-cell {
		text-align: center;
		color: #000;
		box-sizing: border-box;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		width: calc(var(--column-width, 128) * 1px);
		height: calc(var(--row-height, 128) * 1px);
		left: calc(var(--column-start, 0) * 1px - var(--scroll-x, 0) * 1px);
		top: 0;
		font-family: monospace;
		font-size: 0.9em;
		display: flex;
	}

	.grid-head-column {
		accent-color: #660000;
		position: absolute;
		text-align: center;
		border-right: 1px solid #eee;
		border-bottom: 1px solid #eee;
		box-sizing: border-box;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(var(--column-width, 128) * 1px);
		height: calc(var(--row-height, 128) * 1px);
		left: calc(var(--column-start, 0) * 1px);
		top: 0;
		font-family: monospace;
		font-size: 0.9em;
		display: flex;
		padding: 2px;
		background: #aa0b10;
		color: #fff;
		z-index: 200;
		user-select: none;
		-webkit-user-select: none;
	}

	.grid-pinned-row .grid-head-column {
		background: #333;
		accent-color: black;
		z-index: 299;
	}

	.grid-head-row {
		position: absolute;
		top: calc(var(--row-start, 0) * 1px);
		z-index: 100;
	}

	.grid-head-cell {
		accent-color: #660000;
		position: absolute;
		left: calc(var(--column-start, 0) * 1px - var(--scroll-x, 0) * 1px);

		text-align: center;
		border-right: 1px solid #eee;
		border-bottom: 1px solid #eee;
		box-sizing: border-box;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(var(--column-width, 128) * 1px);
		height: calc(var(--row-height, 128) * 1px);
		font-family: monospace;
		font-size: 0.9em;
		display: flex;
		padding: 2px;
		background: #dd4e40;
		color: #fff;
		z-index: 90;
		user-select: none;
		-webkit-user-select: none;
	}

	label.grid-head-cell:has(input[type="checkbox"]) {
		cursor: pointer;
	}

	label.grid-head-column:has(input[type="checkbox"]) {
		cursor: pointer;
	}

	label input[type="checkbox"] {
		cursor: pointer;
	}

	.grid-head-cell.grid-pinned-column {
		background: #333;
		accent-color: black;
		z-index: 99;
	}

	.grid-pinned-column {
		position: absolute;
		left: calc(var(--column-start, 0) * 1px);
	}

	.grid-pinned-row {
		position: absolute;
		top: calc(var(--row-start, 0) * 1px);
	}

	.cell-input {
		flex-grow: 1;
		flex-shrink: 1;
		width: 100%;
		height: 100%;
		border: none;
		font: inherit;
		padding: 0.5em;
		box-sizing: border-box;
		outline: 1px solid #eee;
		-webkit-appearance: none;
		appearance: none;
		-webkit-border-radius: 0px;
		border-radius: 0;
	}
	.grid-pinned-column .cell-input {
		background: #fafafa;
		z-index: 10;
	}

	.grid-pinned-row .cell-input {
		background: #fafafa;
		z-index: 10;
	}

	.grid-pinned-row .grid-pinned-column .cell-input {
		background: #efefef;
		z-index: 20;
	}

	.grid-cell:has(.cell-input:focus-visible)::after {
		content: " ";
		position: absolute;
		inset: 0;
		outline: 3px solid #00ccdd;
		pointer-events: none;
		z-index: 9999;
	}

	.cell-input:focus-visible {
		outline: 3px solid #00ccdd;
		background: #effeff !important;
		z-index: 5;
	}

	.grid-pinned-column .cell-input:focus-visible {
		z-index: 15;
	}

	.grid-pinned-row .cell-input:focus-visible {
		z-index: 15;
	}

	.grid-pinned-row .grid-pinned-column .cell-input:focus-visible {
		z-index: 40;
	}
</style>
