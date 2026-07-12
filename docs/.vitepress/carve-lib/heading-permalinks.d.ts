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
    /**
     * Only reveal the anchor on heading hover: wrap it in a
     * `<span class="permalink-wrapper permalink-hover">` the host stylesheet
     * targets via `h*:hover > .permalink-hover`. Default false (bare anchor).
     */
    showOnHover?: boolean;
    /** Add a `data-permalink-copy` hook the host JS can use to copy the URL. Default false. */
    copyToClipboard?: boolean;
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
 * Configurable `symbol`, `cssClass`, `ariaLabel`, `levels`, `prepend`,
 * `showOnHover`, and `copyToClipboard`.
 */
export declare function headingPermalinks(opts?: HeadingPermalinksOptions): CarveExtension;
//# sourceMappingURL=heading-permalinks.d.ts.map