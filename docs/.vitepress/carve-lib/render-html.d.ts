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
     * Filter dangerous URL schemes on link `href` and image `src` so authored
     * Carve cannot inject script via a crafted URL. On by default (safe by
     * default). A blocked URL renders as an empty value (`href=""`) so the link
     * text / image alt is still shown but inert.
     *
     * Default policy is a DENYLIST: `javascript:`, `vbscript:`, `data:`, `file:`
     * are blocked; every other scheme and any scheme-less URL (relative,
     * fragment, protocol-relative) passes. Set `false` ONLY for fully trusted
     * input where you want authored URLs passed through verbatim.
     */
    sanitizeUrls?: boolean;
    /**
     * Opt in to a strict ALLOWLIST instead of the default denylist: when set,
     * ONLY these schemes pass on `href`/`src` (case-insensitive); everything
     * else is blanked. No effect when `sanitizeUrls` is `false`.
     */
    allowedUrlSchemes?: string[];
    /**
     * Customize the default scheme DENYLIST (case-insensitive). Ignored when
     * `allowedUrlSchemes` is set. Defaults to
     * `['javascript', 'vbscript', 'data', 'file']`.
     */
    deniedUrlSchemes?: string[];
    /**
     * Allow raw HTML passthrough (the `` `…`{=html} `` inline and ` ```=html `
     * block forms) to emit verbatim. On by default, matching the conformance
     * corpus. Set `false` for UNTRUSTED input: raw-HTML content is then escaped
     * to text instead of emitted, closing the one author-controlled raw-HTML
     * injection vector. Non-HTML raw formats are unaffected.
     */
    allowRawHtml?: boolean;
}
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
//# sourceMappingURL=render-html.d.ts.map