import { inlineText } from './heading-ids.js';
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
// Build a nested list from a flat, document-order entry list. Standard stack
// walk: close deeper lists, open one nested list when going deeper (a jump of
// more than one level nests once, no synthetic empty levels), emit a sibling
// at the same level. A heading shallower than its predecessor but still deeper
// than an ancestor stays nested under that ancestor.
function buildList(entries, listType) {
    let html = '';
    const open = []; // levels of currently-open lists, outer→inner
    for (const e of entries) {
        if (open.length === 0) {
            html += `<${listType}>`;
            open.push(e.level);
        }
        else {
            // Never pop the root list, so a heading shallower than the first one
            // stays a sibling in a single root list instead of opening a second.
            while (open.length > 1 && open[open.length - 1] > e.level) {
                html += `</li></${listType}>`;
                open.pop();
            }
            if (open[open.length - 1] < e.level) {
                html += `<${listType}>`;
                open.push(e.level);
            }
            else {
                html += '</li>';
                if (e.level < open[open.length - 1])
                    open[open.length - 1] = e.level;
            }
        }
        html += `<li><a href="#${escapeHtml(e.id)}">${escapeHtml(e.text)}</a>`;
    }
    while (open.length) {
        html += `</li></${listType}>`;
        open.pop();
    }
    return html;
}
/**
 * Generate a table of contents from the document's headings, ported from
 * carve-php's TableOfContentsExtension. A `beforeRender` transform that
 * collects headings (with their resolved ids) and injects a `<nav>` of nested
 * links at the top or bottom of the document.
 *
 * ```ts
 * carveToHtml(src, { extensions: [tableOfContents()] })
 * // <nav class="toc"><ul><li><a href="#intro">Intro</a> … </ul></nav> … document …
 * ```
 *
 * Configurable `minLevel`, `maxLevel`, `listType`, `cssClass`, and `position`.
 */
export function tableOfContents(opts = {}) {
    const minLevel = opts.minLevel ?? 1;
    const maxLevel = opts.maxLevel ?? 6;
    // Coerce to a known tag: the value is interpolated into raw HTML, so an
    // untrusted/JSON-supplied listType must not inject markup.
    const listType = opts.listType === 'ol' ? 'ol' : 'ul';
    const cssClass = opts.cssClass ?? 'toc';
    const position = opts.position ?? 'top';
    return {
        name: 'table-of-contents',
        beforeRender(doc) {
            const entries = [];
            for (const node of doc.children) {
                if (node.type !== 'heading')
                    continue;
                const h = node;
                const id = h.attrs?.id;
                if (!id || h.level < minLevel || h.level > maxLevel)
                    continue;
                entries.push({ level: h.level, text: inlineText(h.children), id });
            }
            if (entries.length === 0)
                return doc;
            const html = `<nav class="${escapeHtml(cssClass)}">${buildList(entries, listType)}</nav>`;
            const toc = { type: 'raw-block', format: 'html', content: html };
            if (position === 'top')
                doc.children.unshift(toc);
            else
                doc.children.push(toc);
            return doc;
        },
    };
}
//# sourceMappingURL=table-of-contents.js.map