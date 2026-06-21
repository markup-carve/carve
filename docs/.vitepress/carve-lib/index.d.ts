import type { Document } from './ast.js';
import { type ParseOptions } from './parse.js';
import { type AsciiHeadingIdMode } from './heading-ids.js';
import { Profile } from './profile.js';
import { type RenderOptions } from './render-html.js';
import { type MarkdownRenderOptions } from './render-markdown.js';
import { type PlainTextRenderOptions } from './render-plain.js';
import { type AnsiRenderOptions } from './render-ansi.js';
export * from './ast.js';
export type { ParseOptions } from './parse.js';
export type { RenderOptions } from './render-html.js';
export type { MarkdownRenderOptions } from './render-markdown.js';
export type { PlainTextRenderOptions } from './render-plain.js';
export type { AnsiRenderOptions } from './render-ansi.js';
export type { CarveExtension, ExtensionRenderer, ExtensionRenderContext, BlockExtensionRenderer, BlockExtensionRenderContext, InlineMatch, BlockMatch, MatcherContext, InlineMatcher, BlockMatcher, } from './extension.js';
export { djotMigrationWarnings, formatMigrationWarnings, applyMigrationFixes, type MigrationWarning, type MigrationFixResult, } from './djot-migrate.js';
export { markdownToCarve } from './markdown-migrate.js';
export { lintCarve, formatLintWarnings, type LintWarning, } from './lint.js';
export { tabNormalize } from './tab-normalize.js';
export { details } from './details.js';
export { listTable } from './list-table.js';
export { citations, type CitationsOptions } from './citations.js';
export { fencedRender, mermaid, d2, graphviz, wavedrom, abc, vegaLite, chart, presets, type FencedRenderOptions, type FencedRenderContentMode, } from './fenced-render.js';
export { mathBlock, type MathBlockOptions } from './math-block.js';
export { spoiler } from './spoiler.js';
export { wikilinks, type WikilinksOptions } from './wikilinks.js';
export { autolink, type AutolinkOptions } from './autolink.js';
export { externalLinks, type ExternalLinksOptions } from './external-links.js';
export { tableOfContents, type TableOfContentsOptions } from './table-of-contents.js';
export { headingPermalinks, type HeadingPermalinksOptions } from './heading-permalinks.js';
export { codeGroup, type CodeGroupOptions } from './code-group.js';
export { tabs, type TabsOptions, type TabsMode } from './tabs.js';
export { headingLevelShift, type HeadingLevelShiftOptions } from './heading-level-shift.js';
export { headingReference, type HeadingReferenceOptions } from './heading-reference.js';
export { defaultAttributes, type DefaultAttributesOptions, type DefaultAttributesMap, } from './default-attributes.js';
export { Profile, LinkPolicy, ProfileViolationError, formatProfileViolation, canonicalType, CANONICAL_BLOCK_TYPES, CANONICAL_INLINE_TYPES, type DisallowedAction, type ProfileViolation, } from './profile.js';
export { applyProfile, type ProfileFilterResult } from './profile-filter.js';
/**
 * Options shared by every `carveTo*` entry point for profile-based feature
 * restriction. A profile runs as an AST transform after resolve() and before
 * the renderer, so it applies identically to HTML/Markdown/plain/ANSI output.
 */
export interface ProfileOptions {
    /**
     * Feature-restriction profile. When set, disallowed nodes are converted to
     * text / stripped / error'd per the profile's action, link/image URLs are
     * gated by its link policy, and maxNesting / maxLength are enforced. Omit
     * for no restriction (all features pass through).
     */
    profile?: Profile;
    /**
     * Current document host, used by the profile's link policy to tell internal
     * from external links (e.g. `internalOnly`). Optional.
     */
    profileBaseHost?: string;
}
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
/** Render a resolved Carve AST to Markdown. */
export declare function renderMarkdown(ast: Document, opts?: MarkdownRenderOptions): string;
/** Render a resolved Carve AST to plain text. */
export declare function renderPlainText(ast: Document, opts?: PlainTextRenderOptions): string;
/** Render a resolved Carve AST to ANSI terminal text. */
export declare function renderAnsi(ast: Document, opts?: AnsiRenderOptions): string;
/**
 * Post-parse semantic resolution: heading ids, `</#id>` crossrefs,
 * implicit heading references (`[Foo][]` -> `#foo`), and finalization
 * of any reference-link placeholder the parse phase left unresolved
 * (no explicit `[label]: url` def and no matching heading) to its
 * literal source text.
 */
export declare function resolve(doc: Document, opts?: {
    asciiHeadingIds?: AsciiHeadingIdMode;
    lowercaseHeadingIds?: boolean;
}): Document;
/** Convenience: parse + resolve + render in one call. */
export declare function carveToHtml(source: string, opts?: ParseOptions & RenderOptions & ProfileOptions): string;
/** Convenience: parse + resolve + render Markdown in one call. */
export declare function carveToMarkdown(source: string, opts?: ParseOptions & MarkdownRenderOptions & ProfileOptions): string;
/** Convenience: parse + resolve + render plain text in one call. */
export declare function carveToPlainText(source: string, opts?: ParseOptions & PlainTextRenderOptions & ProfileOptions): string;
/** Convenience: parse + resolve + render ANSI terminal text in one call. */
export declare function carveToAnsi(source: string, opts?: ParseOptions & AnsiRenderOptions & ProfileOptions): string;
//# sourceMappingURL=index.d.ts.map