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
 * remain readable. Ported alongside carve-php's `MathBlockExtension`.
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
                // Preserve the block's own attributes; merge the math classes into the
                // class group (mandatory base classes first, matching inline math).
                const attrs = {
                    ...code.attrs,
                    classes: ['math', 'display', ...(code.attrs?.classes ?? [])],
                };
                return `${ctx.indent(ctx.level)}<div${ctx.renderAttrs(attrs)}>\\[${escapeMath(code.content)}\\]</div>`;
            },
        },
    };
}
//# sourceMappingURL=math-block.js.map