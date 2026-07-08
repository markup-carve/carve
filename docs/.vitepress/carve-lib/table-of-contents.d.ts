import type { CarveExtension } from './extension.js';
/** Options for the {@link tableOfContents} extension. */
export interface TableOfContentsOptions {
    /** Lowest heading level to include (1-6). Default 1. */
    minLevel?: number;
    /** Highest heading level to include (1-6). Default 6. */
    maxLevel?: number;
    /** List element for the entries. Default `'ul'`. */
    listType?: 'ul' | 'ol';
    /** CSS class on the `<nav>` container. Default `'toc'`. */
    cssClass?: string;
    /** Insert the generated TOC at the top or bottom of the document. Default `'top'`. */
    position?: 'top' | 'bottom';
    /** Wrap the TOC in a `<details>`/`<summary>` disclosure so it can be collapsed.
     *  Off by default; when off the output is the unchanged `<nav class="toc">`. */
    collapsible?: boolean;
    /** Summary label for the disclosure (only used when `collapsible` is true). Default `'Table of Contents'`. */
    summary?: string;
    /** Render the disclosure expanded by default (only used when `collapsible` is true). */
    open?: boolean;
}
/**
 * Generate a table of contents from the document's headings, ported from
 * carve-php's TableOfContentsExtension. A `beforeRender` transform that
 * collects headings (with their resolved ids) and injects a `<nav>` of nested
 * links at the top or bottom of the document.
 *
 * ```ts
 * carveToHtml(src, { extensions: [tableOfContents()] })
 * // <nav class="toc"><ul><li><a href="#intro">Intro</a> … </ul></nav> … document …
 * ```
 *
 * Configurable `minLevel`, `maxLevel`, `listType`, `cssClass`, and `position`.
 * Set `collapsible: true` to wrap the TOC in a `<details>`/`<summary>` disclosure
 * (closed unless `open: true`), with the label from `summary`.
 */
export declare function tableOfContents(opts?: TableOfContentsOptions): CarveExtension;
/**
 * In-document TOC placement directive (Tier-3). Unlike {@link tableOfContents}
 * (which injects one TOC at the document top or bottom), this renders a
 * `<nav class="toc">` exactly where the author writes a `::: toc` block, so a
 * long document can place its contents after an intro. Off by default.
 *
 * The block parses as a typed admonition (`kind: 'toc'`); this extension takes
 * over its rendering. The level window is set with attributes on the line
 * *before* the opener (Carve attaches `:::`-block attributes on a preceding
 * attribute line, not inline on the opener):
 *
 * ```
 * ::: toc              (all levels, 1-6)
 * :::
 *
 * {depth=2}            (levels 1-2)
 * ::: toc
 * :::
 *
 * {from=2 to=4}        (levels 2-4)
 * ::: toc
 * :::
 * ```
 *
 * Reads the resolved (dedup-aware) heading ids from `heading.attrs.id`, so
 * links always match the emitted `<h*>` anchors. If the extension is absent the
 * block degrades to a plain `<aside class="admonition toc">` placeholder.
 */
export declare function tocPlacement(): CarveExtension;
//# sourceMappingURL=table-of-contents.d.ts.map