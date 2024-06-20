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
		combineWithRest,
		failableView,
		bindValue,
		readScroll,
		bindSize,
		autofocusIf,
		string,
	} from "./svatom.svelte.js";

	const extractIndices = (pred = R.identity) =>
		R.compose(
			R.map(R.prop("i")),
			R.filter(R.compose(pred, R.prop("v"))),
			R.addIndex(R.map)((v, i) => ({
				v,
				i,
			})),
		);

	const tableScroller = atom({ x: 0, y: 0 });
	const tableScrollerPositive = view(
		L.reread(R.map(R.max(0))),
		tableScroller,
	);
	const tableScrollerSize = atom({ x: 0, y: 0 });

	const focus = atom(null);

	const blueNoiseSequence = (w, i) =>
		Math.round((((i * 1.61803) % 1) + 1) * w);
	const startAccum = R.mapAccum((acc, size) => [acc + size, acc]);
	const endAccum = R.mapAccum((acc, size) => [acc + size, acc + size]);

	const columnHeadWidths = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(30, 2)),
	);
	const rowHeadHeights = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(20, 2)),
	);
	const columnHeadStarts = $derived(
		R.last(startAccum(0, columnHeadWidths.value)),
	);
	const [columnHeadWidthSum, columnHeadEnds] = $derived(
		endAccum(0, columnHeadWidths.value),
	);
	const rowHeadStarts = $derived(R.last(startAccum(0, rowHeadHeights.value)));
	const [rowHeadHeightSum, rowHeadEnds] = $derived(
		endAccum(0, rowHeadHeights.value),
	);

	const defaultPinNumX = 1;
	const defaultPinNumY = 2;

	const columnPins = atom(
		R.concat(
			R.repeat(true, defaultPinNumX),
			R.repeat(false, 1120 - defaultPinNumX),
		),
	);
	const rowPins = atom(
		R.concat(
			R.repeat(true, defaultPinNumY),
			R.repeat(false, 15000 - defaultPinNumY),
		),
	);

	const columnSizes = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(100, 1120)),
	);
	const rowSizes = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(30, 15000)),
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
	const firstPinnedColumn = 0;
	const lastPinnedColumn = $derived(
		R.findLastIndex(
			R.gte(tableScrollerPositive.value.x + tableScrollerSize.value.x),
			columnPinnedStarts,
		),
	);
	const firstPinnedRow = 0;
	const lastPinnedRow = $derived(
		R.findLastIndex(
			R.gte(tableScrollerPositive.value.y + tableScrollerSize.value.y),
			rowPinnedStarts,
		),
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
			R.lte(tableScrollerPositive.value.x + columnPinnedSizeSum),
			columnEnds,
		),
	);
	const lastColumn = $derived(
		R.findLastIndex(
			R.gte(tableScrollerPositive.value.x + tableScrollerSize.value.x),
			columnStarts,
		),
	);
	const firstRow = $derived(
		R.findIndex(
			R.lte(tableScrollerPositive.value.y + rowPinnedSizeSum),
			rowEnds,
		),
	);
	const lastRow = $derived(
		R.findLastIndex(
			R.gte(tableScrollerPositive.value.y + tableScrollerSize.value.y),
			rowStarts,
		),
	);

	const visibleColumns = $derived(() =>
		G.range(firstColumn, R.inc(lastColumn)),
	);
	const visibleRows = $derived(() => G.range(firstRow, R.inc(lastRow)));

	const visibleHeadColumns = $derived(() =>
		G.range(0, R.length(columnHeadWidths.value)),
	);
	const visibleHeadRows = $derived(() =>
		G.range(0, R.length(rowHeadHeights.value)),
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

<div
	class="scroller"
	use:readScroll={tableScroller}
	style:--scroll-total-x={columnSizeSum}
	style:--scroll-total-y={rowSizeSum}
	style:--scroll-x={tableScrollerPositive.value.x}
	style:--scroll-y={tableScrollerPositive.value.y}
>
	<div class="scroller-body">
		<div
			class="scroller-corner"
			style:--row-height={rowHeadHeightSum}
			style:--column-width={columnHeadWidthSum}
		>
			<span>x: {tableScrollerPositive.value.x}</span>
			<br />
			<span>y: {tableScrollerPositive.value.y}</span>
		</div>
		<div key="head-rows">
			{#each visibleHeadRows() as y, i (i)}
				<div
					name="virtual-{i}"
					class="scroller-head-row"
					style:--row-height={rowHeadHeights.value[y]}
					style:--row-start={rowHeadStarts[y]}
				>
					<div key="pinned">
						{#each visiblePinnedColumns() as x, j (j)}
							<label
								name="virtual-{j}"
								class="scroller-head-cell scroller-pinned-column"
								style:--column-width={columnPinnedSizes[x]}
								style:--column-start={columnPinnedStarts[x]}
							>
								{#if i == 1}
									{String.fromCharCode(
										65 + (columnPinnedIndices[x] % 26),
									)}{Math.floor(columnPinnedIndices[x] / 26)}
								{:else}
									{@const pinnedColumn = view(
										[
											columnPinnedIndices[x],
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
						{#each visibleColumns() as x, j (j)}
							<label
								name="virtual-{j}"
								class="scroller-head-cell"
								style:--column-width={columnNotPinnedSizes[x]}
								style:--column-start={columnStarts[x]}
							>
								{#if i == 1}
									{String.fromCharCode(
										65 + (columnNotPinnedIndices[x] % 26),
									)}{Math.floor(
										columnNotPinnedIndices[x] / 26,
									)}
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
					class="scroller-row scroller-pinned-row"
					style:--row-height={rowPinnedSizes[y]}
					style:--row-start={rowPinnedStarts[y]}
				>
					<div key="heads">
						{#each visibleHeadColumns() as x, j (j)}
							<label
								name="virtual-{j}"
								class="scroller-head-column"
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
								class="scroller-cell scroller-pinned-column"
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
								class="scroller-cell"
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
					class="scroller-row"
					style:--row-height={rowNotPinnedSizes[y]}
					style:--row-start={rowStarts[y]}
				>
					<div key="heads">
						{#each visibleHeadColumns() as x, j (j)}
							<label
								name="virtual-{j}"
								class="scroller-head-column"
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
								class="scroller-cell scroller-pinned-column"
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
								class="scroller-cell"
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
	</div>
	<div class="scroller-measure" use:bindSize={tableScrollerSize}></div>
</div>

<h4>Sparse Cell Values</h4>
<p>
	Edit some cells in the table above and see how they appear in the json
	object below:
</p>
<textarea use:bindValue={cellValuesJson.stableAtom}></textarea>

<style>
	.scroller {
		border: 3px solid #333;
		min-height: 10em;
		resize: both;
		overflow: scroll;
		height: 30em;
		position: relative;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
	}

	.scroller > * {
		grid-area: 1 / 1;
	}

	.scroller-measure {
		position: sticky;
		left: 0;
		top: 0;
		display: block;
		pointer-events: none;
		border: 1px solid lime;
		z-index: 10000;
		place-self: stretch;
		pointer-events: none;
	}

	.scroller::after {
		display: block;
		content: " ";
		height: calc(var(--scroll-total-y, 1) * 1px);
		width: calc(var(--scroll-total-x, 1) * 1px);
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.scroller-body {
		position: sticky;
		top: 0;
		left: 0;
	}

	.scroller-corner {
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
	}

	.scroller-row {
		position: absolute;
		top: calc(var(--row-start, 0) * 1px - var(--scroll-y, 0) * 1px);
		height: calc(var(--row-height, 128) * 1px);
		left: 0;
	}

	.scroller-cell {
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

	.scroller-head-column {
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
	}

	.scroller-pinned-row .scroller-head-column {
		background: #333;
		accent-color: black;
		z-index: 299;
	}

	.scroller-head-row {
		position: absolute;
		top: calc(var(--row-start, 0) * 1px);
		z-index: 100;
	}

	.scroller-head-cell {
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
	}

	label.scroller-head-cell:has(input[type="checkbox"]) {
		cursor: pointer;
	}

	label.scroller-head-column:has(input[type="checkbox"]) {
		cursor: pointer;
	}

	label input[type="checkbox"] {
		cursor: pointer;
	}

	.scroller-head-cell.scroller-pinned-column {
		background: #333;
		accent-color: black;
		z-index: 99;
	}

	.scroller-pinned-column {
		position: absolute;
		left: calc(var(--column-start, 0) * 1px);
	}

	.scroller-pinned-row {
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
	}
	.scroller-pinned-column .cell-input {
		background: #fafafa;
		z-index: 10;
	}

	.scroller-pinned-row .cell-input {
		background: #fafafa;
		z-index: 10;
	}

	.scroller-pinned-row .scroller-pinned-column .cell-input {
		background: #efefef;
		z-index: 20;
	}

	.scroller-cell:has(.cell-input:focus-visible)::after {
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

	.scroller-pinned-column .cell-input:focus-visible {
		z-index: 15;
	}

	.scroller-pinned-row .cell-input:focus-visible {
		z-index: 15;
	}

	.scroller-pinned-row .scroller-pinned-column .cell-input:focus-visible {
		z-index: 40;
	}
</style>
