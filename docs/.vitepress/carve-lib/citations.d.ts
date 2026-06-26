import type { CarveExtension } from './extension.js';
export interface ParsedLocator {
    label?: string;
    value?: string;
    suffixText?: string;
}
/** Parse a raw locator substring into label / value / suffix. Pure; never
 *  throws. See the design spec "Locator parsing" section. */
export declare function parseLocator(loc: string): ParsedLocator;
/** A CSL-JSON name object (the subset the minimal formatter reads). */
export interface CslName {
    family?: string;
    given?: string;
    literal?: string;
}
/** A CSL-JSON bibliography entry (the subset the minimal formatter reads;
 *  unknown fields are ignored). */
export interface CslEntry {
    id: string;
    author?: CslName[];
    issued?: {
        'date-parts'?: number[][];
        literal?: string;
    };
    title?: string;
    [k: string]: unknown;
}
export interface CitationsOptions {
    /** `numbered` (default) emits `[1]`; `author-date` emits `(Author Year)`. */
    mode?: 'numbered' | 'author-date';
    /**
     * Tier-3 Bibliography (#199): an external CSL-JSON pool. Keys resolve against
     * in-document `[@key]:` defs first, then this pool. When supplied (even
     * empty), in-text citations and the references list gain footnote-style
     * back-links. The host resolves the front-matter `bibliography:` path and
     * passes the parsed array here; the extension itself does no file I/O.
     */
    bibliography?: CslEntry[];
}
/**
 * Citations (#90, Tier-2). Bracketed `[@key]` references with an in-document
 * `[@key]: entry` bibliography and a generated references list. Bare `@key`
 * stays a core mention; only tail-less brackets containing a `@key` are
 * claimed. See docs/superpowers/specs/2026-06-11-citations-design.md.
 */
export declare function citations(opts?: CitationsOptions): CarveExtension;
//# sourceMappingURL=citations.d.ts.map