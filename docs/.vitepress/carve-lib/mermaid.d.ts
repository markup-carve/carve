import type { CarveExtension } from './extension.js';
/** Options for the {@link mermaid} extension. */
export interface MermaidOptions {
    /** CSS class Mermaid.js detects. Default `'mermaid'`. */
    cssClass?: string;
    /** Language tag that marks a diagram block. Default `'mermaid'`. */
    language?: string;
}
/**
 * Render fenced code blocks tagged `mermaid` as `<pre class="mermaid">…</pre>`
 * for client-side Mermaid.js, instead of the default `<pre><code>`.
 *
 *     ``` mermaid
 *     graph TD; A-->B
 *     ```
 *
 * renders as `<pre class="mermaid">graph TD; A-->B</pre>` (`>` kept for arrows).
 * A non-mermaid code block defers to the core renderer.
 *
 * Mermaid is a text-mode preset of {@link fencedRender}; the `name` stays
 * `'mermaid'` for back-compat.
 */
export declare function mermaid(opts?: MermaidOptions): CarveExtension;
//# sourceMappingURL=mermaid.d.ts.map