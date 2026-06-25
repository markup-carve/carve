import { inlineText, slugify } from './heading-ids.js';
/**
 * Glossary (#91, Tier-3). A `::: glossary` definition list declares terms;
 * `:term[word]` links a use to its `<dt id="gloss-{slug}">`. Reuses the
 * definition-list and `:name[…]` inline forms - no new syntax. Off by default,
 * never corpus-pinned. See docs/extensions.md §7.
 */
export function glossary() {
    // Defined term slugs (across every `::: glossary` block); a render-time set
    // gives the id to the first occurrence of a duplicated slug only.
    const defined = new Set();
    const containers = new WeakSet();
    const idSeen = new Set();
    return {
        name: 'glossary',
        afterParse(doc) {
            defined.clear();
            idSeen.clear();
            // Deep walk: a `::: glossary` may be nested in a blockquote, list item,
            // or div, and the core renderer dispatches block renderers there too.
            walkBlocks(doc, (b) => {
                if (!isGlossary(b))
                    return;
                const lists = defListsOf(b);
                if (lists.length === 0)
                    return;
                for (const dl of lists)
                    for (const item of dl.items)
                        for (const term of item.terms)
                            defined.add(termSlug(term));
                containers.add(b);
            });
            return doc;
        },
        // Per-render reset: the first-wins id set must not survive into a second
        // render of the same AST on a reused instance.
        beforeRender(doc) {
            idSeen.clear();
            return doc;
        },
        renderers: {
            term: (node, ctx) => renderTerm(node, ctx, defined),
        },
        blockRenderers: {
            admonition: (node, ctx) => containers.has(node) ? renderGlossary(node, ctx, idSeen) : undefined,
        },
    };
}
const termSlug = (term) => slugify(inlineText(term), { lowercase: true });
function isGlossary(b) {
    return b.type === 'admonition' && b.kind === 'glossary';
}
function defListsOf(b) {
    return b.children.filter((c) => c.type === 'definition-list');
}
function renderTerm(node, ctx, defined) {
    const word = ctx.renderInlines(node.content);
    const slug = termSlug(node.content);
    // Carry the author's inline `{…}` onto the output, `term` stays leading.
    if (defined.has(slug)) {
        // The structural glossary target wins; drop any author `href` so the <a>
        // never has two (like core links).
        const attrs = ctx.renderAttrs(stripHref(withBaseClass(node.attrs, 'term')));
        return `<a href="#gloss-${ctx.escapeAttr(slug)}"${attrs}>${word}</a>`;
    }
    // Resolved, but no matching entry: degrade to a plain span, nothing dropped.
    return `<span${ctx.renderAttrs(withBaseClass(node.attrs, 'term'))}>${word}</span>`;
}
function stripHref(a) {
    if (!a.keyValues)
        return a;
    const hrefKeys = Object.keys(a.keyValues).filter((k) => k.toLowerCase() === 'href');
    if (hrefKeys.length === 0)
        return a;
    const keyValues = { ...a.keyValues };
    for (const k of hrefKeys)
        delete keyValues[k];
    const order = a.order?.filter((s) => s.toLowerCase() !== 'href');
    return { ...a, keyValues, ...(order ? { order } : {}) };
}
function renderGlossary(node, ctx, idSeen) {
    if (defListsOf(node).length === 0)
        return undefined;
    const pad = ctx.indent(ctx.level);
    const inner = ctx.indent(ctx.level + 1);
    // Render children in source order: each definition list becomes a
    // `<dl class="glossary">` in place, any other block is preserved verbatim -
    // so notes before/between/after the lists keep their position. The block's
    // authored `{#id .class}` rides on the first <dl>.
    let firstDl = true;
    const parts = [];
    for (const child of node.children) {
        if (child.type !== 'definition-list') {
            parts.push(ctx.renderChildren([child], ctx.level));
            continue;
        }
        const rows = [];
        for (const item of child.items) {
            for (const term of item.terms) {
                const slug = termSlug(term);
                const idAttr = idSeen.has(slug) ? '' : ` id="gloss-${ctx.escapeAttr(slug)}"`;
                idSeen.add(slug);
                rows.push(`${inner}<dt${idAttr}>${ctx.renderInlines(term)}</dt>`);
            }
            for (const def of item.definitions)
                rows.push(`${inner}<dd>${renderDef(def, ctx)}</dd>`);
        }
        const attrs = firstDl ? ctx.renderAttrs(withBaseClass(node.attrs, 'glossary')) : ' class="glossary"';
        firstDl = false;
        parts.push(`${pad}<dl${attrs}>\n${rows.join('\n')}\n${pad}</dl>`);
    }
    return parts.join('\n');
}
function withBaseClass(attrs, base) {
    const a = attrs ? { ...attrs } : {};
    a.classes = [base, ...(a.classes ?? [])];
    return a;
}
/** A single-paragraph definition collapses to inline content; a multi-block
 *  definition keeps its block wrappers (rendered at a deeper level). */
function renderDef(def, ctx) {
    if (def.length === 1 && def[0].type === 'paragraph')
        return ctx.renderInlines(def[0].children);
    return `\n${ctx.renderChildren(def, ctx.level + 2)}\n${ctx.indent(ctx.level + 1)}`;
}
/** Depth-first visit of every typed node, so a container nested in a
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
//# sourceMappingURL=glossary.js.map