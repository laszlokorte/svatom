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
		string,
	} from "./svatom.svelte.js";

	const tableScroller = atom({ x: 0, y: 0 });
	const tableScrollerSize = atom({ x: 0, y: 0 });

	const blueNoiseSequence = (w, i) =>
		Math.round((((i * 1.61803) % 1) + 1) * w);

	const columnWidths = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(100, 120)),
	);
	const rowHeights = atom(
		R.addIndex(R.map)(blueNoiseSequence)(R.repeat(30, 5000)),
	);
	const startAccum = R.mapAccum((acc, size) => [acc + size, acc], 0);
	const endAccum = R.mapAccum((acc, size) => [acc + size, acc + size], 0);
	const columnStarts = $derived(R.last(startAccum(columnWidths.value)));
	const [columnWidthSum, columnEnds] = $derived(endAccum(columnWidths.value));
	const rowStarts = $derived(R.last(startAccum(rowHeights.value)));
	const [rowHeightSum, rowEnds] = $derived(endAccum(rowHeights.value));
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
	const visibleRows = $derived(G.range(firstRow, R.inc(lastRow)));

	const cellValues = atom({});

	const cellValuesJson = failableView(
		L.inverse(L.json({ space: "  " })),
		cellValues,
	);
</script>

<div
	class="scroller"
	use:bindScroll={tableScroller}
	style:--scroll-total-x={columnWidthSum}
	style:--scroll-total-y={rowHeightSum}
	style:--scroll-ox={tableScroller.value.x - columnStarts[firstColumn]}
	style:--scroll-oy={tableScroller.value.y - rowStarts[firstRow]}
	style:--scroll-x={tableScroller.value.x}
	style:--scroll-y={tableScroller.value.y}
	style:--scroll-w={tableScrollerSize.value.x}
	style:--scroll-h={tableScrollerSize.value.y}
>
	<div class="scroller-measure" use:bindSize={tableScrollerSize}></div>
	<div class="scroller-space"></div>
	<div class="scroller-body">
		{#each visibleRows as y, i (y)}
			<div class="scroller-row" style:--row-height={rowHeights.value[y]}>
				{#each visibleColumns() as x, j (x)}
					{@const val = view(
						[`val-${y}-${x}`, L.defaults("")],
						cellValues,
					)}
					<div
						class="scroller-cell"
						style:--column-width={columnWidths.value[x]}
					>
						<input
							class="cell-input"
							type="text"
							placeholder="-"
							bind:value={val.value}
						/>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>

<textarea use:bindValue={cellValuesJson.stableAtom}></textarea>

<style>
	.scroller {
		border: 2px solid #aaa;
		min-height: 10em;
		resize: both;
		overflow: scroll;
		height: 30em;
		position: relative;
	}

	.scroller-measure {
		width: 100%;
		height: 100%;
	}

	.scroller-space {
		height: calc(var(--scroll-total-y, 1) * 1px);
		width: calc(var(--scroll-total-x, 1) * 1px);
		position: absolute;
		top: 0;
		left: 0;
	}

	.scroller-body {
		position: absolute;
		left: calc(var(--scroll-x, 0) * 1px);
		top: calc(var(--scroll-y, 0) * 1px);
		width: calc(var(--scroll-w, 0) * 1px);
		height: calc(var(--scroll-h, 0) * 1px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		justify-items: start;
		justify-content: start;
	}

	.scroller-row {
		display: flex;
		flex-shrink: 0;
		flex-grow: 0;
		position: relative;
	}

	.scroller-cell {
		text-align: center;
		border-right: 1px solid #eee;
		border-bottom: 1px solid #eee;
		color: #000;
		box-sizing: border-box;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		width: calc(var(--column-width, 128) * 1px);
		height: calc(var(--row-height, 128) * 1px);
		left: calc(var(--scroll-ox, 0) * -1px);
		top: calc(var(--scroll-oy, 0) * -1px);
		flex-shrink: 0;
		flex-grow: 0;
		font-family: monospace;
		font-size: 0.9em;
		display: flex;
		padding: 2px;
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
	}
</style>
