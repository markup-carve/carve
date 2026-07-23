/**
 * Hand-rolled SVG sanitizer (Tier-3, zero-dependency). Powers the `img` fence
 * (see {@link file://./svg-fence.ts}); usable standalone.
 *
 * A real tokenizer, NOT a regex scrub — regex "sanitizers" for SVG are
 * routinely bypassed. It walks the source tag by tag, drops any element not on
 * a presentational allowlist **together with its subtree**, drops any attribute
 * not on the allowlist (and every `on*` handler), scrubs URL/style values, and
 * re-serializes only the survivors. Text nodes pass through with `&<>`
 * re-escaped. Anything unrecognized is dropped, never echoed.
 *
 * The output is guaranteed to contain no `<script>`, no event handlers, no
 * `<foreignObject>`, no `javascript:`/external URLs, and no active CSS — so it
 * is safe to inline into the DOM or to encode into a `data:image/svg+xml` URI.
 */
/** Options gate the small set of constructs that are safe only in some
 *  contexts. All default OFF. */
export interface SanitizeSvgOptions {
    /** Keep the `style` **attribute** (value scrubbed of `url()`/`expression()`/…).
     *  The `<style>` *element* is always dropped regardless — its selectors can
     *  reach the whole page and its text can carry `@import`/`url()`. */
    allowStyle?: boolean;
    /** Keep `<a>` elements and external `href`/`xlink:href` (safe schemes only). */
    allowLinks?: boolean;
    /** Keep SMIL animation elements (`<animate>`, `<set>`, …). */
    allowAnimation?: boolean;
    /** Keep `<image>` and its external raster `href` (safe schemes only; note
     *  `data:` is still rejected as a dangerous scheme). */
    allowExternalImages?: boolean;
}
export interface SanitizeResult {
    /** The sanitized SVG. Meaningful only when {@link ok} is true. */
    svg: string;
    /** True when the input parsed to a single well-formed `<svg>` root. When
     *  false, callers should fall back to showing the source, never the raw
     *  input. */
    ok: boolean;
}
/**
 * Sanitize an SVG source string. See the module docblock for the guarantees.
 */
export declare function sanitizeSvg(source: string, opts?: SanitizeSvgOptions): SanitizeResult;
//# sourceMappingURL=svg-sanitize.d.ts.map