import type { CarveExtension } from './extension.js';
import { type SanitizeSvgOptions } from './svg-sanitize.js';
/** Options for the {@link imgFence} factory. Extends the sanitizer options, so
 *  `allowStyle` / `allowLinks` / `allowAnimation` / `allowExternalImages` flow
 *  straight through. */
export interface ImgFenceOptions extends SanitizeSvgOptions {
    /** Fence info word(s) this instance claims. Default `['img', 'image']`. */
    language?: string | string[];
    /**
     * Permit **inline** rendering (a live `<svg>` in the page DOM) for fences that
     * carry an `{inline}` attribute. Default `false`: every fence is rendered in
     * the browser-sandboxed `data:image/svg+xml` `<img>` mode, and `{inline}` is
     * ignored.
     *
     * ⚠️ SECURITY: inline mode injects live SVG into the DOM, where the only thing
     * standing between a hostile SVG and script execution is this extension's
     * hand-rolled sanitizer — NOT a browser-grade parser. It is suitable for
     * TRUSTED author content, but is not a hardened XSS boundary for
     * attacker-controlled input (parser-differential / mutation-XSS cannot be
     * ruled out for a string sanitizer). For untrusted input, leave this `false`
     * so everything stays sandboxed, or post-process inline output with a
     * browser-based sanitizer (e.g. DOMPurify's SVG profile).
     *
     * This is a HOST decision on purpose: the fence body and its attributes come
     * from the same author, so a per-fence `{inline}` alone must never be able to
     * self-elevate out of the sandbox — only the host, by setting this, opts in.
     */
    allowInline?: boolean;
}
/**
 * SVG `img` fence (Tier-3, ships off). Claims fenced blocks whose info word is
 * `img` (alias `image`) and renders the SVG **body** — sanitized — rather than
 * showing it as verbatim source. `svg` / `xml` are deliberately NOT claimed, so
 * an author can still syntax-highlight SVG source with those words.
 *
 * Two emit modes, **sandbox by default**:
 *
 * - **sandbox (default):** the sanitized SVG is encoded into a
 *   `data:image/svg+xml` URI on an `<img>`, which the browser sandboxes — no
 *   script, no fetch, no DOM leakage — regardless of the sanitizer. This is the
 *   safe path for untrusted input. `{alt=…}` sets the alt text.
 *
 *       ```img
 *       <svg viewBox="0 0 24 24"><path d="…"/></svg>
 *       ```
 *
 * - **inline (opt-in):** with `imgFence({ allowInline: true })`, a fence marked
 *   `{inline}` renders a live `<svg>` in the DOM, so `currentColor`, CSS classes
 *   and dark-mode apply. See the ⚠️ security note on {@link ImgFenceOptions.allowInline}
 *   — this is for TRUSTED content. Without `allowInline`, `{inline}` is ignored
 *   and the fence stays sandboxed.
 *
 *       // host: imgFence({ allowInline: true })
 *       {inline}
 *       ```img
 *       <svg viewBox="0 0 24 24"><path d="…" fill="currentColor"/></svg>
 *       ```
 *
 * The sanitizer ({@link sanitizeSvg}) drops `<script>`, `<foreignObject>`,
 * event handlers, `javascript:`/external URLs and active CSS. A body that is
 * not a single `<svg>` root degrades to an escaped code block.
 *
 * Author `{#id .class}` on the fence merge onto the `<img>` (sandbox) or the
 * root `<svg>` (inline), hardened by the core `ctx.renderAttrs` and — for inline
 * — re-run through the SVG sanitizer.
 */
export declare function imgFence(opts?: ImgFenceOptions): CarveExtension;
//# sourceMappingURL=svg-fence.d.ts.map