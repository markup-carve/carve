import type { Document } from './ast.js';
/**
 * Whether smart typography renders as its glyph or as the source run the author
 * typed.
 *
 * Presentation output wants the glyph. Output written for a machine to read is
 * usually better off with the characters that were actually typed: the glyph is
 * a presentation choice the consumer did not ask for and cannot undo, and a
 * search for the source spelling misses it.
 */
export type SmartTypographyMode = 'glyph' | 'source';
export interface MarkdownRenderOptions {
    /** Defaults to `'glyph'`. */
    smartTypography?: SmartTypographyMode;
}
export declare function renderMarkdown(ast: Document, opts?: MarkdownRenderOptions): string;
//# sourceMappingURL=render-markdown.d.ts.map