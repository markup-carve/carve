/** Citation key characters (Pandoc-compatible). */
const KEY = String.raw `[\w][\w:.#$%&+?<>~/-]*`;
// One `;`-item: optional prefix, optional `-` (suppress author), `@key`,
// optional `, locator`. Prefix is lazy so it stops at the `-?@key`.
const ITEM_RE = new RegExp(String.raw `^(.*?)(-?)@(${KEY})(?:,\s*(.*))?$`);
/** Private marker key on the carrier div that the block renderer turns into
 *  the references list. */
const REFS_MARK = 'data-cite-refs';
// Single-entry cache: the matcher is invoked repeatedly for the SAME inline
// text (once per `[` in it), so caching only the most-recent text gives the
// O(1)-per-opener win without a global Map retaining large source strings of
// past parses in a long-lived process.
let lastBracketMapText = null;
let lastBracketMap = {};
/**
 * Citations (#90, Tier-2). Bracketed `[@key]` references with an in-document
 * `[@key]: entry` bibliography and a generated references list. Bare `@key`
 * stays a core mention; only tail-less brackets containing a `@key` are
 * claimed. See docs/superpowers/specs/2026-06-11-citations-design.md.
 */
export function citations(opts = {}) {
    const mode = opts.mode ?? 'numbered';
    const defs = new Map();
    const numbers = new Map();
    const order = []; // cited+defined keys in first-citation order
    return {
        name: 'citations',
        matchInline: matchCitation,
        afterParse(doc) {
            // Reset per-document state so a reused extension instance does not leak
            // definitions/numbers across carveToHtml calls.
            defs.clear();
            numbers.clear();
            order.length = 0;
            doc.children = collectDefs(doc.children, defs);
            return doc;
        },
        beforeRender(doc) {
            // Number cited+defined keys in document order; collect them.
            for (const block of doc.children)
                walkCitationGroups(block, (g) => {
                    for (const item of g.items) {
                        if (!defs.has(item.key))
                            continue;
                        if (!numbers.has(item.key)) {
                            numbers.set(item.key, numbers.size + 1);
                            order.push(item.key);
                        }
                        item.number = numbers.get(item.key);
                    }
                });
            if (order.length === 0)
                return doc;
            // Place the references list via a marked carrier div the block renderer
            // turns into the list: inside an explicit `::: references` container
            // (div or admonition) if present, else appended at document end.
            const carrier = {
                type: 'div',
                attrs: { keyValues: { [REFS_MARK]: '' } },
                children: [],
            };
            const explicit = doc.children.find((b) => (b.type === 'div' && hasClass(b, 'references')) ||
                (b.type === 'admonition' && b.kind === 'references'));
            if (explicit)
                explicit.children.push(carrier);
            else
                doc.children.push(carrier);
            return doc;
        },
        inlineRenderers: {
            'citation-group': (node, ctx) => renderGroup(node, ctx, mode, numbers, defs),
        },
        blockRenderers: {
            div: (node, ctx) => {
                const kv = node.attrs?.keyValues;
                if (kv && REFS_MARK in kv)
                    return renderRefsList(ctx, mode, order, defs);
                return undefined;
            },
        },
    };
}
// ----- parse: matcher -------------------------------------------------------
function buildBracketMap(text) {
    const stack = [];
    const map = {};
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '\\') {
            i++;
            continue;
        }
        if (c === '[')
            stack.push(i);
        else if (c === ']') {
            const open = stack.pop();
            if (open !== undefined)
                map[open] = i;
        }
    }
    return map;
}
function bracketMapFor(text) {
    if (text !== lastBracketMapText) {
        lastBracketMap = buildBracketMap(text);
        lastBracketMapText = text;
    }
    return lastBracketMap;
}
function parseItem(raw, ctx) {
    const m = ITEM_RE.exec(raw.trim());
    if (!m)
        return null;
    const prefixText = m[1].replace(/\s+$/, '');
    const item = { key: m[3], suppressAuthor: m[2] === '-' };
    if (prefixText !== '')
        item.prefix = ctx.parseInlines(prefixText);
    const locText = m[4]?.trim();
    if (locText)
        item.locator = ctx.parseInlines(locText);
    return item;
}
const matchCitation = (text, pos, ctx) => {
    if (text[pos] !== '[')
        return null;
    const close = bracketMapFor(text)[pos];
    if (close === undefined)
        return null;
    const after = text[close + 1];
    if (after === '(' || after === '[' || after === '{')
        return null;
    const inner = text.slice(pos + 1, close);
    if (!inner.includes('@'))
        return null;
    const items = [];
    for (const part of inner.split(';')) {
        const item = parseItem(part, ctx);
        if (!item)
            return null;
        items.push(item);
    }
    if (items.length === 0)
        return null;
    const node = { type: 'citation-group', items, raw: text.slice(pos, close + 1) };
    return { node: node, end: close + 1 };
};
// ----- afterParse: collect [@key]: definitions ------------------------------
const ATTR_RE = /^\{([^}]*)\}\s*/;
// The `{author= year=}` block sits in the entry prose, so the core typographic
// pass may have turned its straight quotes into curly ones (#196). Accept both.
const KV_RE = (k) => new RegExp(`${k}\\s*=\\s*["“”]([^"“”]*)["“”]`);
/** Return a new block list with definition lines removed, populating `defs`.
 *  Consecutive `[@key]: entry` lines parse as one paragraph (soft-break
 *  separated), so split each paragraph into lines and collect per line. */
function collectDefs(blocks, defs) {
    const out = [];
    for (const b of blocks) {
        if (b.type !== 'paragraph') {
            out.push(b);
            continue;
        }
        const lines = splitOnSoftBreaks(b.children);
        const kept = [];
        for (const line of lines) {
            const def = asDefinition(line);
            if (def)
                defs.set(def.key, def.value);
            else
                kept.push(line);
        }
        if (kept.length === 0)
            continue; // whole paragraph was definitions
        if (kept.length === lines.length) {
            out.push(b); // nothing removed
            continue;
        }
        b.children = joinWithSoftBreaks(kept);
        out.push(b);
    }
    return out;
}
/** Split an inline run into segments at each soft-break (the breaks dropped). */
function splitOnSoftBreaks(nodes) {
    const lines = [[]];
    for (const n of nodes) {
        if (n.type === 'soft-break')
            lines.push([]);
        else
            lines[lines.length - 1].push(n);
    }
    return lines;
}
/** Inverse of splitOnSoftBreaks. */
function joinWithSoftBreaks(lines) {
    const out = [];
    lines.forEach((line, i) => {
        if (i > 0)
            out.push({ type: 'soft-break' });
        out.push(...line);
    });
    return out;
}
function asDefinition(kids) {
    const g = kids[0];
    if (!g || g.type !== 'citation-group')
        return null;
    const cg = g;
    if (cg.items.length !== 1)
        return null;
    const it = cg.items[0];
    if (it.prefix || it.locator || it.suppressAuthor)
        return null;
    const second = kids[1];
    if (!second || second.type !== 'text' || !second.value.startsWith(':'))
        return null;
    // Entry = inline content after the leading `: `, with the second text node's
    // leading colon stripped.
    const rest = [...kids.slice(1)];
    rest[0] = { type: 'text', value: second.value.replace(/^:\s*/, '') };
    const value = { entry: rest };
    // `{author= year=}` after the `:` attaches to the citation-group node (the
    // preceding non-text node), so read it from there first.
    const cgAttrs = cg.attrs?.keyValues;
    if (cgAttrs?.author !== undefined)
        value.author = cgAttrs.author;
    if (cgAttrs?.year !== undefined)
        value.year = cgAttrs.year;
    // Fallback: a leading `{…}` left in the entry text (when it did not attach).
    const head = rest[0];
    if (value.author === undefined && head?.type === 'text') {
        const am = ATTR_RE.exec(head.value);
        if (am) {
            const inside = am[1];
            const author = KV_RE('author').exec(inside)?.[1];
            const year = KV_RE('year').exec(inside)?.[1];
            if (author !== undefined)
                value.author = author;
            if (year !== undefined)
                value.year = year;
            head.value = head.value.slice(am[0].length);
            if (head.value === '')
                rest.shift();
        }
    }
    // Strip a leading space left behind by a consumed attr block.
    if (head?.type === 'text')
        head.value = head.value.replace(/^\s+/, '');
    return { key: it.key, value };
}
// ----- render ---------------------------------------------------------------
function renderGroup(node, ctx, mode, numbers, defs) {
    // Any item whose key has no definition ⇒ render the source verbatim.
    if (node.items.some((it) => !defs.has(it.key)))
        return ctx.escapeHtml(node.raw);
    const pre = (it) => (it.prefix ? `${ctx.renderInlines(it.prefix)} ` : '');
    const loc = (it) => (it.locator ? `, ${ctx.renderInlines(it.locator)}` : '');
    if (mode === 'author-date') {
        const parts = node.items.map((it) => {
            const d = defs.get(it.key);
            const label = it.suppressAuthor
                ? d.year ?? String(it.number ?? '')
                : `${d.author ?? ''} ${d.year ?? ''}`.trim() || String(it.number ?? '');
            return `${pre(it)}<a href="#ref-${ctx.escapeAttr(it.key)}">${ctx.escapeHtml(label)}</a>${loc(it)}`;
        });
        return `(${parts.join('; ')})`;
    }
    const parts = node.items.map((it) => {
        const n = numbers.get(it.key);
        return `${pre(it)}<a href="#ref-${ctx.escapeAttr(it.key)}">${n}</a>${loc(it)}`;
    });
    return `[${parts.join(', ')}]`;
}
function renderRefsList(ctx, mode, order, defs) {
    const pad = ctx.indent(ctx.level);
    const keys = [...order];
    if (mode === 'author-date') {
        keys.sort((a, b) => (defs.get(a)?.author ?? a).localeCompare(defs.get(b)?.author ?? b));
    }
    // Both modes use a list element so the markup is valid; numbered is ordered.
    const tag = mode === 'author-date' ? 'ul' : 'ol';
    const items = keys
        .map((k) => `${pad}  <li id="ref-${ctx.escapeAttr(k)}">${ctx.renderInlines(defs.get(k).entry)}</li>`)
        .join('\n');
    return `${pad}<${tag} class="references">\n${items}\n${pad}</${tag}>`;
}
// ----- helpers --------------------------------------------------------------
function hasClass(b, cls) {
    const attrs = b.attrs;
    return !!attrs?.classes?.includes(cls);
}
/** Depth-first visit of every citation-group under a node, in document order.
 *  Generic walk: arrays preserve order, and a citation-group has no nested
 *  citation-groups, so this yields correct first-citation order. */
function walkCitationGroups(node, fn) {
    if (!node || typeof node !== 'object')
        return;
    if (node.type === 'citation-group') {
        fn(node);
        return;
    }
    for (const key of Object.keys(node)) {
        if (key === 'pos')
            continue;
        const v = node[key];
        if (Array.isArray(v))
            for (const el of v)
                walkCitationGroups(el, fn);
        else if (v && typeof v === 'object')
            walkCitationGroups(v, fn);
    }
}
//# sourceMappingURL=citations.js.map