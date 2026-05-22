import type { Document } from './ast.js';
export interface RenderOptions {
    mentionUrl?: string;
    tagUrl?: string;
    /** Emoji shortcode -> glyph map. `:name:` with no entry renders literally. */
    emoji?: Record<string, string>;
}
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
//# sourceMappingURL=render-html.d.ts.map