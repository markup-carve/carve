import { fencedRender } from './fenced-render.js';
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
export function mermaid(opts = {}) {
    return {
        ...fencedRender({
            language: opts.language ?? 'mermaid',
            cssClass: opts.cssClass ?? 'mermaid',
        }),
        name: 'mermaid',
    };
}
//# sourceMappingURL=mermaid.js.map