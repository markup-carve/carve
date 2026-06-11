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
 */
export declare function tableOfContents(opts?: TableOfContentsOptions): CarveExtension;
//# sourceMappingURL=table-of-contents.d.ts.map