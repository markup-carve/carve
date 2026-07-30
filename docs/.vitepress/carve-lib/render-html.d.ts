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
    /** Symbol shortcode -> trusted raw output map. `:name:` with no entry renders literally. */
    symbols?: Record<string, string>;
    /** Registered extensions (renderers consulted; transforms run by carveToHtml). */
    extensions?: CarveExtension[];
    /**
     * Stamp each block element with `data-source-line="{n}"` (the
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
/**
 * Dangerous URL schemes blocked by default on links/images/autolinks and
 * `{href=…}` / `{src=…}` attribute overrides (denylist). Two classes:
 *
 *  1. Script / inline-content schemes: `javascript`, `vbscript`, `data`,
 *     `file` - the classic XSS / local-file vectors.
 *  2. OS protocol-handler / command-execution schemes (the CVE-2026-20841
 *     class): a markup link a consumer routes to the operating-system handler
 *     can open a macro document or run a command - e.g. `ms-office:ofe|u|…`,
 *     `ms-msdt:` (Follina), `search-ms:`, `shell:`, `vscode://`, `jar:`. These
 *     never have a legitimate use in a content-markup document, so they are
 *     blanked exactly like the script class above.
 *
 * This is the SINGLE source of truth referenced by both the link/image URL
 * sanitizer and the attribute-override value sanitizer, so the spec corpus and
 * sibling engines can pin the exact set. Match is case-insensitive and
 * obfuscation-resistant (see `SCHEME_PROBE_STRIP_RE`). Legitimate non-command
 * schemes (`http`, `https`, `mailto`, `tel`, `ftp`, `sms`, …) stay allowed.
 */
export declare const DANGEROUS_URL_SCHEMES: string[];
/**
 * Neutralize a dangerous URL on a link `href` or image `src`, defeating
 * `javascript:` / `data:` style injection.
 *
 * Default policy is a DENYLIST: a URL whose scheme is `javascript`,
 * `vbscript`, `data`, or `file` collapses to an empty string (link text /
 * image alt still shows, element inert); every other scheme and any
 * scheme-less URL (relative, query, fragment, protocol-relative `//host`)
 * passes. Pass `allowedUrlSchemes` to switch to a strict ALLOWLIST instead;
 * pass `deniedUrlSchemes` to customize the denylist.
 *
 * Scheme detection ignores leading C0 control characters, whitespace, and
 * Unicode separators, which browsers strip (or that obfuscate) before a
 * scheme is parsed - so `\tjavascript:`, ` javascript:`, and a NBSP-prefixed
 * scheme are caught, not bypassed. The returned value is still passed through
 * `escapeAttr` by the caller.
 */
/**
 * Characters dropped before scheme detection: C0 controls + ASCII space
 * plus ALL Unicode whitespace/separators that some contexts tolerate around a
 * scheme. The `\s` class (with the `u` flag) covers every Unicode space
 * separator - NBSP (U+00A0), NARROW NO-BREAK SPACE (U+202F), the U+2000..U+200A
 * spaces, MEDIUM MATHEMATICAL SPACE (U+205F), IDEOGRAPHIC SPACE (U+3000), OGHAM
 * SPACE MARK (U+1680), line/paragraph separators (U+2028 / U+2029), the BOM /
 * zero-width no-break space (U+FEFF), and ASCII whitespace - while the explicit
 * C0 ranges still strip the non-whitespace controls `\s` omits (U+0000..U+0008,
 * U+000E..U+001F). This is the most thorough strip: it defeats obfuscated
 * schemes like " javascript:" prefixed with a NARROW NO-BREAK SPACE (U+202F)
 * that the previous fixed list would have missed.
 */
export declare const SCHEME_PROBE_STRIP_RE: RegExp;
export declare function renderHtml(ast: Document, opts?: RenderOptions): string;
//# sourceMappingURL=render-html.d.ts.map