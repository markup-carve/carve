export type StampForm = 'line' | 'block';
/** Build the marker text (no surrounding blank lines / trailing newline). */
export declare function buildMarker(generatedBy: string, form: StampForm): string;
/**
 * Remove a trailing provenance marker (either form) from already-formatted
 * Carve, returning the body with no trailing blank lines. Recognizes the marker
 * by its `carve-version:` first field, so unrelated trailing comments are kept.
 */
export declare function stripTrailingMarker(formatted: string): string;
/**
 * Append (or replace) the provenance marker on already-formatted Carve.
 * `generatedBy` is the engine identity, e.g. `carve-js 0.1.0`.
 */
export declare function stampCarve(formatted: string, generatedBy: string, form?: StampForm): string;
//# sourceMappingURL=stamp.d.ts.map