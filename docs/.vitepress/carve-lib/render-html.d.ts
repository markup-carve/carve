import type { Document } from './ast.js';
import type { CarveExtension } from './extension.js';
export interface RenderOptions {
    mentionUrl?: string;
    tagUrl?: string;
    /** Emoji shortcode -> glyph map. `:name:` with no entry renders literally. */
    emoji?: Record<string, string>;
    /** Registered extensions (renderers consulted; transforms run by carveToHtml). */
    extensions?: CarveExtension[];
    /**
     * Stamp each top-level block element with `data-source-line="{n}"` (the
     * 1-based source line it starts on). Requires the AST to carry positions
     * (parse with `{ positions: true }`; `carveToHtml` enables this for you).
     * Off by default so canonical output is unchanged. Intended for editor
     * integrations that map rendered blocks back to source lines.
     */
    sourceLine?: boolean;
    /**
     * Filter dangerous URL schemes (`javascript:`, `data:`, `vbscript:`, …)
     * on link `href` and image `src` so authored Carve cannot inject script
     * via a crafted URL. On by default - this is the safe-by-default posture
     * the spec's SafeMode describes. A blocked URL renders as an empty value
     * (`href=""`) so the link text / image alt is still shown but inert.
     *
     * Set `false` ONLY for fully trusted input where you want authored URLs
     * passed through verbatim. Relative URLs (no scheme) and fragments
     * (`#id`) are always allowed regardless of this setting.
     */
    sanitizeUrls?: boolean;
    /**
     * URL schemes permitted when {@link RenderOptions.sanitizeUrls} is on.
     * Case-insensitive. Defaults to `['http', 'https', 'mailto']`. Add e.g.
     * `'tel'` or `'ftp'` here if your application needs them. Has no effect
     * when `sanitizeUrls` is `false`.
     */
    allowedUrlSchemes?: string[];
}
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
//# sourceMappingURL=render-html.d.ts.map