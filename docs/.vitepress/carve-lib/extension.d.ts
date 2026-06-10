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
/** A named extension unit. Parse-stage matchers are a later phase. */
export interface CarveExtension {
    name: string;
    afterParse?(doc: Document): Document;
    beforeRender?(doc: Document): Document;
    /** Renderers keyed by the extension type name (the `name` in `:name[…]`). */
    renderers?: Record<string, ExtensionRenderer>;
    /** Renderers keyed by core block node `type` (e.g. `admonition`). */
    blockRenderers?: Record<string, BlockExtensionRenderer>;
}
//# sourceMappingURL=extension.d.ts.map