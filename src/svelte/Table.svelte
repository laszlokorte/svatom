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

	const columnHeadStarts = $derived(
		R.last(startAccum(0, columnHeadWidths.value)),
	);
	const [columnHeadWidthSum, _columnHeadEnds] = $derived(
		endAccum(0, columnHeadWidths.value),
	);
	const rowHeadStarts = $derived(R.last(startAccum(0, rowHeadHeights.value)));
	const [rowHeadHeightSum, _rowHeadEnds] = $derived(
		endAccum(0, rowHeadHeights.value),
	);

	const columnPinnedIndices = $derived(extractIndices()(columnPins.value));
	const rowPinnedIndices = $derived(extractIndices()(rowPins.value));
	const columnNotPinnedIndices = $derived(
		extractIndices(R.not)(columnPins.value),
	);
	const rowNotPinnedIndices = $derived(extractIndices(R.not)(rowPins.value));

	const columnPinnedSizes = $derived(
		R.map((i) => columnSizes.value[i], columnPinnedIndices),
	);
	const rowPinnedSizes = $derived(
		R.map((i) => rowSizes.value[i], rowPinnedIndices),
	);
	const columnNotPinnedSizes = $derived(
		R.map((i) => columnSizes.value[i], columnNotPinnedIndices),
	);
	const rowNotPinnedSizes = $derived(
		R.map((i) => rowSizes.value[i], rowNotPinnedIndices),
	);

	const columnPinnedStarts = $derived(
		R.last(startAccum(columnHeadWidthSum, columnPinnedSizes)),
	);
	const [columnPinnedSizeSum, columnPinnedEnds] = $derived(
		endAccum(columnHeadWidthSum, columnPinnedSizes),
	);
	const rowPinnedStarts = $derived(
		R.last(startAccum(rowHeadHeightSum, rowPinnedSizes)),
	);
	const [rowPinnedSizeSum, rowPinnedEnds] = $derived(
		endAccum(rowHeadHeightSum, rowPinnedSizes),
	);
	const firstPinnedColumn = $derived(
		R.findIndex(R.lte(columnHeadWidthSum), columnPinnedEnds),
	);
	const lastPinnedColumn = $derived(
		R.findLastIndex(R.gte(scrollWindowSize.value.x), columnPinnedStarts),
	);
	const firstPinnedRow = $derived(
		R.findIndex(R.lte(rowHeadHeightSum), rowPinnedEnds),
	);
	const lastPinnedRow = $derived(
		R.findLastIndex(R.gte(scrollWindowSize.value.y), rowPinnedStarts),
	);

	const visiblePinnedColumns = $derived(() =>
		G.range(firstPinnedColumn, R.inc(lastPinnedColumn)),
	);
	const visiblePinnedRows = $derived(() =>
		G.range(firstPinnedRow, R.inc(lastPinnedRow)),
	);

	const columnStarts = $derived(
		R.last(startAccum(columnPinnedSizeSum, columnNotPinnedSizes)),
	);
	const [columnSizeSum, columnEnds] = $derived(
		endAccum(columnPinnedSizeSum, columnNotPinnedSizes),
	);
	const rowStarts = $derived(
		R.last(startAccum(rowPinnedSizeSum, rowNotPinnedSizes)),
	);
	const [rowSizeSum, rowEnds] = $derived(
		endAccum(rowPinnedSizeSum, rowNotPinnedSizes),
	);

	const firstColumn = $derived(
		R.findIndex(
			R.lte(scrollPosition.value.x + columnPinnedSizeSum),
			columnEnds,
		),
	);
	const lastColumn = $derived(
		R.findLastIndex(
			R.gte(scrollPosition.value.x + scrollWindowSize.value.x),
			columnStarts,
		),
	);
	const firstRow = $derived(
		R.findIndex(R.lte(scrollPosition.value.y + rowPinnedSizeSum), rowEnds),
	);
	const lastRow = $derived(
		R.findLastIndex(
			R.gte(scrollPosition.value.y + scrollWindowSize.value.y),
			rowStarts,
		),
	);

	const visibleColumns = $derived(() =>
		G.range(firstColumn, R.inc(lastColumn)),
	);
	const visibleRows = $derived(() => G.range(firstRow, R.inc(lastRow)));

	const lastHeadColumn = $derived(
		R.findLastIndex(R.gte(scrollWindowSize.value.x), columnHeadStarts),
	);
	const lastHeadRow = $derived(
		R.findLastIndex(R.gte(scrollWindowSize.value.y), rowHeadStarts),
	);
	const visibleHeadColumns = $derived(() =>
		G.range(0, R.inc(lastHeadColumn)),
	);
	const visibleHeadRows = $derived(() => G.range(0, R.inc(lastHeadRow)));

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
		style:--row-height={rowHeadHeightSum}
		style:--column-width={columnHeadWidthSum}
	>
		<span>x: {numberFormat.format(scrollPosition.value.x)}</span>
		<span>y: {numberFormat.format(scrollPosition.value.y)}</span>
	</div>
	<div key="head-rows">
		{#each visibleHeadRows() as y, i (i)}
			<div
				name="virtual-{i}"
				class="grid-head-row"
				style:--row-height={rowHeadHeights.value[y]}
				style:--row-start={rowHeadStarts[y]}
			>
				<div key="pinned">
					{#each visiblePinnedColumns() as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-cell grid-pinned-column"
							style:--column-width={columnPinnedSizes[x]}
							style:--column-start={columnPinnedStarts[x]}
						>
							{#if i == 1}
								{String.fromCharCode(
									65 + (columnPinnedIndices[x] % 26),
								)}{Math.floor(columnPinnedIndices[x] / 26)}
							{:else}
								{@const pinnedColumn = view(
									[columnPinnedIndices[x], L.valueOr(false)],
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
					{#each visibleColumns() as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-cell"
							style:--column-width={columnNotPinnedSizes[x]}
							style:--column-start={columnStarts[x]}
						>
							{#if i == 1}
								{String.fromCharCode(
									65 + (columnNotPinnedIndices[x] % 26),
								)}{Math.floor(columnNotPinnedIndices[x] / 26)}
							{:else}
								{@const pinnedColumn = view(
									[
										columnNotPinnedIndices[x],
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
		{#each visiblePinnedRows() as y, i (i)}
			{@const pinnedRow = view(
				[rowPinnedIndices[y], L.valueOr(false)],
				rowPins,
			)}
			<div
				name="virtual-{i}"
				class="grid-row grid-pinned-row"
				style:--row-height={rowPinnedSizes[y]}
				style:--row-start={rowPinnedStarts[y]}
			>
				<div key="heads">
					{#each visibleHeadColumns() as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-column"
							style:--column-width={columnHeadWidths.value[x]}
							style:--column-start={columnHeadStarts[x]}
						>
							{#if j == 1}
								{String.fromCharCode(
									65 + (rowPinnedIndices[y] % 26),
								)}{Math.floor(rowPinnedIndices[y] / 26)}
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
					{#each visiblePinnedColumns() as x, j (j)}
						{@const val = view(
							[
								`val-${rowPinnedIndices[y]}-${columnPinnedIndices[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell grid-pinned-column"
							style:--column-width={columnPinnedSizes[x]}
							style:--column-start={columnPinnedStarts[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnPinnedIndices[x],
									rowPinnedIndices[y],
								)}
								data-cell-x={columnPinnedIndices[x]}
								data-cell-y={rowPinnedIndices[y]}
								onfocus={onFocus}
								onblur={onBlur}
							/>
						</div>
					{/each}
				</div>

				<div key="not-pinned">
					{#each visibleColumns() as x, j (j)}
						{@const val = view(
							[
								`val-${rowPinnedIndices[y]}-${columnNotPinnedIndices[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell"
							style:--column-width={columnNotPinnedSizes[x]}
							style:--column-start={columnStarts[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnNotPinnedIndices[x],
									rowPinnedIndices[y],
								)}
								data-cell-x={columnNotPinnedIndices[x]}
								data-cell-y={rowPinnedIndices[y]}
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
		{#each visibleRows() as y, i (i)}
			{@const pinnedRow = view(
				[rowNotPinnedIndices[y], L.valueOr(false)],
				rowPins,
			)}
			<div
				name="virtual-{i}"
				class="grid-row"
				style:--row-height={rowNotPinnedSizes[y]}
				style:--row-start={rowStarts[y]}
			>
				<div key="heads">
					{#each visibleHeadColumns() as x, j (j)}
						<label
							name="virtual-{j}"
							class="grid-head-column"
							style:--column-width={columnHeadWidths.value[x]}
							style:--column-start={columnHeadStarts[x]}
						>
							{#if j == 1}
								{String.fromCharCode(
									65 + (rowNotPinnedIndices[y] % 26),
								)}{Math.floor(rowNotPinnedIndices[y] / 26)}
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
					{#each visiblePinnedColumns() as x, j (j)}
						{@const val = view(
							[
								`val-${rowNotPinnedIndices[y]}-${columnPinnedIndices[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell grid-pinned-column"
							style:--column-width={columnPinnedSizes[x]}
							style:--column-start={columnPinnedStarts[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnPinnedIndices[x],
									rowNotPinnedIndices[y],
								)}
								data-cell-x={columnPinnedIndices[x]}
								data-cell-y={rowNotPinnedIndices[y]}
								onfocus={onFocus}
								onblur={onBlur}
							/>
						</div>
					{/each}
				</div>

				<div key="not-pinned">
					{#each visibleColumns() as x, j (j)}
						{@const val = view(
							[
								`val-${rowNotPinnedIndices[y]}-${columnNotPinnedIndices[x]}`,
								L.defaults(""),
							],
							cellValues,
						)}
						<div
							name="virtual-{j}"
							class="grid-cell"
							style:--column-width={columnNotPinnedSizes[x]}
							style:--column-start={columnStarts[x]}
						>
							<input
								class="cell-input"
								type="text"
								placeholder={"-"}
								bind:value={val.value}
								use:autofocusIf={isFocused(
									focus,
									columnNotPinnedIndices[x],
									rowNotPinnedIndices[y],
								)}
								data-cell-x={columnNotPinnedIndices[x]}
								data-cell-y={rowNotPinnedIndices[y]}
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
		border-radius: none;
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
