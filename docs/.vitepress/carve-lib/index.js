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
import { renderMarkdown as renderMarkdownImpl, } from './render-markdown.js';
import { renderPlainText as renderPlainTextImpl, } from './render-plain.js';
import { renderAnsi as renderAnsiImpl } from './render-ansi.js';
export * from './ast.js';
export { djotMigrationWarnings, formatMigrationWarnings, applyMigrationFixes, } from './djot-migrate.js';
export { markdownToCarve } from './markdown-migrate.js';
export { lintCarve, formatLintWarnings, } from './lint.js';
export { tabNormalize } from './tab-normalize.js';
export { details } from './details.js';
export { mermaid } from './mermaid.js';
export { wikilinks } from './wikilinks.js';
export { autolink } from './autolink.js';
export { externalLinks } from './external-links.js';
export { tableOfContents } from './table-of-contents.js';
export { headingPermalinks } from './heading-permalinks.js';
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
/** Render a resolved Carve AST to Markdown. */
export function renderMarkdown(ast, opts = {}) {
    return renderMarkdownImpl(ast, opts);
}
/** Render a resolved Carve AST to plain text. */
export function renderPlainText(ast, opts = {}) {
    return renderPlainTextImpl(ast, opts);
}
/** Render a resolved Carve AST to ANSI terminal text. */
export function renderAnsi(ast, opts = {}) {
    return renderAnsiImpl(ast, opts);
}
/**
 * Post-parse semantic resolution: heading ids, `</#id>` crossrefs,
 * implicit heading references (`[Foo][]` -> `#foo`), and finalization
 * of any reference-link placeholder the parse phase left unresolved
 * (no explicit `[label]: url` def and no matching heading) to its
 * literal source text.
 */
export function resolve(doc, opts = {}) {
    return resolveHeadingIds(doc, opts.asciiHeadingIds ?? false);
}
/** Convenience: parse + resolve + render in one call. */
export function carveToHtml(source, opts = {}) {
    const exts = opts.extensions ?? [];
    // `sourceLine` rendering needs block positions, so enable parsing them.
    // Extensions are forwarded to the parse so their matchers add syntax.
    const parseOpts = {
        ...opts,
        extensions: exts,
        ...(opts.sourceLine ? { positions: true } : {}),
    };
    let doc = resolve(parse(source, parseOpts), { asciiHeadingIds: opts.asciiHeadingIds ?? false });
    for (const ext of exts)
        if (ext.afterParse)
            doc = ext.afterParse(doc);
    for (const ext of exts)
        if (ext.beforeRender)
            doc = ext.beforeRender(doc);
    return renderHtml(doc, opts);
}
/** Convenience: parse + resolve + render Markdown in one call. */
export function carveToMarkdown(source, opts = {}) {
    const doc = resolve(parse(source, opts), { asciiHeadingIds: opts.asciiHeadingIds ?? false });
    return renderMarkdown(doc, opts);
}
/** Convenience: parse + resolve + render plain text in one call. */
export function carveToPlainText(source, opts = {}) {
    const doc = resolve(parse(source, opts), { asciiHeadingIds: opts.asciiHeadingIds ?? false });
    return renderPlainText(doc, opts);
}
/** Convenience: parse + resolve + render ANSI terminal text in one call. */
export function carveToAnsi(source, opts = {}) {
    const doc = resolve(parse(source, opts), { asciiHeadingIds: opts.asciiHeadingIds ?? false });
    return renderAnsi(doc, opts);
}
//# sourceMappingURL=index.js.map