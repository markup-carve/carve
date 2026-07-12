// The heading id lives on the wrapping <section>, so drop it from the <h*>'s
// own attributes (keep classes / key-values and their source order).
function stripId(attrs) {
    if (!attrs?.id)
        return attrs;
    const { id: _id, order, ...rest } = attrs;
    return { ...rest, ...(order ? { order: order.filter((o) => o !== '#id') } : {}) };
}
/**
 * Append (or prepend) a clickable permalink anchor to each heading, ported
 * from carve-php's HeadingPermalinksExtension. Implemented via the heading
 * block renderer, so the `<section id>` wrapper stays core while the `<h*>`
 * gains the anchor:
 *
 * ```ts
 * carveToHtml('# My Heading', { extensions: [headingPermalinks()] })
 * // <section id="my-heading">
 * //   <h1>My Heading <a href="#my-heading" class="permalink" aria-label="Permalink">¶</a></h1>
 * // </section>
 * ```
 *
 * Configurable `symbol`, `cssClass`, `ariaLabel`, `levels`, `prepend`,
 * `showOnHover`, and `copyToClipboard`.
 */
export function headingPermalinks(opts = {}) {
    const symbol = opts.symbol ?? '¶';
    const cssClass = opts.cssClass ?? 'permalink';
    const ariaLabel = opts.ariaLabel ?? 'Permalink';
    const levels = opts.levels ?? [1, 2, 3, 4, 5, 6];
    const prepend = opts.prepend ?? false;
    const showOnHover = opts.showOnHover ?? false;
    const copyToClipboard = opts.copyToClipboard ?? false;
    return {
        name: 'heading-permalinks',
        blockRenderers: {
            heading: (node, ctx) => {
                const h = node;
                const id = h.attrs?.id;
                // Only top-level (section-wrapped) headings reach a heading renderer,
                // so the id is owned by the <section> and stripped from the <h*>.
                // Defer when out of the configured levels or there is no id to link to.
                if (!id || !levels.includes(h.level))
                    return undefined;
                const inner = ctx.renderInlines(h.children);
                const copyAttr = copyToClipboard ? ' data-permalink-copy=""' : '';
                const anchor = `<a href="#${ctx.escapeAttr(id)}" class="${ctx.escapeAttr(cssClass)}"` +
                    ` aria-label="${ctx.escapeAttr(ariaLabel)}"${copyAttr}>${ctx.escapeHtml(symbol)}</a>`;
                // showOnHover wraps the anchor so the hover CSS (`h*:hover >
                // .permalink-hover`) has a child to target; default is the bare anchor.
                const marker = showOnHover
                    ? `<span class="permalink-wrapper permalink-hover">${anchor}</span>`
                    : anchor;
                const body = prepend ? `${marker} ${inner}` : `${inner} ${marker}`;
                return `${ctx.indent(ctx.level)}<h${h.level}${ctx.renderAttrs(stripId(h.attrs))}>${body}</h${h.level}>`;
            },
        },
    };
}
//# sourceMappingURL=heading-permalinks.js.map