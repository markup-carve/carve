export interface MigrationWarning {
    /** 1-based line number. */
    line: number;
    /** 1-based column of the offending construct. */
    column: number;
    /** Stable rule id, e.g. "djot-emphasis-underline". */
    rule: string;
    /** Human-readable explanation of the silent mis-render. */
    message: string;
    /** The Carve syntax that preserves the intended meaning. */
    suggestion: string;
}
/**
 * Scan Djot/Carve source and return warnings for constructs that silently
 * change meaning under Carve. Empty array means the source is free of the
 * known Djot/Carve delimiter collisions.
 */
export declare function djotMigrationWarnings(source: string): MigrationWarning[];
/** Format warnings as `file:line:col rule — message (use: suggestion)`. */
export declare function formatMigrationWarnings(warnings: MigrationWarning[], file?: string): string;
//# sourceMappingURL=djot-migrate.d.ts.map