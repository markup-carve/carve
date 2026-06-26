import type { Document } from './ast.js';
import type { CarveExtension, StaticRenderers } from './extension.js';
export interface RenderOptions {
    /**
     * Render mode. `"interactive"` (default) emits the live forms - clickable
     * tabs, client-script diagrams, KaTeX-ready math. `"static"` emits a
     * self-contained page for a medium that cannot interact or run client
     * scripts (print, PDF source, archival HTML): each extension renders through
     * its `renderStatic` path (tabs flatten to labeled sections, disclosures
     * expand, diagrams/math become build-rendered output or source), and any
     * unconsumed div grouping `[label]` renders as a `<p class="div-label">`
     * caption floor. An unknown value is rejected. Omitting it means
     * `"interactive"`, so existing callers are unaffected. `"print"` / `"email"`
     * are reserved for future named presets.
     */
    mode?: 'interactive' | 'static';
    /**
     * Build-time renderers for client-script extensions, used only in
     * `mode: "static"`. Maps an extension's source to self-contained output
     * (e.g. `{ mermaid: src => svg }`). When the renderer a node needs is
     * absent, that extension's static path falls back to the source as a code
     * block - content is never dropped.
     */
    renderers?: StaticRenderers;
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
     * `allowedUrlSchemes` is set. Defaults to the `DANGEROUS_URL_SCHEMES` set:
     * the script class (`javascript`, `vbscript`, `data`, `file`) plus the
     * OS protocol-handler / command-execution class (`ms-office`, `ms-msdt`,
     * `search-ms`, `shell`, `vscode`, `jar`, …) behind CVE-2026-20841.
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