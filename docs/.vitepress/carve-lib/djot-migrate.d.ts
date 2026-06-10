export interface MigrationWarning {
    /** 1-based line number. */
    line: number;
    /** 1-based column of the offending construct. */
    column: number;
    /** Stable rule id, e.g. "djot-emphasis-underline". */
    rule: string;
    /** Human-readable explanation of the silent mis-render. */
    message: string;
    /**
     * The Carve syntax that preserves the intended meaning. This is also the
     * exact replacement text `applyMigrationFixes` splices over [start, end):
     * the captured content is taken from the ORIGINAL source (not the
     * code-masked scan buffer), so a construct wrapping inline code stays
     * intact.
     */
    suggestion: string;
    /**
     * 0-based offset of the offending construct in the line-ending-normalized
     * source (`\r\n?` -> `\n`), inclusive. Splice target start.
     */
    start: number;
    /** 0-based offset in the normalized source, exclusive. Splice target end. */
    end: number;
}
/**
 * Scan Djot/Carve source and return warnings for constructs that silently
 * change meaning under Carve. Empty array means the source is free of the
 * known Djot/Carve delimiter collisions.
 */
export declare function djotMigrationWarnings(source: string): MigrationWarning[];
/** Result of {@link applyMigrationFixes}. */
export interface MigrationFixResult {
    /**
     * The fixed source. Line endings are normalized to `\n` (matching how the
     * scanner and `parse()` see the input).
     */
    output: string;
    /** Warnings whose suggestion was spliced into `output`. */
    applied: MigrationWarning[];
    /**
     * Warnings left untouched because their span *crosses* another warning -
     * a partial overlap where neither span contains the other (e.g.
     * `**_x**_`, which is strong over `_x` AND emphasis over `x**`). Such
     * source is genuinely ambiguous, so it is reported for the caller to
     * resolve by hand rather than guessed at. Strictly *nested* collisions
     * (`**_x_**`) are NOT skipped - they compose and land in `applied`.
     */
    skipped: MigrationWarning[];
}
/**
 * Apply the auto-fixable Djot/Carve migration collisions to `source`,
 * returning the rewritten text. This is the autocorrect companion to
 * {@link djotMigrationWarnings}.
 *
 * Each fix is expressed as edits to its delimiters only, never its content,
 * so strictly nested collisions compose in one pass: the outer strong
 * delimiters and the inner emphasis delimiters sit at distinct offsets, so
 * `**_x_**` fixes to single-star bold wrapping a slash emphasis. Only
 * *crossing* collisions - partial overlaps where neither span contains the
 * other - are skipped, since that source is genuinely ambiguous. The scan is
 * not re-run on the output, so a fixed `~~x~~` -> `~x~` is never re-flagged
 * as a subscript.
 */
export declare function applyMigrationFixes(source: string): MigrationFixResult;
/** Format warnings as `file:line:col rule — message (use: suggestion)`. */
export declare function formatMigrationWarnings(warnings: MigrationWarning[], file?: string): string;
//# sourceMappingURL=djot-migrate.d.ts.map