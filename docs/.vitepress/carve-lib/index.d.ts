import type { Document } from './ast.js';
import { type ParseOptions } from './parse.js';
import { type RenderOptions } from './render-html.js';
export * from './ast.js';
export type { ParseOptions } from './parse.js';
export type { RenderOptions } from './render-html.js';
export { djotMigrationWarnings, formatMigrationWarnings, type MigrationWarning, } from './djot-migrate.js';
/** Parse Carve source into a typed AST. */
export declare function parse(source: string, opts?: ParseOptions): Document;
/** Render a Carve AST to HTML matching the spec corpus. */
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
/** Resolve heading ids and </#id> cross-references (post-parse semantic pass). */
export declare function resolve(doc: Document): Document;
/** Convenience: parse + resolve + render in one call. */
export declare function carveToHtml(source: string, opts?: ParseOptions & RenderOptions): string;
//# sourceMappingURL=index.d.ts.map