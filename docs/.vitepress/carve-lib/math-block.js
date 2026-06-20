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
                // Emit only the fixed `math display` class. Author attributes from the
                // fence are intentionally NOT copied: rendering them here would bypass
                // safe-mode attribute filtering (an `{onclick=…}` on a ```math fence
                // would become an executable handler on the <div>).
                return `${ctx.indent(ctx.level)}<div class="math display">\\[${escapeMath(code.content)}\\]</div>`;
            },
        },
    };
}
//# sourceMappingURL=math-block.js.map