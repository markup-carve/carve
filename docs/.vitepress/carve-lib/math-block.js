// Mirror the core math renderer's escaping (`&`, `<`, `>`), so a fenced math
// block escapes its LaTeX the same way inline / display `$…$` math does. (Note
// this escapes `>` too, unlike the Mermaid extension which keeps `>` for arrows.)
function escapeMath(s) {
    return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}
/**
 * Render a fenced code block tagged `math` as a block-level
 * `<div class="math display">\[…\]</div>`, reusing Carve's math class and
 * delimiters so KaTeX / MathJax pick it up exactly like inline / display
 * `$…$` math. This is the block-fence form authors expect from
 * GitHub-Flavored Markdown / Pandoc.
 *
 *     ``` math
 *     \int_0^1 x^2 \, dx
 *     ```
 *
 * renders as `<div class="math display">\[\int_0^1 x^2 \, dx\]</div>`. A
 * non-math code block defers to the core renderer, and without the extension a
 * ` ```math ` block stays an ordinary `language-math` code block so documents
 * remain readable.
 *
 * A `{#eq .big key=val}` block-attribute line above the fence merges onto the
 * `<div>` exactly as core display `$$` math carries its attributes (the
 * `math display` base class ahead of author classes, other attributes in source
 * order). `ctx.renderAttrs` hardens names/values (strips `on*` / `srcdoc` /
 * `formaction`, neutralizes dangerous URL / `expression()` values), so a
 * `{onclick=…}` on a fence can never reach the output. Ported alongside
 * carve-php's `MathBlockExtension`.
 */
export function mathBlock(opts = {}) {
    const language = opts.language ?? 'math';
    return {
        name: 'math-block',
        blockRenderers: {
            'code-block': (node, ctx) => {
                const code = node;
                if (code.lang !== language)
                    return undefined;
                // Merge the `math display` base class ahead of author classes and copy
                // the author attributes, mirroring core display `$$` math (renderAttrs2
                // with baseClass). ctx.renderAttrs applies the always-on attribute
                // hardening, so a {onclick=…} fence cannot inject a handler.
                const attrs = { ...(code.attrs ?? {}) };
                attrs.classes = ['math display', ...(attrs.classes ?? [])];
                if (attrs.order && !attrs.order.includes('.class')) {
                    attrs.order = ['.class', ...attrs.order];
                }
                return `${ctx.indent(ctx.level)}<div${ctx.renderAttrs(attrs)}>\\[${escapeMath(code.content)}\\]</div>`;
            },
        },
    };
}
//# sourceMappingURL=math-block.js.map