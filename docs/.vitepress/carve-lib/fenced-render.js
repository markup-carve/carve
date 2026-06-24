// Text mode: escape `&` and `<` (blocking tag injection), but keep `>` so
// arrow syntax (`-->`) survives, matching the Mermaid behavior.
function escapeText(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
// JSON mode: the body is verbatim JSON inside a <script>. The only sequence
// that can close the script element early (or inject markup) is `</`; rewrite
// it to `<\/`, which is byte-equivalent JSON (`\/` decodes to `/`).
function guardScriptClose(s) {
    return s.replace(/<\//g, '<\\/');
}
/**
 * Generic client-rendered fenced-block factory (Tier-3). Claims fenced code
 * blocks by language word and emits one hydration element; the block body is
 * passed through verbatim (no Carve parsing). This is the same client-hydration
 * shape {@link mermaid} uses - Mermaid is one preset of it - generalized so D2,
 * Graphviz, WaveDrom, ABC, Vega-Lite, Chart.js, etc. need no new code.
 *
 * - `text` mode (Mermaid, D2, Graphviz, WaveDrom, ABC): body is HTML-escaped
 *   text inside the wrapper (`&` and `<` escaped, `>` preserved).
 *
 *       ``` d2
 *       a -> b
 *       ```
 *   → `<pre class="d2">a -> b</pre>`
 *
 * - `json` mode (Vega-Lite, Chart.js): body is emitted verbatim inside a
 *   `<script type="application/json">` (default wrapper `<div>`), with `</`
 *   guarded so the JSON cannot close the script element early.
 *
 *       ``` vega-lite
 *       {"mark": "bar"}
 *       ```
 *   → `<div class="vega-lite"><script type="application/json">{"mark": "bar"}</script></div>`
 *
 *   Note: json mode emits a `<script type="application/json">`, so consumers
 *   that sanitize the HTML after conversion should whitelist that tag or use
 *   text mode (the config then rides in a `<pre>` as escaped text).
 *
 * Author attributes on the fence are copied through `ctx.renderAttrs`, which
 * applies the always-on attribute hardening (strips `on*` / `srcdoc` /
 * `formaction`, neutralizes dangerous URL / `expression()` values), so a
 * `{onclick=…}` fence cannot inject. Ported alongside carve-php's
 * `FencedRenderExtension`.
 */
export function fencedRender(opts) {
    const languages = (Array.isArray(opts.language) ? opts.language : [opts.language]).filter((word) => word !== '');
    if (languages.length === 0) {
        throw new Error('fencedRender requires at least one non-empty language word');
    }
    const mode = opts.contentMode ?? 'text';
    const cssClass = opts.cssClass ?? languages[0];
    const tag = opts.tag ?? (mode === 'json' ? 'div' : 'pre');
    const figureClass = opts.figureClass ?? `${cssClass}-figure`;
    const staticRendererKey = opts.staticRenderer;
    return {
        name: 'fenced-render',
        blockRenderers: {
            'code-block': (node, ctx) => {
                const code = node;
                if (!languages.includes(code.lang ?? ''))
                    return undefined;
                // Merge the cssClass ahead of author classes; renderAttrs hardens the
                // copied author attributes (names + values).
                const attrs = { ...code.attrs, classes: [cssClass, ...(code.attrs?.classes ?? [])] };
                const open = `<${tag}${ctx.renderAttrs(attrs)}>`;
                const body = mode === 'json'
                    ? `<script type="application/json">${guardScriptClose(code.content)}</script>`
                    : escapeText(code.content);
                const element = `${open}${body}</${tag}>`;
                if (opts.wrapInFigure) {
                    const pad = ctx.indent(ctx.level);
                    return `${pad}<figure class="${ctx.escapeAttr(figureClass)}">\n${pad}${element}\n${pad}</figure>`;
                }
                return `${ctx.indent(ctx.level)}${element}`;
            },
        },
        staticBlockRenderers: {
            // Static render: the diagram is a client-script visual, so the engine
            // cannot draw it. If a build-time renderer is supplied for this instance
            // (`renderers.mermaid` / `renderers.chart` / `renderers.graphviz`), emit its output wrapped in
            // the attributed element so author attrs survive; otherwise degrade to
            // the source as a `<pre><code class="language-…">`
            // block - never blank, and re-renderable by a host that loads the client
            // library.
            'code-block': (node, ctx) => {
                const code = node;
                if (!languages.includes(code.lang ?? ''))
                    return undefined;
                const pad = ctx.indent(ctx.level);
                // Merge the cssClass ahead of author classes and copy the author
                // attributes through ctx.renderAttrs (same hardening as the interactive
                // path), so an `{#id .class data-x=y}` on the fence survives both the
                // renderer-output and the source-fallback degradation paths.
                const attrs = { ...code.attrs, classes: [cssClass, ...(code.attrs?.classes ?? [])] };
                const build = staticRendererKey ? ctx.renderers[staticRendererKey] : undefined;
                if (build) {
                    // Wrap the renderer's output (an `<svg>` / `<img>`) in the same
                    // element + author attributes the interactive path emits, so the
                    // fence's id / classes / other attrs land on the wrapping element
                    // instead of being dropped.
                    const element = `<${tag}${ctx.renderAttrs(attrs)}>${build(code.content)}</${tag}>`;
                    if (opts.wrapInFigure) {
                        return `${pad}<figure class="${ctx.escapeAttr(figureClass)}">\n${pad}${element}\n${pad}</figure>`;
                    }
                    return `${pad}${element}`;
                }
                // Source fallback: a self-contained, escaped code block reusing the
                // same merged attrs (cssClass ahead of author classes, hardened by
                // ctx.renderAttrs).
                const langAttr = code.lang ? ` class="language-${ctx.escapeAttr(code.lang)}"` : '';
                return `${pad}<pre${ctx.renderAttrs(attrs)}><code${langAttr}>${ctx.escapeHtml(code.content)}\n</code></pre>`;
            },
        },
    };
}
/** D2 preset (text mode, `<pre class="d2">`). */
export const d2 = () => fencedRender({ language: 'd2' });
/** Graphviz preset (text mode); claims both `dot` and `graphviz`. In a static
 *  render a supplied `renderers.graphviz` pre-renders the source to an image. */
export const graphviz = () => fencedRender({ language: ['dot', 'graphviz'], cssClass: 'graphviz', staticRenderer: 'graphviz' });
/** WaveDrom preset (text mode, `<pre class="wavedrom">`). */
export const wavedrom = () => fencedRender({ language: 'wavedrom' });
/** ABC music notation preset (text mode, `<pre class="abc">`). */
export const abc = () => fencedRender({ language: 'abc' });
/** Vega-Lite preset (json mode, `<div class="vega-lite"><script ...>`). */
export const vegaLite = () => fencedRender({ language: 'vega-lite', contentMode: 'json' });
/** Chart.js preset (json mode, `<div class="chart"><script ...>`). In a static
 *  render a supplied `renderers.chart` pre-renders the config to an image. */
export const chart = () => fencedRender({ language: 'chart', contentMode: 'json', staticRenderer: 'chart' });
/**
 * Mermaid preset (text mode, `<pre class="mermaid">`). Mermaid is one preset of
 * {@link fencedRender}; load Mermaid.js on the page to render the diagrams.
 */
export const mermaid = (opts = {}) => fencedRender({ language: 'mermaid', staticRenderer: 'mermaid', ...opts });
/**
 * Every bundled diagram preset as ready-to-register extensions, for spreading
 * into the `extensions` option:
 *
 *     carveToHtml(src, { extensions: [...presets(), mathBlock()] })
 *
 * This claims every preset fence word (`mermaid`, `d2`, `dot`, `graphviz`,
 * `wavedrom`, `abc`, `vega-lite`, `chart`), so a literal code sample in one of
 * those languages becomes a hydration element; include only the presets whose
 * client library you actually load if that matters.
 */
export const presets = () => [
    mermaid(),
    d2(),
    graphviz(),
    wavedrom(),
    abc(),
    vegaLite(),
    chart(),
];
//# sourceMappingURL=fenced-render.js.map