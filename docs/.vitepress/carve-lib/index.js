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
import { resolveHeadingIds, headingIdSlugOpts, promoteBlockImages, } from './heading-ids.js';
import { applyProfile as applyProfileImpl } from './profile-filter.js';
import { renderHtml as renderHtmlImpl } from './render-html.js';
import { renderMarkdown as renderMarkdownImpl, } from './render-markdown.js';
import { renderCarve as renderCarveImpl, } from './render-carve.js';
import { renderPlainText as renderPlainTextImpl, } from './render-plain.js';
import { renderAnsi as renderAnsiImpl } from './render-ansi.js';
export * from './ast.js';
export { djotMigrationWarnings, formatMigrationWarnings, applyMigrationFixes, } from './djot-migrate.js';
export { markdownToCarve } from './markdown-migrate.js';
export { lintCarve, formatLintWarnings, } from './lint.js';
export { tabNormalize } from './tab-normalize.js';
export { details } from './details.js';
export { listTable } from './list-table.js';
export { glossary } from './glossary.js';
export { headingNumbers } from './heading-numbers.js';
export { codeCallouts } from './code-callouts.js';
export { index } from './index-terms.js';
export { citations, } from './citations.js';
export { fencedRender, mermaid, d2, graphviz, wavedrom, abc, plantuml, vegaLite, chart, presets, } from './fenced-render.js';
export { mathBlock } from './math-block.js';
export { spoiler } from './spoiler.js';
export { colorSwatch, } from './color-swatch.js';
export { wikilinks } from './wikilinks.js';
export { autolink } from './autolink.js';
export { externalLinks } from './external-links.js';
export { tableOfContents, tocPlacement } from './table-of-contents.js';
export { headingPermalinks } from './heading-permalinks.js';
export { codeGroup } from './code-group.js';
export { tabs } from './tabs.js';
export { headingLevelShift } from './heading-level-shift.js';
export { headingReference } from './heading-reference.js';
export { defaultAttributes, } from './default-attributes.js';
export { Profile, LinkPolicy, ProfileViolationError, formatProfileViolation, canonicalType, CANONICAL_BLOCK_TYPES, CANONICAL_INLINE_TYPES, } from './profile.js';
export { applyProfile } from './profile-filter.js';
export { stampCarve, buildMarker, stripTrailingMarker } from './stamp.js';
export { SPEC_VERSION, LIB_VERSION } from './version.js';
/**
 * Enforce the profile's maximum input length BEFORE parsing, so an oversize
 * untrusted input is rejected without the parser doing any work (a giant input
 * is otherwise linear parse work even after the O(n) inline fixes). No-op when
 * no profile is set or its maxLength is 0 (unlimited). Length is measured in
 * UTF-8 bytes, matching carve-php's pre-parse strlen() check.
 */
function enforceProfileMaxLength(source, opts) {
    const profile = opts.profile;
    if (!profile)
        return;
    const maxLength = profile.getMaxLength();
    if (maxLength > 0 && byteLength(source) > maxLength) {
        throw new RangeError(`Input exceeds the profile's maximum length of ${maxLength} bytes ` +
            `(got ${byteLength(source)} bytes).`);
    }
}
/**
 * Apply a profile's feature / link / nesting restrictions to a resolved
 * document (after resolve, before render). Mutates and returns `doc`.
 *
 * Input-length enforcement is NOT done here - it runs pre-parse via
 * {@link enforceProfileMaxLength} in the `carveToX` entry points, so an oversize
 * input is rejected before the parser runs.
 */
function runProfile(doc, opts) {
    const profile = opts.profile;
    if (!profile)
        return doc;
    return applyProfileImpl(doc, profile, opts.profileBaseHost ?? null).doc;
}
/** UTF-8 byte length, matching PHP's strlen() on the source string. */
function byteLength(s) {
    return new TextEncoder().encode(s).length;
}
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
/** Render a resolved Carve AST to canonical Carve source. */
export function renderCarve(ast, opts = {}) {
    return renderCarveImpl(ast, opts);
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
    return resolveHeadingIds(doc, headingIdSlugOpts(opts));
}
/** Convenience: parse + resolve + render in one call. */
export function carveToHtml(source, opts = {}) {
    enforceProfileMaxLength(source, opts);
    const exts = opts.extensions ?? [];
    // `sourceLine` rendering needs block positions, so enable parsing them.
    // Extensions are forwarded to the parse so their matchers add syntax.
    const parseOpts = {
        ...opts,
        extensions: exts,
        ...(opts.sourceLine ? { positions: true } : {}),
    };
    let doc = applyTransforms(resolve(parse(source, parseOpts), {
        asciiHeadingIds: opts.asciiHeadingIds ?? false,
        lowercaseHeadingIds: opts.lowercaseHeadingIds ?? false,
    }), exts);
    doc = runProfile(doc, opts);
    return renderHtml(doc, opts);
}
/**
 * Run the renderer-agnostic extension transforms (`afterParse`,
 * `beforeRender`) over a resolved document. Renderer-specific output (block
 * renderers, inline renderers) is consulted by the HTML renderer only, but the
 * transform hooks mutate the AST itself, so they apply to every renderer -
 * matching carve-php, where a `beforeRender` extension (heading level shift,
 * default attributes, …) affects Markdown/PlainText/ANSI output too.
 */
function applyTransforms(doc, exts) {
    if (!exts)
        return doc;
    let out = doc;
    for (const ext of exts)
        if (ext.afterParse)
            out = ext.afterParse(out);
    for (const ext of exts)
        if (ext.beforeRender)
            out = ext.beforeRender(out);
    return out;
}
/** Convenience: parse + resolve + render Markdown in one call. */
export function carveToMarkdown(source, opts = {}) {
    enforceProfileMaxLength(source, opts);
    let doc = applyTransforms(resolve(parse(source, opts), {
        asciiHeadingIds: opts.asciiHeadingIds ?? false,
        lowercaseHeadingIds: opts.lowercaseHeadingIds ?? false,
    }), opts.extensions);
    doc = runProfile(doc, opts);
    return renderMarkdown(doc, opts);
}
/**
 * Convenience: parse + render canonical Carve source in one call.
 *
 * Unlike the other `carveToX` helpers, the formatter deliberately does NOT run
 * `resolve()` / extension transforms / profiles. Those are render-time
 * enrichments (auto heading ids, footnote/crossref numbering, default
 * attributes) and baking them back into the source would make the formatter
 * non-conservative - it must format what the author wrote, not the resolved
 * output. The semantic invariant still holds because `carveToHtml` re-applies
 * resolution on the formatted source.
 *
 * The one structural pass it DOES run is `promoteBlockImages`: a reference
 * image with a caption parses as a paragraph `[Image, SoftBreak, "^ …"]`, and
 * without promoting it to a <figure> the serializer would escape the caption's
 * leading `^` to `\^` (only carve-js's lenient parser reads that back as a
 * caption; carve-rs / carve-php lose the figure). Promoting first yields a
 * portable, unescaped `^ …` caption line, matching carve-php and carve-rs. This
 * is representation, not enrichment - it changes no author-visible content.
 */
export function carveToCarve(source, opts = {}) {
    const doc = parse(source, opts);
    promoteBlockImages(doc.children, true);
    if (doc.footnoteDefs) {
        for (const body of Object.values(doc.footnoteDefs))
            promoteBlockImages(body, true);
    }
    return renderCarve(doc, opts);
}
/** Convenience: parse + resolve + render plain text in one call. */
export function carveToPlainText(source, opts = {}) {
    enforceProfileMaxLength(source, opts);
    let doc = applyTransforms(resolve(parse(source, opts), {
        asciiHeadingIds: opts.asciiHeadingIds ?? false,
        lowercaseHeadingIds: opts.lowercaseHeadingIds ?? false,
    }), opts.extensions);
    doc = runProfile(doc, opts);
    return renderPlainText(doc, opts);
}
/** Convenience: parse + resolve + render ANSI terminal text in one call. */
export function carveToAnsi(source, opts = {}) {
    enforceProfileMaxLength(source, opts);
    let doc = applyTransforms(resolve(parse(source, opts), {
        asciiHeadingIds: opts.asciiHeadingIds ?? false,
        lowercaseHeadingIds: opts.lowercaseHeadingIds ?? false,
    }), opts.extensions);
    doc = runProfile(doc, opts);
    return renderAnsi(doc, opts);
}
//# sourceMappingURL=index.js.map