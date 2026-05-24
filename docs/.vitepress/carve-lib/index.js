/*
 * Public API for @markup-carve/carve.
 *
 * Implementation status:
 *   ✓ Headings (M1, step 1)
 *   - Paragraphs, lists, blockquotes, fences, tables, frontmatter, hr,
 *     admonitions, captions — to come in M1
 *   - All inline constructs — to come in M2
 *
 * Processing pipeline: parse -> resolve -> renderHtml.
 * Callers using parse() + renderHtml() directly must call resolve() in
 * between to enable:
 *   - heading id assignment (`# Foo` -> id `foo`)
 *   - `</#id>` cross-reference resolution
 *   - implicit heading references (`[Foo][]` -> `#foo`)
 *   - finalization of any unresolved reference link (a Link node with
 *     `ref` still set, e.g. `[never defined][]`) to its literal source
 *     text — parse() leaves it as a placeholder so the implicit-heading
 *     pass can see it.
 */
import { parse as parseImpl } from './parse.js';
import { resolveHeadingIds } from './heading-ids.js';
import { renderHtml as renderHtmlImpl } from './render-html.js';
export * from './ast.js';
export { djotMigrationWarnings, formatMigrationWarnings, } from './djot-migrate.js';
/**
 * Parse Carve source into a typed AST.
 *
 * This is the syntactic pass only. Semantic resolution (heading ids,
 * crossrefs, implicit heading refs, unresolved-ref fallback to literal
 * text) happens in `resolve()`. Most callers want `carveToHtml()` or
 * `renderHtml(resolve(parse(src)))`.
 */
export function parse(source, opts = {}) {
    return parseImpl(source, opts);
}
/** Render a Carve AST to HTML matching the spec corpus. */
export function renderHtml(ast, opts = {}) {
    return renderHtmlImpl(ast, opts);
}
/**
 * Post-parse semantic resolution: heading ids, `</#id>` crossrefs,
 * implicit heading references (`[Foo][]` -> `#foo`), and finalization
 * of any reference-link placeholder the parse phase left unresolved
 * (no explicit `[label]: url` def and no matching heading) to its
 * literal source text.
 */
export function resolve(doc) {
    return resolveHeadingIds(doc);
}
/** Convenience: parse + resolve + render in one call. */
export function carveToHtml(source, opts = {}) {
    let doc = resolve(parse(source, opts));
    const exts = opts.extensions ?? [];
    for (const ext of exts)
        if (ext.afterParse)
            doc = ext.afterParse(doc);
    for (const ext of exts)
        if (ext.beforeRender)
            doc = ext.beforeRender(doc);
    return renderHtml(doc, opts);
}
//# sourceMappingURL=index.js.map