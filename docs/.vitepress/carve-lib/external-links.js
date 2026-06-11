function isExternal(href) {
    return /^https?:\/\//i.test(href);
}
// Set a key-value attribute, replacing any existing key that matches
// case-insensitively (HTML attribute names are case-insensitive and parsers
// keep the first duplicate, so a stray `{Target=_self}` would otherwise win).
function setAttr(attrs, name, value) {
    const kv = (attrs.keyValues ??= {});
    for (const key of Object.keys(kv)) {
        if (key !== name && key.toLowerCase() === name) {
            delete kv[key];
            if (attrs.order)
                attrs.order = attrs.order.filter((o) => o !== key);
        }
    }
    kv[name] = value;
}
/**
 * Add `target` and `rel` to external links (`http(s)://…`), ported from
 * carve-php's ExternalLinksExtension. Runs as a `beforeRender` transform, so
 * the attributes it sets are emitted by the core link renderer.
 *
 * ```ts
 * carveToHtml('[docs](https://example.com)', { extensions: [externalLinks()] })
 * // <p><a href="https://example.com" target="_blank" rel="noopener noreferrer">docs</a></p>
 * ```
 */
export function externalLinks(opts = {}) {
    const target = opts.target ?? '_blank';
    let rel = opts.rel ?? 'noopener noreferrer';
    if (opts.nofollow && !rel.split(/\s+/).includes('nofollow')) {
        rel = `${rel} nofollow`.trim();
    }
    // Generic recursive walk: external links can sit anywhere — inside table
    // cells, list items, captions, definition lists — so visit every nested node
    // regardless of which container property holds it, rather than only
    // `children` / `content`.
    const visit = (value) => {
        if (!value || typeof value !== 'object')
            return;
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item);
            return;
        }
        const node = value;
        // Both explicit `[text](url)` links and `<url>` angle autolinks carry an
        // href and render their attrs, so mark either when external.
        if ((node.type === 'link' || node.type === 'autolink') &&
            typeof node.href === 'string' &&
            isExternal(node.href)) {
            const attrs = (node.attrs ??= {});
            setAttr(attrs, 'target', target);
            setAttr(attrs, 'rel', rel);
        }
        for (const child of Object.values(value))
            visit(child);
    };
    return {
        name: 'external-links',
        beforeRender(doc) {
            // Walk the whole document, not just `children`, so links inside footnote
            // definitions (rendered in the endnotes section) are covered too.
            visit(doc);
            return doc;
        },
    };
}
//# sourceMappingURL=external-links.js.map