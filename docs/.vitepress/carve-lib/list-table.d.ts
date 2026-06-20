import type { CarveExtension } from './extension.js';
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
export declare function listTable(): CarveExtension;
//# sourceMappingURL=list-table.d.ts.map