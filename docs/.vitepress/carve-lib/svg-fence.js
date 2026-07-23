import { sanitizeSvg } from './svg-sanitize.js';
// Fence attributes the extension consumes rather than emitting: the inline mode
// flag, the `alt` text, and the now-redundant `sandbox` marker (sandbox is the
// default; kept consumed so an explicit `{sandbox}` doesn't leak as an attribute).
const CONSUMED_KEYS = new Set(['inline', 'alt', 'sandbox']);
// Case-insensitive lookup of a consumed key in a keyValues map, matching how
// authorAttrs() strips them — so `{Sandbox}` / `{ALT=…}` are honored, not
// silently dropped.
function consumedValue(attrs, key) {
    const kv = attrs?.keyValues;
    if (!kv)
        return undefined;
    for (const [k, v] of Object.entries(kv)) {
        if (k.toLowerCase() === key)
            return v;
    }
    return undefined;
}
// A copy of the fence attrs with the consumed keys removed, so `{sandbox}` and
// `{alt=…}` never render as literal attributes on the output element.
function authorAttrs(attrs) {
    if (!attrs?.keyValues)
        return attrs;
    const keyValues = {};
    for (const [k, v] of Object.entries(attrs.keyValues)) {
        if (!CONSUMED_KEYS.has(k.toLowerCase()))
            keyValues[k] = v;
    }
    const cleaned = { ...attrs, keyValues };
    if (attrs.order)
        cleaned.order = attrs.order.filter((o) => !CONSUMED_KEYS.has(o.toLowerCase()));
    return cleaned;
}
// Drop the named keys (case-insensitive) from an Attrs' keyValues + order.
function stripKeys(attrs, keys) {
    if (!attrs?.keyValues)
        return attrs;
    const drop = new Set(keys.map((k) => k.toLowerCase()));
    const keyValues = {};
    for (const [k, v] of Object.entries(attrs.keyValues)) {
        if (!drop.has(k.toLowerCase()))
            keyValues[k] = v;
    }
    const cleaned = { ...attrs, keyValues };
    if (attrs.order)
        cleaned.order = attrs.order.filter((o) => !drop.has(o.toLowerCase()));
    return cleaned;
}
// Splice a rendered attr string (` id="…" class="…"`) into the root <svg> tag.
// The fence attributes win: any attribute the fence sets is first removed from
// the sanitized root so the merge never emits a duplicate attribute (invalid
// HTML/SVG). Attributes only the root has are preserved.
function mergeIntoRoot(svg, attrStr) {
    if (attrStr === '')
        return svg;
    const fenceNames = [...attrStr.matchAll(/\s([A-Za-z_:][\w:.-]*)\s*=/g)].map((mm) => mm[1].toLowerCase());
    // Match the root tag quote-aware so a `>` inside a quoted attribute value
    // (e.g. aria-label="1>2") is not mistaken for the tag's end.
    return svg.replace(/^<svg((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/i, (_full, rootAttrs, slash) => {
        let cleaned = rootAttrs;
        for (const name of fenceNames) {
            const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleaned = cleaned.replace(new RegExp(`\\s${esc}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'), '');
        }
        return `<svg${attrStr}${cleaned}${slash}>`;
    });
}
// Fall back to the SVG's own `<title>` for the `<img>` alt text when the author
// gave no `{alt=…}`, so a sandboxed image is described to assistive tech instead
// of being silently decorative (empty alt). The svg passed here is already
// sanitized, so this is a plain extraction; the result is escaped again on
// output. Returns undefined when there is no non-empty title.
function svgTitle(svg) {
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(svg);
    if (!m)
        return undefined;
    const text = m[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#3[49];/g, "'")
        .replace(/&amp;/g, '&')
        .trim();
    return text === '' ? undefined : text;
}
// A self-contained escaped code-block fallback, mirroring FencedRender's
// degradation: never blank, never raw.
function sourceFallback(code, ctx) {
    const pad = ctx.indent(ctx.level);
    const langAttr = code.lang ? ` class="language-${code.lang}"` : '';
    return `${pad}<pre><code${langAttr}>${ctx.escapeHtml(code.content)}\n</code></pre>`;
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
export function imgFence(opts = {}) {
    const languages = (Array.isArray(opts.language) ? opts.language : opts.language ? [opts.language] : ['img', 'image']).filter((w) => w !== '');
    if (languages.length === 0) {
        throw new Error('imgFence requires at least one non-empty language word');
    }
    const render = {
        'code_block': (node, ctx) => {
            const code = node;
            if (!languages.includes(code.lang ?? ''))
                return undefined;
            const { svg, ok } = sanitizeSvg(code.content, opts);
            if (!ok)
                return sourceFallback(code, ctx);
            const pad = ctx.indent(ctx.level);
            const cleanAttrs = authorAttrs(code.attrs);
            // Inline is a HOST capability: the `{inline}` fence flag only takes effect
            // when the host opted in with `allowInline`. Otherwise (the default, and
            // the safe posture for untrusted input) the fence is sandboxed and
            // `{inline}` is ignored — an author cannot self-elevate out of the sandbox.
            const inline = opts.allowInline === true && consumedValue(code.attrs, 'inline') !== undefined;
            if (!inline) {
                const alt = consumedValue(code.attrs, 'alt') ?? svgTitle(svg) ?? '';
                const src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
                // Sandbox mode promises no fetches: drop any author source-selection
                // attribute (`src`, `srcset`) so it cannot override the sanitized data
                // URI with an external resource.
                const imgAttrs = stripKeys(cleanAttrs, ['src', 'srcset']);
                return `${pad}<img src="${ctx.escapeAttr(src)}" alt="${ctx.escapeAttr(alt)}"${ctx.renderAttrs(imgAttrs)}>`;
            }
            const fenceAttrs = ctx.renderAttrs(cleanAttrs);
            if (fenceAttrs === '')
                return `${pad}${svg}`;
            // Fence attributes land on the root <svg>, so they must clear the SAME
            // SVG-specific scrub as the body — otherwise a `{fill="url(https://…)"}`
            // would reintroduce a remote fetch the sanitizer just removed. Splice them
            // onto the root, then re-sanitize (idempotent for the already-clean body).
            const merged = sanitizeSvg(mergeIntoRoot(svg, fenceAttrs), opts);
            return merged.ok ? `${pad}${merged.svg}` : sourceFallback(code, ctx);
        },
    };
    return {
        name: 'img-fence',
        blockRenderers: render,
        // Inline SVG needs no client script — the interactive output is already
        // static, so the static render is byte-identical.
        staticBlockRenderers: render,
    };
}
//# sourceMappingURL=svg-fence.js.map