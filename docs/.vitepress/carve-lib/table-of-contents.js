import { inlineText } from './heading-ids.js';
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
// Build a nested list from a flat, document-order entry list. This is a
// byte-faithful port of carve-php's TableOfContentsExtension::renderTocList so
// the TOC HTML is identical across implementations: one tag per line, and a
// heading deeper than its predecessor's predecessor stays a sibling <li> in the
// same nested <ul> (rather than opening a fresh <ul>). Returns the `<ul>…</ul>`
// list including its trailing newline, matching the php source exactly.
function buildList(entries, listType) {
    if (entries.length === 0)
        return '';
    let html = `<${listType}>\n`;
    const levelStack = [entries[0].level];
    let hasOpenItem = false;
    for (const e of entries) {
        if (hasOpenItem) {
            let depth = levelStack.length;
            const currentLevel = levelStack[depth - 1];
            if (e.level > currentLevel) {
                html += `\n<${listType}>\n`;
                levelStack.push(e.level);
            }
            else {
                while (depth > 1 && e.level <= levelStack[depth - 2]) {
                    html += `</li>\n</${listType}>\n`;
                    levelStack.pop();
                    depth--;
                }
                html += '</li>\n';
            }
        }
        html += `<li><a href="#${escapeHtml(e.id)}">${escapeHtml(e.text)}</a>`;
        hasOpenItem = true;
    }
    html += '</li>\n';
    let depth = levelStack.length;
    while (depth > 1) {
        html += `</${listType}>\n</li>\n`;
        levelStack.pop();
        depth--;
    }
    html += `</${listType}>\n`;
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
            const html = `<nav class="${escapeHtml(cssClass)}">\n${buildList(entries, listType)}</nav>`;
            const toc = { type: 'raw-block', format: 'html', content: html };
            if (position === 'top')
                doc.children.unshift(toc);
            else
                doc.children.push(toc);
            return doc;
        },
    };
}
// Attribute keys on a `::: toc` directive that configure the level window and
// must NOT leak onto the emitted `<nav>` as HTML attributes.
const RESERVED_TOC_ATTRS = new Set(['depth', 'from', 'to']);
/** Parse a heading level from an attribute value, clamped to 1-6; falls back
 *  when absent or non-numeric so a bad `{depth=x}` degrades instead of throwing. */
function levelOf(v, fallback) {
    if (v === undefined)
        return fallback;
    const n = Number.parseInt(v, 10);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(6, Math.max(1, n));
}
/** Resolve the heading-level window for a `::: toc` directive from its attrs.
 *  `{from=X to=Y}` is an explicit range (swapped if inverted); `{depth=N}` is
 *  shorthand for levels 1..N. `from`/`to` win over `depth` when both appear. */
function tocWindow(attrs) {
    const kv = attrs?.keyValues ?? {};
    if (kv.from !== undefined || kv.to !== undefined) {
        let minLevel = levelOf(kv.from, 1);
        let maxLevel = levelOf(kv.to, 6);
        if (minLevel > maxLevel)
            [minLevel, maxLevel] = [maxLevel, minLevel];
        return { minLevel, maxLevel };
    }
    return { minLevel: 1, maxLevel: levelOf(kv.depth, 6) };
}
/** Build the `<nav>`'s attributes: force a leading `toc` class, carry the
 *  author's `{#id .class}`, and drop the directive-only `depth`/`from`/`to`
 *  keys so they never render as HTML attributes. */
function navAttrs(attrs) {
    const a = { classes: ['toc', ...(attrs?.classes ?? [])] };
    if (attrs?.id !== undefined)
        a.id = attrs.id;
    const kv = attrs?.keyValues;
    if (kv) {
        const kept = {};
        for (const k of Object.keys(kv))
            if (!RESERVED_TOC_ATTRS.has(k))
                kept[k] = kv[k];
        if (Object.keys(kept).length > 0)
            a.keyValues = kept;
    }
    return a;
}
function renderToc(node, ctx, entries) {
    const { minLevel, maxLevel } = tocWindow(node.attrs);
    const picked = entries.filter((e) => e.level >= minLevel && e.level <= maxLevel);
    const attrs = ctx.renderAttrs(navAttrs(node.attrs));
    // Newlined, column-0 nav matching carve-php byte-for-byte; empty window
    // degrades to a single-line empty nav.
    const nav = picked.length === 0
        ? `<nav${attrs}></nav>`
        : `<nav${attrs}>\n${buildList(picked, 'ul')}</nav>`;
    // Preserve any authored blocks written inside the placeholder before the nav,
    // never silently drop them (mirrors the index/glossary directives).
    if (node.children.length === 0)
        return nav;
    return `${ctx.renderChildren(node.children, ctx.level)}\n${nav}`;
}
/**
 * In-document TOC placement directive (Tier-3). Unlike {@link tableOfContents}
 * (which injects one TOC at the document top or bottom), this renders a
 * `<nav class="toc">` exactly where the author writes a `::: toc` block, so a
 * long document can place its contents after an intro. Off by default.
 *
 * The block parses as a typed admonition (`kind: 'toc'`); this extension takes
 * over its rendering. The level window is set with attributes on the line
 * *before* the opener (Carve attaches `:::`-block attributes on a preceding
 * attribute line, not inline on the opener):
 *
 * ```
 * ::: toc              (all levels, 1-6)
 * :::
 *
 * {depth=2}            (levels 1-2)
 * ::: toc
 * :::
 *
 * {from=2 to=4}        (levels 2-4)
 * ::: toc
 * :::
 * ```
 *
 * Reads the resolved (dedup-aware) heading ids from `heading.attrs.id`, so
 * links always match the emitted `<h*>` anchors. If the extension is absent the
 * block degrades to a plain `<aside class="admonition toc">` placeholder.
 */
export function tocPlacement() {
    let entries = [];
    return {
        name: 'toc',
        beforeRender(doc) {
            entries = [];
            for (const node of doc.children) {
                if (node.type !== 'heading')
                    continue;
                const h = node;
                const id = h.attrs?.id;
                if (id === undefined)
                    continue;
                entries.push({ level: h.level, text: inlineText(h.children), id });
            }
            return doc;
        },
        blockRenderers: {
            admonition: (node, ctx) => {
                const a = node;
                return a.kind === 'toc' ? renderToc(a, ctx, entries) : undefined;
            },
        },
    };
}
//# sourceMappingURL=table-of-contents.js.map