import type { Document } from './ast.js';
import type { CarveExtension } from './extension.js';
export interface RenderOptions {
    mentionUrl?: string;
    tagUrl?: string;
    /** Emoji shortcode -> glyph map. `:name:` with no entry renders literally. */
    emoji?: Record<string, string>;
    /** Registered extensions (renderers consulted; transforms run by carveToHtml). */
    extensions?: CarveExtension[];
}
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
//# sourceMappingURL=render-html.d.ts.map