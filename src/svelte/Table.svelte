<script>
	import * as L from "partial.lenses";
	import * as G from "./generators";
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
		bindSize,
		autofocusIf,
		string,
	} from "./svatom.svelte.js";

	const tableScroller = atom({ x: 0, y: 0 });
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

	const columnWidths = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(100, 1120)),
	);
	const rowHeights = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(30, 15000)),
	);
	const columnStarts = $derived(
		R.last(startAccum(columnHeadWidthSum, columnWidths.value)),
	);
	const [columnWidthSum, columnEnds] = $derived(
		endAccum(columnHeadWidthSum, columnWidths.value),
	);
	const rowStarts = $derived(
		R.last(startAccum(rowHeadHeightSum, rowHeights.value)),
	);
	const [rowHeightSum, rowEnds] = $derived(
		endAccum(rowHeadHeightSum, rowHeights.value),
	);
	const firstColumn = $derived(
		R.findIndex(R.lte(tableScroller.value.x), columnEnds),
	);
	const lastColumn = $derived(
		R.findLastIndex(
			R.gte(tableScroller.value.x + tableScrollerSize.value.x),
			columnStarts,
		),
	);
	const firstRow = $derived(
		R.findIndex(R.lte(tableScroller.value.y), rowEnds),
	);
	const lastRow = $derived(
		R.findLastIndex(
			R.gte(tableScroller.value.y + tableScrollerSize.value.y),
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
	use:bindScroll={tableScroller}
	style:--scroll-total-x={columnWidthSum}
	style:--scroll-total-y={rowHeightSum}
	style:--scroll-x={tableScroller.value.x}
	style:--scroll-y={tableScroller.value.y}
>
	<div class="scroller-body">
		<div
			class="scroller-corner"
			style:--row-height={rowHeadHeightSum}
			style:--column-width={columnHeadWidthSum}
		>
			<span>x: {tableScroller.value.x}</span>
			<br />
			<span>y: {tableScroller.value.y}</span>
		</div>
		{#each visibleRows() as y, i (i)}
			<div
				class="scroller-row"
				style:--row-height={rowHeights.value[y]}
				style:--row-start={rowStarts[y]}
			>
				{#each visibleColumns() as x, j (j)}
					{@const val = view(
						[`val-${y}-${x}`, L.defaults("")],
						cellValues,
					)}
					<div
						class="scroller-cell"
						style:--column-width={columnWidths.value[x]}
						style:--column-start={columnStarts[x]}
					>
						<input
							class="cell-input"
							type="text"
							placeholder={"-"}
							bind:value={val.value}
							use:autofocusIf={isFocused(focus, x, y)}
							data-cell-x={x}
							data-cell-y={y}
							onfocus={onFocus}
							onblur={onBlur}
						/>
					</div>
				{/each}

				<div key="heads">
					{#each visibleHeadColumns() as x, j (j)}
						<div
							class="scroller-head-column"
							style:--column-width={columnHeadWidths.value[x]}
							style:--column-start={columnHeadStarts[x]}
						>
							{#if j == 0}
								{String.fromCharCode(65 + (y % 26))}{Math.floor(
									y / 26,
								)}
							{:else}
								{y}
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}

		{#each visibleHeadRows() as y, i (i)}
			<div
				class="scroller-head-row"
				style:--row-height={rowHeadHeights.value[y]}
				style:--row-start={rowHeadStarts[y]}
			>
				{#each visibleColumns() as x, j (j)}
					<div
						class="scroller-head-cell"
						style:--column-width={columnWidths.value[x]}
						style:--column-start={columnStarts[x] -
							tableScroller.value.x}
					>
						{#if i == 0}
							{String.fromCharCode(65 + (x % 26))}{Math.floor(
								x / 26,
							)}
						{:else}
							{x}
						{/if}
					</div>
				{/each}
			</div>
		{/each}
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
	}

	.scroller-measure {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.scroller::after {
		display: "block";
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
		z-index: 10;
	}

	.scroller-head-row {
		position: absolute;
		top: calc(var(--row-start, 0) * 1px);
		z-index: 20;
	}

	.scroller-head-cell {
		position: absolute;
		left: calc(var(--column-start, 0) * 1px);

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
		z-index: 10;
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

	.cell-input:focus-visible {
		outline: 3px solid #00ccdd;
		z-index: 1;
	}
</style>
