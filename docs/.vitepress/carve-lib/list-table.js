/**
 * Render `::: list-table` admonitions as real HTML `<table>` markup, with the
 * table authored as a nested list so that cells can hold full block content
 * (paragraphs, lists, code, …) that the native pipe-table syntax cannot.
 *
 * A `list-table` block is authored as an outer list where each outer item is a
 * row and each inner item is a cell:
 *
 *     {header-rows=1}
 *     ::: list-table "Quarterly results"
 *     - - Region
 *       - Notes
 *     - - EMEA
 *       - Strong quarter.
 *
 *         Drivers:
 *
 *         - new logos
 *         - renewals
 *     :::
 *
 * Note the attributes (`{header-rows=1}`) sit on the PRECEDING line: a trailing
 * `{...}` on the `:::` opener would make the whole block literal in Carve.
 *
 * The caption comes from the quoted title; `header-rows=N` promotes the first N
 * rows to `<thead>`/`<th>`, and `header-cols=N` promotes the first N cells of
 * every row to row-header `<th>`. Single-paragraph cells collapse to inline
 * content (`<td>text</td>`), matching tight list-item rendering; multi-block
 * cells keep their block wrappers.
 *
 * Cells may span rows and columns using the SAME continuation markers Carve's
 * native pipe tables use: a cell whose sole inline content is a lone `^` merges
 * with the cell ABOVE (rowspan), and a lone `<` merges with the cell to the
 * LEFT (colspan). The output `<table>` matches what the equivalent pipe table
 * would produce. A cell carrying its own attribute block is never a span marker
 * - its `^`/`<` content is then literal (the same escape pipe tables use).
 *
 * Only `::: list-table` blocks are claimed; every other admonition defers to
 * the core renderer. When this extension is not registered the block degrades
 * to the default `<div class="list-table">` holding the literal nested list, so
 * content is never silently dropped.
 *
 * Implemented as a block-node renderer (extensions contract §2.3): the inner
 * cell content is rendered by the core renderer at the correct nesting level.
 *
 * @example
 * carveToHtml(src, { extensions: [listTable()] })
 */
export function listTable() {
    return {
        name: 'list-table',
        blockRenderers: {
            admonition: (node, ctx) => {
                const adm = node;
                // Only claim `::: list-table` blocks; everything else defers to the
                // core admonition renderer (and any other extension that wants it).
                if (adm.kind !== 'list-table')
                    return undefined;
                return renderListTable(adm, ctx) ?? undefined;
            },
        },
    };
}
/** DoS guards: span resolution is ~O(rows^2), so cap the dimensions of a
 *  list-table and defer anything larger to the plain nested-list div. Limits are
 *  far beyond any legitimate hand-authored table. Kept identical across impls. */
const MAX_LIST_TABLE_ROWS = 10_000;
const MAX_LIST_TABLE_CELLS = 100_000;
/** Render the `<table>` for a `list-table` block, or null to defer. */
function renderListTable(node, ctx) {
    const pad = ctx.indent(ctx.level);
    // Claim the block only when its sole child is the table list. If it holds
    // extra siblings (a stray paragraph before/after the list, etc.) defer to the
    // default renderer so content is never silently dropped - the block then
    // degrades to the literal nested-list div.
    if (node.children.length !== 1 || node.children[0].type !== 'list')
        return null;
    const outerList = node.children[0];
    // Each outer list item is a row; its cells are the items of its inner list,
    // with any trailing non-list block recorded against the most recently opened
    // cell. Cell extraction is NON-MUTATING: trailing stray blocks are collected
    // into `entry.extras` rather than appended onto the cell node, so the defer
    // decision below is made on a pristine AST and a deferred render is
    // byte-identical to the plain div.
    const rows = [];
    for (const rowItem of outerList.items) {
        const cells = extractCells(rowItem);
        // A null row is malformed (a block sits BEFORE the inner cell list, e.g.
        // `- row intro` then an indented `- A`); it cannot become table cells
        // without dropping the leading content. Defer the whole block.
        if (cells === null)
            return null;
        rows.push(cells);
    }
    if (rows.length === 0)
        return null;
    // A row that yielded zero cells (e.g. a row authored as a plain paragraph,
    // `- not-a-cell-row`, with no inner cell list) cannot be rendered as table
    // cells without dropping its content. Defer the whole block to the default
    // renderer so the literal nested list is emitted and nothing is lost.
    for (const cells of rows) {
        if (cells.length === 0)
            return null;
    }
    // DoS guard: span resolution rescans prior rows, so a pathologically large
    // `^`/`<` table is ~O(rows^2). Cap the dimensions and defer an over-large
    // table to the plain div (content preserved, no quadratic blow-up).
    const totalCells = rows.reduce((n, cells) => n + cells.length, 0);
    if (rows.length > MAX_LIST_TABLE_ROWS || totalCells > MAX_LIST_TABLE_CELLS)
        return null;
    const headerRows = headerCount(node.attrs?.keyValues?.['header-rows']);
    const headerCols = headerCount(node.attrs?.keyValues?.['header-cols']);
    // Resolve `^`/`<` span markers into a positional grid, mirroring carve-js's
    // pipe-table span model (render-html `renderTable`) so the output is identical
    // to the equivalent pipe table. The header-row count clamps rowspans at the
    // header/body boundary: an HTML cell cannot reliably span across
    // <thead>/<tbody>, so a `^` that would extend a header cell down into the body
    // is not merged and degrades to an empty cell.
    const grid = resolveSpans(rows, headerRows);
    // Assign each rendered cell an output column by flowing it top-down past any
    // column a rowspan from an earlier row still holds (browser / pipe-table
    // semantics). The widest row's reach sets the column count for ragged-row
    // padding.
    const placement = placeColumns(grid);
    const columnCount = placement.columnCount;
    const lines = [];
    const title = node.title ? inlineText(node.title) : '';
    if (title.trim() !== '') {
        lines.push(`${pad}  <caption>${ctx.escapeHtml(title)}</caption>`);
    }
    const renderRow = (gridRow, rowIndex) => {
        const isHeaderRow = rowIndex < headerRows;
        const cols = placement.cols[rowIndex];
        let html = '';
        let nextCol = 0;
        gridRow.forEach((entry, i) => {
            // A merged `^`/`<` emits nothing - its column was absorbed by the cell it
            // merged into (a rowspan above, or the cell to its left).
            if (entry.skip)
                return;
            const col = cols[i];
            const isHeaderCell = isHeaderRow || col < headerCols;
            const tag = isHeaderCell ? 'th' : 'td';
            let attrHtml = '';
            if (entry.rowspan > 1)
                attrHtml += ` rowspan="${entry.rowspan}"`;
            if (entry.colspan > 1)
                attrHtml += ` colspan="${entry.colspan}"`;
            // Carry the cell's own list-item attributes (e.g. `{.x}`) onto the
            // <td>/<th> so authored cell styling is not dropped. The structural span
            // attributes above always win on conflict.
            attrHtml += renderCellAttributes(entry.cell, ctx);
            // A `^`/`<` marker (merged or not) renders no content, not literal `^`
            // (pipe-table parity).
            const content = entry.marker !== null ? '' : renderCell(entry.cell, entry.extras, ctx);
            html += `<${tag}${attrHtml}>${content}</${tag}>`;
            nextCol = col + entry.colspan;
        });
        // Pad trailing columns so a ragged row stays rectangular. A rowspan from
        // above that reaches the end of the row already covers those columns, so it
        // suppresses padding (placement.rowReach accounts for it).
        let col = Math.max(nextCol, placement.rowReach[rowIndex]);
        for (; col < columnCount; col++) {
            const tag = isHeaderRow || col < headerCols ? 'th' : 'td';
            html += `<${tag}></${tag}>`;
        }
        return `<tr>${html}</tr>`;
    };
    const headGrid = grid.slice(0, headerRows);
    const bodyGrid = grid.slice(headerRows);
    if (headGrid.length > 0) {
        let thead = '';
        headGrid.forEach((gridRow, rowIndex) => {
            thead += renderRow(gridRow, rowIndex);
        });
        lines.push(`${pad}  <thead>${thead}</thead>`);
    }
    if (bodyGrid.length > 0) {
        const body = [];
        bodyGrid.forEach((gridRow, offset) => {
            body.push(`${pad}    ${renderRow(gridRow, offset + headerRows)}`);
        });
        lines.push(`${pad}  <tbody>\n${body.join('\n')}\n${pad}  </tbody>`);
    }
    const attrs = renderTableAttributes(node, ctx);
    return `${pad}<table${attrs}>\n${lines.join('\n')}\n${pad}</table>`;
}
/**
 * Assign each rendered cell an output column by flowing it top-down past any
 * column a rowspan from an earlier row still holds - the same flow a browser
 * (and carve-js's pipe table) uses. Skip cells (merged markers) take no column.
 * Returns each cell's start column, each row's reach (the furthest column it
 * fills, including rowspan coverage from above) and the overall column count.
 */
function placeColumns(grid) {
    // occupiedUntil[col] = exclusive row index through which a rowspan holds col.
    const occupiedUntil = {};
    const cols = [];
    const rowReach = [];
    let columnCount = 0;
    for (let r = 0; r < grid.length; r++) {
        const rowCols = [];
        let col = 0;
        let reach = 0;
        // A rowspan descending from above into this row reaches at least its column.
        for (const [colStr, end] of Object.entries(occupiedUntil)) {
            if (end > r)
                reach = Math.max(reach, Number(colStr) + 1);
        }
        for (const entry of grid[r]) {
            if (entry.skip) {
                rowCols.push(-1);
                continue;
            }
            // Flow past columns a rowspan from above still holds in this row.
            while ((occupiedUntil[col] ?? 0) > r)
                col++;
            rowCols.push(col);
            if (entry.rowspan > 1) {
                for (let c = col; c < col + entry.colspan; c++) {
                    occupiedUntil[c] = Math.max(occupiedUntil[c] ?? 0, r + entry.rowspan);
                }
            }
            col += entry.colspan;
            reach = Math.max(reach, col);
        }
        cols.push(rowCols);
        rowReach.push(reach);
        columnCount = Math.max(columnCount, reach);
    }
    return { cols, rowReach, columnCount };
}
/**
 * Extract the cells of a row WITHOUT mutating the AST, or null if the row is
 * malformed (a block sits before its inner cell list, so rendering it as cells
 * would drop that leading content - the caller then defers the whole block).
 *
 * A row's cells are the items of its inner list. Any non-list block sibling
 * AFTER the inner list (e.g. a trailing paragraph the parser left outside it)
 * belongs to the most recently opened cell so multi-block content is never
 * dropped. Those stray blocks are recorded in `entry.extras` rather than
 * appended onto the cell node, so the source tree stays pristine for the defer
 * decision. A non-list block BEFORE any cell has no home and signals a
 * malformed row (return null).
 */
function extractCells(rowItem) {
    const cells = [];
    for (const child of rowItem.children) {
        if (child.type === 'list') {
            for (const cellItem of child.items) {
                cells.push({ cell: cellItem, extras: [] });
            }
            continue;
        }
        // A non-list block before any cell would be dropped: defer the whole block.
        if (cells.length === 0)
            return null;
        // A stray block following the inner list belongs to the last cell; record
        // it against that cell without touching the node tree.
        cells[cells.length - 1].extras.push(child);
    }
    return cells;
}
/**
 * Resolve `^` / `<` span markers into a positional grid, EXACTLY mirroring
 * carve-js's pipe-table span model (render-html `renderTable`) so the output is
 * identical to the equivalent pipe table.
 *
 * Each row becomes a positional list of grid entries (one per source cell). A
 * `^` cell grows the rowspan of the nearest non-skipped cell directly above it
 * in the same source column; a `<` cell grows the colspan of the nearest
 * non-skipped cell to its left. A merged marker is flagged `skip` and emits
 * nothing; an unmergeable marker (first row `^`, leading `<`, or a clamped one)
 * stays a rendered-empty cell. A cell carrying its own attribute block, or one
 * that owns trailing blocks, is never a bare marker (its `^`/`<` is literal).
 *
 * `headerRows` clamps a rowspan so it never crosses the header/body boundary: a
 * `^` in a body row whose source sits in the header rows is NOT merged and
 * degrades to an empty cell (an HTML cell cannot span row groups reliably).
 */
function resolveSpans(rows, headerRows = 0) {
    const grid = rows.map((cells) => cells.map((entry) => ({
        cell: entry.cell,
        extras: entry.extras,
        marker: markerOf(entry),
        rowspan: 1,
        colspan: 1,
        skip: false,
    })));
    // Per source column, the last row index (above the current one) whose cell is
    // not skipped - the nearest source a `^` can extend. Maintained incrementally
    // so an all-`^` column resolves in O(1) (carve-js parity).
    const lastNonSkip = [];
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const entry = grid[r][c];
            if (entry.skip)
                continue;
            if (entry.marker === '^' && r > 0) {
                const up = lastNonSkip[c];
                const src = up !== undefined ? grid[up]?.[c] : undefined;
                // Clamp at the header/body boundary: a `^` in a body row must not extend
                // a cell that originated in the header rows. Leave it unmerged (it then
                // renders as an empty cell) so no <th rowspan> crosses into <tbody>.
                const crossesHeader = up !== undefined && up < headerRows && r >= headerRows;
                if (src && !crossesHeader) {
                    src.rowspan++;
                    entry.skip = true;
                }
            }
            else if (entry.marker === '<' && c > 0) {
                let left = c - 1;
                while (left >= 0 && grid[r][left].skip)
                    left--;
                const src = left >= 0 ? grid[r][left] : undefined;
                if (src) {
                    src.colspan++;
                    entry.skip = true;
                }
            }
            // A cell that ends up non-skipped becomes the nearest source for the cells
            // below it in this column.
            if (!entry.skip)
                lastNonSkip[c] = r;
        }
    }
    return grid;
}
/**
 * Detect a span marker cell.
 *
 * Returns `'^'` or `'<'` when the cell's sole inline content is exactly that
 * marker character, or null otherwise. A cell carrying its own attribute block
 * is never a marker (the `^`/`<` is then literal). A cell that owns trailing
 * blocks (recorded in `entry.extras`) is multi-block content, so it is never a
 * bare marker either - the extra block keeps it a real cell whose `^`/`<` first
 * line stays literal.
 */
function markerOf(entry) {
    const cell = entry.cell;
    if (cell.attrs)
        return null;
    // Trailing blocks make this a multi-block cell, not a bare marker.
    if (entry.extras.length > 0)
        return null;
    if (cell.children.length !== 1)
        return null;
    const paragraph = cell.children[0];
    if (paragraph.type !== 'paragraph' || paragraph.attrs)
        return null;
    const inlines = paragraph.children;
    if (inlines.length !== 1)
        return null;
    const text = inlines[0];
    if (text.type !== 'text' || text.attrs)
        return null;
    const content = text.value.trim();
    if (content === '^' || content === '<')
        return content;
    return null;
}
/**
 * Render a single cell's content.
 *
 * A cell whose only block is an attribute-free paragraph collapses to its
 * inline content (no `<p>` wrapper), matching tight list-item/table-cell
 * rendering. Otherwise the block children render normally and keep their
 * wrappers. Trailing stray blocks (collected non-mutatingly by extractCells)
 * render after the cell's own children, so multi-block content the parser left
 * outside the inner list is preserved without ever having mutated the tree.
 */
function renderCell(cell, extras, ctx) {
    const blocks = [...cell.children, ...extras];
    if (blocks.length === 1 && blocks[0].type === 'paragraph' && !blocks[0].attrs) {
        const html = ctx.renderChildren([blocks[0]], 0);
        // Strip the single <p>…</p> wrapper to inline the content.
        const m = /^<p>([\s\S]*)<\/p>$/.exec(html);
        if (m)
            return m[1];
        return html;
    }
    // Render each block at level 0 (no extra indentation) and join with newlines,
    // matching the carve-php reference's cell layout.
    return ctx.renderChildren(blocks, 0);
}
/**
 * Build a cell's own attribute markup for its `<td>`/`<th>` tag.
 *
 * Carries a cell list-item's authored attributes (id, classes, key=value) onto
 * the rendered cell tag, so cell-level styling is not silently dropped. The
 * structural span attributes (rowspan/colspan) are emitted by the caller and
 * take precedence; any rowspan/colspan the author wrote on the cell itself is
 * dropped here to avoid a duplicate attribute.
 */
function renderCellAttributes(cell, ctx) {
    if (!cell.attrs)
        return '';
    return ctx.renderAttrs(stripSpanAttrs(cell.attrs));
}
/**
 * Build the `<table>` tag attributes.
 *
 * Drops the structural attributes consumed by this extension (`header-rows`,
 * `header-cols`) and the auto `list-table` class (the `<table>` tag is itself
 * the styling hook); preserves any sibling classes and other attributes in
 * source order.
 */
function renderTableAttributes(node, ctx) {
    const attrs = node.attrs;
    if (!attrs)
        return '';
    const keyValues = { ...(attrs.keyValues ?? {}) };
    delete keyValues['header-rows'];
    delete keyValues['header-cols'];
    const classes = (attrs.classes ?? []).filter((c) => c !== '' && c !== 'list-table');
    const order = (attrs.order ?? []).filter((s) => s !== 'header-rows' && s !== 'header-cols' && !(s === '.class' && classes.length === 0));
    const cleaned = {};
    if (attrs.id !== undefined)
        cleaned.id = attrs.id;
    if (classes.length > 0)
        cleaned.classes = classes;
    if (Object.keys(keyValues).length > 0)
        cleaned.keyValues = keyValues;
    if (order.length > 0)
        cleaned.order = order;
    return ctx.renderAttrs(cleaned);
}
/** Drop any author-written span attribute (case-insensitively) so the computed
 *  structural rowspan/colspan stays the only one emitted. */
function stripSpanAttrs(attrs) {
    if (!attrs.keyValues)
        return attrs;
    const has = Object.keys(attrs.keyValues).some((k) => {
        const l = k.toLowerCase();
        return l === 'rowspan' || l === 'colspan';
    });
    if (!has)
        return attrs;
    const keyValues = Object.fromEntries(Object.entries(attrs.keyValues).filter(([k]) => {
        const l = k.toLowerCase();
        return l !== 'rowspan' && l !== 'colspan';
    }));
    const out = { ...attrs, keyValues };
    if (attrs.order) {
        out.order = attrs.order.filter((s) => {
            const l = s.toLowerCase();
            return l !== 'rowspan' && l !== 'colspan';
        });
    }
    return out;
}
/** Parse an integer attribute value, defaulting to 0. */
function toInt(value) {
    if (value === undefined)
        return 0;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 0 : n;
}
/**
 * Resolve a `header-rows` / `header-cols` attribute to a count.
 *
 * - absent (`undefined`) -> 0 (no header rows/cols)
 * - present but empty (the boolean form `{header-rows}`, which Carve stores as
 *   `header-rows=""`) -> 1, i.e. the first row/column is the header - the
 *   default a table with headers wants, so `{header-rows}` alone suffices
 * - an explicit number (`{header-rows=2}`) -> that count (clamped at 0)
 */
function headerCount(value) {
    if (value === undefined)
        return 0;
    if (value.trim() === '')
        return 1;
    return Math.max(0, toInt(value));
}
/** Flatten an inline tree to its text content (titles only). */
function inlineText(nodes) {
    let s = '';
    for (const node of nodes) {
        const n = node;
        if (typeof n.value === 'string')
            s += n.value;
        const kids = n.children ?? n.content;
        if (Array.isArray(kids))
            s += inlineText(kids);
    }
    return s;
}
//# sourceMappingURL=list-table.js.map