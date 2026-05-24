import type { Attrs, Document, Extension, InlineNode } from './ast.js';
/** Render helpers passed to an extension renderer. */
export interface ExtensionRenderContext {
    renderInlines(nodes: InlineNode[]): string;
    escapeHtml(s: string): string;
    escapeAttr(s: string): string;
    renderAttrs(attrs: Attrs | undefined): string;
}
/** Renderer for a `:name[…]` extension node, keyed by extension name. */
export type ExtensionRenderer = (node: Extension, ctx: ExtensionRenderContext) => string;
/** A named extension unit. Parse-stage matchers are a later phase. */
export interface CarveExtension {
    name: string;
    afterParse?(doc: Document): Document;
    beforeRender?(doc: Document): Document;
    /** Renderers keyed by the extension type name (the `name` in `:name[…]`). */
    renderers?: Record<string, ExtensionRenderer>;
}
//# sourceMappingURL=extension.d.ts.map