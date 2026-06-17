import type { CarveExtension } from './extension.js';
/** Options for the {@link headingReference} extension. */
export interface HeadingReferenceOptions {
    /** CSS class(es) added to the resolved anchor. Default `'heading-ref'`. */
    cssClass?: string;
}
/**
 * Resolve `[[Heading Text]]` references to intra-document heading links, ported
 * from carve-php's HeadingReferenceExtension. Supports custom display text via
 * `[[Heading Text|click here]]`.
 *
 * References resolve by heading PLAIN TEXT (not author-guessed ids), so authors
 * do not depend on slug rules. Smart quotes in heading text are normalized so a
 * reference written with straight quotes still matches. A reference to a missing
 * heading - or one whose text is ambiguous (appears on more than one heading) -
 * falls back to its literal `[[…]]` source text.
 *
 * Uses the parse-stage inline matcher (core leaves `[[…]]` literal) plus a
 * `beforeRender` resolution pass that reads the resolved heading ids.
 *
 * Note: like carve-php, this shares the `[[…]]` syntax with {@link wikilinks};
 * use only one of the two on the same render.
 *
 * ```ts
 * carveToHtml('See [[Getting Started]].\n\n# Getting Started', {
 *   extensions: [headingReference()],
 * })
 * // <p>See <a href="#Getting-Started" class="heading-ref">Getting Started</a>.</p> …
 * ```
 */
export declare function headingReference(opts?: HeadingReferenceOptions): CarveExtension;
//# sourceMappingURL=heading-reference.d.ts.map