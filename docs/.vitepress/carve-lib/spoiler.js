/**
 * Hidden / blurred "spoiler" content, revealed on interaction. Tier-3, the
 * standard `spoiler` extension from the spec's Extension Registry.
 *
 * - **Inline** `:spoiler[text]` → `<span class="spoiler">text</span>`. The
 *   blur + reveal is the host's CSS/JS (Carve only emits the marker, like
 *   Mermaid); see the docs for a reference accessible stylesheet.
 *
 * - **Block** `::: spoiler "Title"` → an HTML5 `<details class="spoiler">`
 *   disclosure (native, keyboard- and screen-reader-accessible). A title-less
 *   block falls back to `<summary>Spoiler</summary>` so the widget always has
 *   a label.
 *
 *       Plot: :spoiler[the butler did it].
 *
 *       ::: spoiler "Ending"
 *       Everyone lives.
 *       :::
 *
 * Without the extension, `:spoiler[x]` stays the generic `<span class="ext-spoiler">x</span>`
 * and `::: spoiler` stays a plain `<div class="spoiler">`, so documents remain
 * readable. Author attributes on either form merge onto the output element and
 * are hardened (event handlers / `srcdoc` / `formaction` stripped, dangerous
 * values neutralized) by the shared `renderAttrs`.
 */
export function spoiler() {
    return {
        name: 'spoiler',
        renderers: {
            spoiler: (node, ctx) => {
                const ext = node;
                const attrs = withBaseClass(ext.attrs, 'spoiler');
                return `<span${ctx.renderAttrs(attrs)}>${ctx.renderInlines(ext.content)}</span>`;
            },
        },
        blockRenderers: {
            admonition: (node, ctx) => {
                const adm = node;
                if (adm.kind !== 'spoiler')
                    return undefined;
                const pad = ctx.indent(ctx.level);
                const innerPad = ctx.indent(ctx.level + 1);
                const title = adm.title ? inlineText(adm.title) : '';
                const summary = title.trim() === '' ? 'Spoiler' : title;
                const attrs = withBaseClass(adm.attrs, 'spoiler');
                const open = `<details${ctx.renderAttrs(attrs)}>`;
                const body = ctx.renderChildren(adm.children, ctx.level + 1);
                return (`${pad}${open}\n` +
                    `${innerPad}<summary>${ctx.escapeHtml(summary)}</summary>\n` +
                    `${body}\n` +
                    `${pad}</details>`);
            },
        },
        // Static render: hiding is meaningless offline, so the content is revealed.
        // Inline: drop the blur, render the content plainly inside a revealed span.
        // Block: the disclosure is expanded into a flat `<section>` with the title
        // as a heading.
        staticInlineRenderers: {
            extension: (node, ctx) => {
                const ext = node;
                if (ext.name !== 'spoiler')
                    return undefined;
                const attrs = withBaseClass(ext.attrs, 'spoiler spoiler-revealed');
                return `<span${ctx.renderAttrs(attrs)}>${ctx.renderInlines(ext.content)}</span>`;
            },
        },
        staticBlockRenderers: {
            admonition: (node, ctx) => {
                const adm = node;
                if (adm.kind !== 'spoiler')
                    return undefined;
                const pad = ctx.indent(ctx.level);
                const innerPad = ctx.indent(ctx.level + 1);
                const title = adm.title ? inlineText(adm.title) : '';
                const summary = title.trim() === '' ? 'Spoiler' : title;
                const attrs = withBaseClass(adm.attrs, 'spoiler spoiler-revealed');
                const open = `<section${ctx.renderAttrs(attrs)}>`;
                const body = ctx.renderChildren(adm.children, ctx.level + 1);
                // Surface a grouping `[label]` (if any) as the caption floor after the
                // title - the static path consumes the node, so the core floor never
                // runs; preserving it keeps the no-content-dropped invariant.
                const labelLine = adm.label
                    ? `${innerPad}<p class="div-label">${ctx.escapeHtml(adm.label)}</p>\n`
                    : '';
                return (`${pad}${open}\n` +
                    `${innerPad}<h3 class="spoiler-title">${ctx.escapeHtml(summary)}</h3>\n` +
                    labelLine +
                    `${body}\n` +
                    `${pad}</section>`);
            },
        },
    };
}
/** Merge a base class ahead of the author classes (a fresh Attrs copy). */
function withBaseClass(attrs, base) {
    const a = attrs ? { ...attrs } : {};
    a.classes = [base, ...(a.classes ?? [])];
    return a;
}
/** Flatten an inline tree to its text content (titles only). */
function inlineText(nodes) {
    let s = '';
    for (const node of nodes) {
        const n = node;
        if (typeof n.value === 'string')
            s += n.value;
        const kids = n.children ?? n.content;
        if (Array.isArray(kids))
            s += inlineText(kids);
    }
    return s;
}
//# sourceMappingURL=spoiler.js.map