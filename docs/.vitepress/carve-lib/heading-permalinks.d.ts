import type { CarveExtension } from './extension.js';
/** Options for the {@link headingPermalinks} extension. */
export interface HeadingPermalinksOptions {
    /** Anchor glyph. Default `'¶'`. */
    symbol?: string;
    /** CSS class on the anchor. Default `'permalink'`. */
    cssClass?: string;
    /** `aria-label` on the anchor. Default `'Permalink'`. */
    ariaLabel?: string;
    /** Heading levels (1-6) to add a permalink to. Default all. */
    levels?: number[];
    /** Place the anchor before the heading text instead of after. Default false. */
    prepend?: boolean;
}
/**
 * Append (or prepend) a clickable permalink anchor to each heading, ported
 * from carve-php's HeadingPermalinksExtension. Implemented via the heading
 * block renderer, so the `<section id>` wrapper stays core while the `<h*>`
 * gains the anchor:
 *
 * ```ts
 * carveToHtml('# My Heading', { extensions: [headingPermalinks()] })
 * // <section id="my-heading">
 * //   <h1>My Heading <a href="#my-heading" class="permalink" aria-label="Permalink">¶</a></h1>
 * // </section>
 * ```
 *
 * Configurable `symbol`, `cssClass`, `ariaLabel`, `levels`, and `prepend`.
 */
export declare function headingPermalinks(opts?: HeadingPermalinksOptions): CarveExtension;
//# sourceMappingURL=heading-permalinks.d.ts.map