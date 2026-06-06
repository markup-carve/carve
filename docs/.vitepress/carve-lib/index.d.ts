import type { Document } from './ast.js';
import { type ParseOptions } from './parse.js';
import { type RenderOptions } from './render-html.js';
export * from './ast.js';
export type { ParseOptions } from './parse.js';
export type { RenderOptions } from './render-html.js';
export type { CarveExtension, ExtensionRenderer, ExtensionRenderContext, } from './extension.js';
export { djotMigrationWarnings, formatMigrationWarnings, type MigrationWarning, } from './djot-migrate.js';
export { markdownToCarve } from './markdown-migrate.js';
/**
 * Parse Carve source into a typed AST.
 *
 * This is the syntactic pass only. Semantic resolution (heading ids,
 * crossrefs, implicit heading refs, unresolved-ref fallback to literal
 * text) happens in `resolve()`. Most callers want `carveToHtml()` or
 * `renderHtml(resolve(parse(src)))`.
 */
export declare function parse(source: string, opts?: ParseOptions): Document;
/** Render a Carve AST to HTML matching the spec corpus. */
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
/**
 * Post-parse semantic resolution: heading ids, `</#id>` crossrefs,
 * implicit heading references (`[Foo][]` -> `#foo`), and finalization
 * of any reference-link placeholder the parse phase left unresolved
 * (no explicit `[label]: url` def and no matching heading) to its
 * literal source text.
 */
export declare function resolve(doc: Document, opts?: {
    asciiHeadingIds?: boolean;
}): Document;
/** Convenience: parse + resolve + render in one call. */
export declare function carveToHtml(source: string, opts?: ParseOptions & RenderOptions): string;
//# sourceMappingURL=index.d.ts.map