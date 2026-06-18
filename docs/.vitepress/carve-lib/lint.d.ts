import { type AsciiHeadingIdMode } from './heading-ids.js';
export interface LintWarning {
    /** 1-based line number. */
    line: number;
    /** 1-based column number. */
    column: number;
    /** Stable rule id, e.g. "broken-crossref". */
    rule: string;
    /** Human-readable explanation of the silent degradation. */
    message: string;
    /** 0-based start offset in the source, inclusive. */
    start: number;
    /** 0-based end offset in the source, exclusive. */
    end: number;
}
/**
 * Lint a Carve document for silent-failure problems: duplicate heading ids,
 * `</#id>` cross-references with no target, unresolved reference links,
 * missing/duplicate/unused footnotes, trailing heading attribute blocks,
 * legacy `raw FORMAT` fences, and block markers that leaked as paragraph text.
 *
 * `asciiHeadingIds` must match the value passed to `resolve()`, since it
 * changes how heading slugs (and therefore the valid id set) are computed.
 */
export declare function lintCarve(source: string, opts?: {
    asciiHeadingIds?: AsciiHeadingIdMode;
    lowercaseHeadingIds?: boolean;
}): LintWarning[];
/** Format lint warnings as `file:line:col rule — message`. */
export declare function formatLintWarnings(warnings: LintWarning[], file?: string): string;
//# sourceMappingURL=lint.d.ts.map