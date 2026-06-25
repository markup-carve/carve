import { AbbrBudget, utf8ByteLength } from './abbr-budget.js';
import { inlineText, slugify } from './heading-ids.js';
/**
 * Index terms (#91, Tier-3). Invisible `:index[term]` markers are collected
 * into a `::: index` block - a sorted `<ul class="index">` with one back-link
 * per occurrence. Reuses the `:name[…]` inline form; no new syntax. Off by
 * default, never corpus-pinned. See docs/extensions.md §8.
 */
export function index() {
    const occ = new WeakMap(); // marker node → 1-based occurrence
    const counts = new Map(); // slug → total occurrences
    const display = new Map(); // slug → first occurrence's term text
    const containers = new WeakSet();
    // Per-render output budget (DoS guard): K `::: index` blocks each re-emit the
    // full sorted backlink list, so raw output grows K x N x ~52 bytes and can
    // exhaust memory / V8's max string length. Mirrors AbbrBudget - reset per
    // render in `beforeRender`, capped at max(1MB, 8 x sourceByteLength), far
    // above any real document so the corpus is unaffected.
    let budget = new AbbrBudget(undefined);
    return {
        name: 'index',
        beforeRender(doc) {
            // `occ` is a WeakMap keyed by node identity; stale entries (old document's
            // nodes) are unreachable, so only the per-slug tallies need resetting.
            counts.clear();
            display.clear();
            budget = new AbbrBudget(doc.srcByteLength);
            // Assign each `:index[…]` marker in the body a per-slug occurrence index
            // in document order. Only `doc.children` (body) is indexed: markers in
            // deferred content (footnote definitions, which the core renderer may
            // drop or reorder) render inert (no id, see renderMarker), so the index
            // never points at an anchor that was dropped or duplicated.
            for (const block of doc.children)
                walkExtensions(block, 'index', (ext) => {
                    const slug = termSlug(ext.content);
                    const n = (counts.get(slug) ?? 0) + 1;
                    counts.set(slug, n);
                    occ.set(ext, n);
                    if (!display.has(slug))
                        display.set(slug, inlineText(ext.content));
                });
            // Deep walk for containers too: a `::: index` may be nested in a
            // blockquote / list / div, where the core renderer still dispatches.
            walkBlocks(doc, (b) => {
                if (isIndex(b))
                    containers.add(b);
            });
            return doc;
        },
        renderers: {
            index: (node, ctx) => renderMarker(node, ctx, occ),
        },
        blockRenderers: {
            admonition: (node, ctx) => containers.has(node) && counts.size > 0
                ? renderIndexList(node, ctx, counts, display, budget)
                : undefined,
        },
    };
}
const termSlug = (term) => slugify(inlineText(term), { lowercase: true });
function isIndex(b) {
    return b.type === 'admonition' && b.kind === 'index';
}
function renderMarker(node, ctx, occ) {
    const n = occ.get(node);
    // A marker outside the indexed body (e.g. inside a footnote definition) is
    // not counted: render it inert (no id) so the index never dangles.
    if (n === undefined)
        return `<span class="index-term"></span>`;
    const slug = termSlug(node.content);
    // Invisible: an empty *span* anchor target (not an <a>, so it never nests
    // inside a link label); the generated index back-links to its id.
    return `<span id="idx-${ctx.escapeAttr(slug)}-${n}" class="index-term"></span>`;
}
function renderIndexList(node, ctx, counts, display, budget) {
    const pad = ctx.indent(ctx.level);
    const inner = ctx.indent(ctx.level + 1);
    const slugs = [...counts.keys()].sort(byCodepoint);
    const items = [];
    // Charge cumulative emitted bytes against the per-render budget; once the
    // next item/backlink would overflow, stop emitting further index content
    // (graceful, no throw, no giant allocation). Re-emitted across K blocks, so
    // the cap bounds K x N amplification.
    for (const slug of slugs) {
        const li = `${inner}<li>${ctx.escapeHtml(display.get(slug))} `;
        if (!budget.charge(utf8ByteLength(li)))
            break;
        const links = [];
        let truncated = false;
        for (let m = 1; m <= counts.get(slug); m++) {
            const link = `<a href="#idx-${ctx.escapeAttr(slug)}-${m}" class="index-backref">↩</a>`;
            if (!budget.charge(utf8ByteLength(link))) {
                truncated = true;
                break;
            }
            links.push(link);
        }
        items.push(`${li}${links.join(' ')}</li>`);
        if (truncated)
            break;
    }
    // Carry the author's `{#id .class}` onto the <ul>, `index` stays leading.
    const ul = `${pad}<ul${ctx.renderAttrs(withBaseClass(node.attrs, 'index'))}>\n${items.join('\n')}\n${pad}</ul>`;
    // Preserve any authored content inside the placeholder before the list -
    // never silently drop authored blocks.
    if (node.children.length === 0)
        return ul;
    return `${ctx.renderChildren(node.children, ctx.level)}\n${ul}`;
}
function withBaseClass(attrs, base) {
    const a = attrs ? { ...attrs } : {};
    a.classes = [base, ...(a.classes ?? [])];
    return a;
}
/** Ascending Unicode-codepoint order (== UTF-8 byte order), locale-independent
 *  so every implementation sorts identically. Walks code points in place so it
 *  is O(min(len_a,len_b)) time with O(1) allocation - no per-comparison
 *  `Array.from` (which made sorting many long-common-prefix terms quadratic). */
function byCodepoint(a, b) {
    let i = 0;
    let j = 0;
    const la = a.length;
    const lb = b.length;
    while (i < la && j < lb) {
        const ca = a.codePointAt(i);
        const cb = b.codePointAt(j);
        if (ca !== cb)
            return ca - cb;
        // Advance by the code point's UTF-16 width so surrogate pairs compare by
        // their full code point (astral chars sort after the BMP, not by unit).
        i += ca > 0xffff ? 2 : 1;
        j += cb > 0xffff ? 2 : 1;
    }
    // Equal common prefix: the shorter (fewer remaining units) sorts first. Both
    // strings agreed code point by code point, so remaining-unit comparison
    // matches remaining-code-point comparison.
    return la - i - (lb - j);
}
/** Depth-first visit of every typed node, so a `::: index` nested in a
 *  blockquote / list / div is found too. Skips `pos` metadata. */
function walkBlocks(node, fn) {
    if (!node || typeof node !== 'object')
        return;
    if (typeof node.type === 'string')
        fn(node);
    for (const key of Object.keys(node)) {
        if (key === 'pos')
            continue;
        const v = node[key];
        if (Array.isArray(v))
            for (const el of v)
                walkBlocks(el, fn);
        else if (v && typeof v === 'object')
            walkBlocks(v, fn);
    }
}
/** Depth-first visit of every `extension` node with the given name, in document
 *  order. Generic field walk; skips `pos` metadata. */
function walkExtensions(node, name, fn) {
    if (!node || typeof node !== 'object')
        return;
    if (node.type === 'extension' && node.name === name) {
        fn(node);
        return;
    }
    for (const key of Object.keys(node)) {
        if (key === 'pos')
            continue;
        const v = node[key];
        if (Array.isArray(v))
            for (const el of v)
                walkExtensions(el, name, fn);
        else if (v && typeof v === 'object')
            walkExtensions(v, name, fn);
    }
}
//# sourceMappingURL=index-terms.js.map