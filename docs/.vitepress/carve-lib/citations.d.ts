import type { CarveExtension } from './extension.js';
export interface CitationsOptions {
    /** `numbered` (default) emits `[1]`; `author-date` emits `(Author Year)`. */
    mode?: 'numbered' | 'author-date';
}
/**
 * Citations (#90, Tier-2). Bracketed `[@key]` references with an in-document
 * `[@key]: entry` bibliography and a generated references list. Bare `@key`
 * stays a core mention; only tail-less brackets containing a `@key` are
 * claimed. See docs/superpowers/specs/2026-06-11-citations-design.md.
 */
export declare function citations(opts?: CitationsOptions): CarveExtension;
//# sourceMappingURL=citations.d.ts.map