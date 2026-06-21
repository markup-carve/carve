import type { CarveExtension } from './extension.js';
/** How a {@link fencedRender} instance places the block body. */
export type FencedRenderContentMode = 'text' | 'json';
/** Options for the {@link fencedRender} factory. */
export interface FencedRenderOptions {
    /** Fence info word(s) this instance claims. */
    language: string | string[];
    /** Class on the output element. Default: the first `language` word. */
    cssClass?: string;
    /** Wrapper element. Default: `'div'` for json mode, else `'pre'`. */
    tag?: 'pre' | 'div';
    /** How the body is placed. Default `'text'`. */
    contentMode?: FencedRenderContentMode;
    /** Wrap output in `<figure class="{cssClass}-figure">`. Default `false`. */
    wrapInFigure?: boolean;
    /** Figure class. Default `"{cssClass}-figure"`. */
    figureClass?: string;
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
export declare function fencedRender(opts: FencedRenderOptions): CarveExtension;
/** D2 preset (text mode, `<pre class="d2">`). */
export declare const d2: () => CarveExtension;
/** Graphviz preset (text mode); claims both `dot` and `graphviz`. */
export declare const graphviz: () => CarveExtension;
/** WaveDrom preset (text mode, `<pre class="wavedrom">`). */
export declare const wavedrom: () => CarveExtension;
/** ABC music notation preset (text mode, `<pre class="abc">`). */
export declare const abc: () => CarveExtension;
/** Vega-Lite preset (json mode, `<div class="vega-lite"><script ...>`). */
export declare const vegaLite: () => CarveExtension;
/** Chart.js preset (json mode, `<div class="chart"><script ...>`). */
export declare const chart: () => CarveExtension;
/**
 * Mermaid preset (text mode, `<pre class="mermaid">`). Mermaid is one preset of
 * {@link fencedRender}; load Mermaid.js on the page to render the diagrams.
 */
export declare const mermaid: (opts?: Omit<FencedRenderOptions, "language" | "contentMode">) => CarveExtension;
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
export declare const presets: () => CarveExtension[];
//# sourceMappingURL=fenced-render.d.ts.map