import { inlineText } from './heading-ids.js';
// Sentinel key-value marking a Link the matcher produced, so the beforeRender
// pass can find references without scanning every link in the document.
const MARK = 'data-heading-ref';
/** Normalize smart quotes to straight so headings and refs compare equal. */
function normalizeQuotes(text) {
    return text
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");
}
/** Recursively resolve heading-reference Links inside an inline list. */
function resolveInlines(nodes, targets, counts) {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.type === 'link' && node.attrs?.keyValues?.[MARK] !== undefined) {
            const link = node;
            const target = link.attrs.keyValues[MARK];
            const display = inlineText(link.children);
            const norm = normalizeQuotes(target);
            const id = targets.get(norm);
            if (id !== undefined && counts.get(norm) === 1) {
                // Resolved: point at the heading id, drop the internal marker.
                link.href = `#${id}`;
                const kv = { ...link.attrs.keyValues };
                delete kv[MARK];
                link.attrs = { ...link.attrs, keyValues: kv };
                if (link.attrs.order)
                    link.attrs.order = link.attrs.order.filter((s) => s !== MARK);
            }
            else {
                // Missing or duplicate heading: fall back to literal source text.
                const literal = target === display ? `[[${target}]]` : `[[${target}|${display}]]`;
                nodes[i] = { type: 'text', value: literal };
            }
            continue;
        }
        const kids = node.children ??
            node.content;
        if (Array.isArray(kids))
            resolveInlines(kids, targets, counts);
    }
}
/**
 * Resolve `[[Heading Text]]` references to intra-document heading links, ported
 * from carve-php's HeadingReferenceExtension. Supports custom display text via
 * `[[Heading Text|click here]]`.
 *
 * References resolve by heading PLAIN TEXT (not author-guessed ids), so authors
 * do not depend on slug rules. Smart quotes in heading text are normalized so a
 * reference written with straight quotes still matches. A reference to a missing
 * heading - or one whose text is ambiguous (appears on more than one heading) -
 * falls back to its literal `[[…]]` source text.
 *
 * Uses the parse-stage inline matcher (core leaves `[[…]]` literal) plus a
 * `beforeRender` resolution pass that reads the resolved heading ids.
 *
 * Note: like carve-php, this shares the `[[…]]` syntax with {@link wikilinks};
 * use only one of the two on the same render.
 *
 * ```ts
 * carveToHtml('See [[Getting Started]].\n\n# Getting Started', {
 *   extensions: [headingReference()],
 * })
 * // <p>See <a href="#Getting-Started" class="heading-ref">Getting Started</a>.</p> …
 * ```
 */
export function headingReference(opts = {}) {
    const classes = (opts.cssClass ?? 'heading-ref').split(' ').filter((c) => c !== '');
    return {
        name: 'heading-reference',
        matchInline(text, pos) {
            if (text[pos] !== '[' || text[pos + 1] !== '[')
                return null;
            // First target char must not be ']', '|', or '#' (matches the php
            // pattern; a leading '#' is a tag, left to core).
            const first = text[pos + 2];
            if (first === undefined || first === ']' || first === '|' || first === '#')
                return null;
            const close = text.indexOf(']]', pos + 2);
            if (close < 0)
                return null;
            const body = text.slice(pos + 2, close);
            const bar = body.indexOf('|');
            const rawTarget = bar >= 0 ? body.slice(0, bar) : body;
            // Target may not contain ']' (the pattern forbids it before the close).
            if (rawTarget.includes(']'))
                return null;
            const target = rawTarget.trim();
            if (target === '')
                return null;
            const display = bar >= 0 ? body.slice(bar + 1).trim() : target;
            const link = {
                type: 'link',
                href: '',
                attrs: { classes: [...classes], keyValues: { [MARK]: target }, order: ['.class', MARK] },
                children: [{ type: 'text', value: display }],
            };
            return { node: link, end: close + 2 };
        },
        beforeRender(doc) {
            // Build heading text -> id and occurrence counts (resolve() has already
            // assigned heading ids by now).
            const targets = new Map();
            const counts = new Map();
            for (const node of doc.children) {
                if (node.type !== 'heading')
                    continue;
                const h = node;
                const id = h.attrs?.id;
                const text = normalizeQuotes(inlineText(h.children).trim());
                if (text === '' || id === undefined)
                    continue;
                counts.set(text, (counts.get(text) ?? 0) + 1);
                if (!targets.has(text))
                    targets.set(text, id);
            }
            // Resolve references anywhere in the document (headings, paragraphs,
            // and nested block containers).
            for (const node of doc.children)
                walkBlock(node, targets, counts);
            return doc;
        },
    };
}
/** Resolve references nested inside non-paragraph block containers. */
function walkBlock(node, targets, counts) {
    switch (node.type) {
        case 'heading':
        case 'paragraph':
            resolveInlines(node.children, targets, counts);
            break;
        case 'blockquote':
        case 'div':
        case 'admonition':
            node.children.forEach((c) => walkBlock(c, targets, counts));
            break;
        case 'list':
            for (const it of node.items)
                it.children.forEach((c) => walkBlock(c, targets, counts));
            break;
        case 'table':
            for (const row of node.rows)
                for (const cell of row.cells)
                    resolveInlines(cell.children, targets, counts);
            break;
        case 'definition-list':
            for (const it of node.items) {
                for (const t of it.terms)
                    resolveInlines(t, targets, counts);
                for (const d of it.definitions)
                    for (const b of d)
                        walkBlock(b, targets, counts);
            }
            break;
        default:
            break;
    }
}
//# sourceMappingURL=heading-reference.js.map