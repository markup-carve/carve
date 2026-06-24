/**
 * Render `::: details` admonitions as the HTML5 `<details>/<summary>`
 * disclosure element instead of the default `<div class="details">`.
 *
 * `details` is an ordinary Tier-2 custom admonition type, so by default it
 * renders as a generic `<div class="details">` (grammar PART 9 §12). This
 * Tier-3 extension opts into the native disclosure widget per the extensions
 * contract (§4.20): a collapsible block whose quoted title becomes the
 * `<summary>`.
 *
 *     ::: details "More info"
 *     Hidden until the reader expands it.
 *     :::
 *
 * renders as
 *
 *     <details>
 *       <summary>More info</summary>
 *       <p>Hidden until the reader expands it.</p>
 *     </details>
 *
 * A details block with no title gets a default `<summary>Details</summary>`
 * so the widget always has an accessible label. Block attributes on the
 * opener (`{#faq .open}`) carry onto the `<details>` tag, matching the
 * default `<div class="details">` behavior.
 *
 * Implemented as a block-node renderer (extensions contract §2.3): the inner
 * content is rendered by the core renderer at the correct nesting level, so a
 * details block behaves identically wherever it sits — top level, inside a
 * list item, inside a blockquote. The summary renders as escaped plain text
 * (inline markup in a title is flattened), and the widget needs raw-HTML
 * output, so it is inert when raw HTML is stripped.
 *
 * @example
 * carveToHtml(src, { extensions: [details()] })
 */
export function details() {
    return {
        name: 'details',
        blockRenderers: {
            admonition: (node, ctx) => {
                const adm = node;
                if (adm.kind !== 'details')
                    return undefined;
                const pad = ctx.indent(ctx.level);
                const innerPad = ctx.indent(ctx.level + 1);
                const title = adm.title ? inlineText(adm.title) : '';
                const summary = title.trim() === '' ? 'Details' : title;
                const open = `<details${ctx.renderAttrs(adm.attrs)}>`;
                const body = ctx.renderChildren(adm.children, ctx.level + 1);
                return (`${pad}${open}\n` +
                    `${innerPad}<summary>${ctx.escapeHtml(summary)}</summary>\n` +
                    `${body}\n` +
                    `${pad}</details>`);
            },
        },
        // Static render: a disclosure is NOT flattened. It stays the same native
        // `<details>/<summary>` element as the interactive path, but carries the
        // `open` attribute so the body is expanded by default for print / archival.
        staticBlockRenderers: {
            admonition: (node, ctx) => {
                const adm = node;
                if (adm.kind !== 'details')
                    return undefined;
                const pad = ctx.indent(ctx.level);
                const innerPad = ctx.indent(ctx.level + 1);
                const title = adm.title ? inlineText(adm.title) : '';
                const summary = title.trim() === '' ? 'Details' : title;
                const open = `<details open${ctx.renderAttrs(adm.attrs)}>`;
                const body = ctx.renderChildren(adm.children, ctx.level + 1);
                return (`${pad}${open}\n` +
                    `${innerPad}<summary>${ctx.escapeHtml(summary)}</summary>\n` +
                    `${body}\n` +
                    `${pad}</details>`);
            },
        },
    };
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
//# sourceMappingURL=details.js.map