import type { Document } from './ast.js';
export interface RenderOptions {
    /** URL template for mentions using the `{user}` placeholder. Without this, mentions render as non-link spans. */
    mentionUrl?: string;
    /** URL template for tags using the `{name}` placeholder. Without this, tags render as non-link spans. */
    tagUrl?: string;
    /** Emoji shortcode -> glyph map. `:name:` with no entry renders literally. */
    emoji?: Record<string, string>;
}
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
//# sourceMappingURL=render-html.d.ts.map
