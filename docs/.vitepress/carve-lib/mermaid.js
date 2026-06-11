// Escape for Mermaid content: encode `&` and `<` but keep `>` so arrow syntax
// (`A-->B`) survives, matching carve-php's MermaidExtension.
function escapeMermaid(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
/**
 * Render fenced code blocks tagged `mermaid` as `<pre class="mermaid">…</pre>`
 * for client-side Mermaid.js, instead of the default `<pre><code>`. Ported
 * from carve-php's MermaidExtension.
 *
 *     ``` mermaid
 *     graph TD; A-->B
 *     ```
 *
 * renders as `<pre class="mermaid">graph TD; A-->B</pre>` (`>` kept for arrows).
 * A non-mermaid code block defers to the core renderer.
 */
export function mermaid(opts = {}) {
    const cssClass = opts.cssClass ?? 'mermaid';
    const language = opts.language ?? 'mermaid';
    return {
        name: 'mermaid',
        blockRenderers: {
            'code-block': (node, ctx) => {
                const code = node;
                if (code.lang !== language)
                    return undefined;
                // Preserve the block's own attributes (and their source order) and
                // merge the mermaid class into the class group.
                const attrs = {
                    ...code.attrs,
                    classes: [cssClass, ...(code.attrs?.classes ?? [])],
                };
                return `${ctx.indent(ctx.level)}<pre${ctx.renderAttrs(attrs)}>${escapeMermaid(code.content)}</pre>`;
            },
        },
    };
}
//# sourceMappingURL=mermaid.js.map