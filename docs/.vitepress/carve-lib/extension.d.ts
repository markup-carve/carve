import type { Attrs, BlockNode, Document, Extension, InlineNode } from './ast.js';
/** Render helpers passed to an extension renderer. */
export interface ExtensionRenderContext {
    renderInlines(nodes: InlineNode[]): string;
    escapeHtml(s: string): string;
    escapeAttr(s: string): string;
    renderAttrs(attrs: Attrs | undefined): string;
}
/** Renderer for a `:name[…]` extension node, keyed by extension name. */
export type ExtensionRenderer = (node: Extension, ctx: ExtensionRenderContext) => string;
/**
 * Render helpers passed to a block-node renderer. `renderChildren` and
 * `indent` route back through the core renderer, so an extension emits its
 * own wrapper while the inner blocks keep rendering with the correct nesting
 * and context (no section-wrapping or tight-list elision leaks).
 */
export interface BlockExtensionRenderContext extends ExtensionRenderContext {
    /** Indentation level of the node being rendered. */
    level: number;
    /** The indent string for a given level. */
    indent(level: number): string;
    /** Render a list of block nodes at `level` via the core renderer. */
    renderChildren(nodes: BlockNode[], level: number): string;
}
/**
 * Renderer for a core block node, keyed by node `type` (e.g. `admonition`).
 * Return a string to take over rendering, or `undefined` to fall through to
 * the core renderer (lets one extension claim only some nodes of a type).
 */
export type BlockExtensionRenderer = (node: BlockNode, ctx: BlockExtensionRenderContext) => string | undefined;
/**
 * Renderer for an extension-produced INLINE node, keyed by node `type`
 * (e.g. `citation-group`). The inline twin of {@link BlockExtensionRenderer}.
 * Return a string to render, or `undefined` to defer to the next renderer.
 */
export type InlineExtensionRenderer = (node: InlineNode, ctx: ExtensionRenderContext) => string | undefined;
/** Result of an inline matcher: the produced node and the offset just past it. */
export interface InlineMatch {
    node: InlineNode;
    /** Offset in `text` immediately after the matched construct (must be > pos). */
    end: number;
}
/** Result of a block matcher: the produced node and how many lines it consumed. */
export interface BlockMatch {
    node: BlockNode;
    /** Number of input lines the block spans (must be > 0). */
    linesConsumed: number;
}
/**
 * Parse-stage context handed to extension matchers. Mirrors the carve-rs and
 * carve-php `MatcherContext`: recursive parsing plus the document-wide
 * definition tables, so a matcher can parse its own inner content and resolve
 * references the same way core does.
 */
export interface MatcherContext {
    /** Parse inline markup (core + extensions) into nodes. */
    parseInlines(text: string): InlineNode[];
    /** Parse block markup (core + extensions) into nodes. */
    parseBlocks(source: string): BlockNode[];
    /** Reference-link definitions collected from the document. */
    linkDefs: ReadonlyMap<string, {
        href: string;
        title?: string;
    }>;
    /** Abbreviation definitions collected from the document. */
    abbrDefs: ReadonlyMap<string, string>;
}
/**
 * Inline matcher: try to match a construct at `pos` in `text`. Return a match
 * (`end > pos`) or `null` to decline. Tried only at positions core did not
 * consume — extensions add syntax, they never hijack core.
 */
export type InlineMatcher = (text: string, pos: number, ctx: MatcherContext) => InlineMatch | null;
/**
 * Block matcher: try to match a block starting at line `start`. Return a match
 * (`linesConsumed > 0`) or `null` to decline. Tried after every core block
 * construct and before the paragraph fallback.
 */
export type BlockMatcher = (lines: readonly string[], start: number, ctx: MatcherContext) => BlockMatch | null;
/** A named extension unit contributing any subset of the lifecycle hooks. */
export interface CarveExtension {
    name: string;
    /** Parse-stage inline matcher (adds inline syntax; never hijacks core). */
    matchInline?: InlineMatcher;
    /** Parse-stage block matcher (tried before the paragraph fallback). */
    matchBlock?: BlockMatcher;
    afterParse?(doc: Document): Document;
    beforeRender?(doc: Document): Document;
    /** Renderers keyed by the extension type name (the `name` in `:name[…]`). */
    renderers?: Record<string, ExtensionRenderer>;
    /** Renderers keyed by core block node `type` (e.g. `admonition`). */
    blockRenderers?: Record<string, BlockExtensionRenderer>;
    /** Renderers keyed by an extension inline node `type` (e.g. `citation-group`). */
    inlineRenderers?: Record<string, InlineExtensionRenderer>;
}
//# sourceMappingURL=extension.d.ts.map