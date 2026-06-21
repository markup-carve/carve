import type { CarveExtension } from './extension.js';
/** Options for the {@link mathBlock} extension. */
export interface MathBlockOptions {
    /** Language tag that marks a display-math block. Default `'math'`. */
    language?: string;
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
export declare function mathBlock(opts?: MathBlockOptions): CarveExtension;
//# sourceMappingURL=math-block.d.ts.map