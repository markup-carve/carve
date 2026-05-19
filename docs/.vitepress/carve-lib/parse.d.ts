import type { Attrs, Document } from './ast.js';
export interface ParseOptions {
    positions?: boolean;
}
export declare function parse(source: string, _opts?: ParseOptions): Document;
/** Reference labels are matched case-insensitively, whitespace-collapsed. */
export declare function normalizeRefLabel(label: string): string;
export declare function parseAttrs(src: string): Attrs;
//# sourceMappingURL=parse.d.ts.map