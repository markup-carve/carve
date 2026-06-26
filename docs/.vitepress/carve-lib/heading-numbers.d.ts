import type { CarveExtension } from './extension.js';
/** Options for the {@link headingNumbers} extension (#198). */
export interface HeadingNumbersOptions {
    /** Top numbered heading level (1-6). Default 1; set 2 when `#` is the title. */
    minLevel?: number;
    /** Cross-reference prefix word. Default `'Section'` (use `'§'`, a locale word, …). */
    label?: string;
    /** Auto-filled cross-reference text. Default `'number-title'`. */
    crossref?: 'number' | 'number-title' | 'title';
}
/**
 * HeadingNumbers (#198, Tier-3). Auto-number sections and rewrite auto-filled
 * `</#id>` cross-references to "Section 1.2 - Title". Render-stage, opt-in, no
 * new syntax (reads headings + the `{.unnumbered}` class). Off by default,
 * never corpus-pinned. See docs/extensions.md §9.
 */
export declare function headingNumbers(opts?: HeadingNumbersOptions): CarveExtension;
//# sourceMappingURL=heading-numbers.d.ts.map