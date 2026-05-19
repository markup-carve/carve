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
 * Callers using parse() + renderHtml() directly must call resolve() in between
 * to enable heading id assignment and </#id> cross-reference resolution.
 */
import { parse as parseImpl } from './parse.js';
import { resolveHeadingIds } from './heading-ids.js';
import { renderHtml as renderHtmlImpl } from './render-html.js';
export * from './ast.js';
/** Parse Carve source into a typed AST. */
export function parse(source, opts = {}) {
    return parseImpl(source, opts);
}
/** Render a Carve AST to HTML matching the spec corpus. */
export function renderHtml(ast, opts = {}) {
    return renderHtmlImpl(ast, opts);
}
/** Resolve heading ids and </#id> cross-references (post-parse semantic pass). */
export function resolve(doc) {
    return resolveHeadingIds(doc);
}
/** Convenience: parse + resolve + render in one call. */
export function carveToHtml(source, opts = {}) {
    return renderHtml(resolve(parse(source, opts)), opts);
}
//# sourceMappingURL=index.js.map