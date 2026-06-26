/**
 * CodeCallouts (#88, Tier-2). `<n>` markers at the end of lines inside a fenced
 * code block render as `<b class="callout">` bubbles, and an immediately
 * following paragraph of `<n> text` lines becomes a bound `<ol class="callouts">`.
 * Off by default; optional-corpus pinned when enabled. See docs/extensions.md §10.
 */
export function codeCallouts() {
    // Identity tag for bound callout-list paragraphs - keeps the marker out of the
    // AST attrs (so it never leaks into HTML or non-HTML output).
    const calloutLists = new WeakSet();
    return {
        name: 'codeCallouts',
        afterParse(doc) {
            bindBlocks(doc.children, calloutLists);
            return doc;
        },
        blockRenderers: {
            'code-block': (node, ctx) => renderCode(node, ctx),
            paragraph: (node, ctx) => calloutLists.has(node) ? renderCalloutList(node, ctx) : undefined,
        },
    };
}
// A `<n>` that is the last non-whitespace content on its line.
const MARKER_RE = /^(.*?)(\s*)<(\d+)>[ \t]*$/;
// A callout-list line: `<n> text` (marker, one space, prose) at the start.
const ITEM_RE = /^<(\d+)> /;
// ----- afterParse: tag callout-list paragraphs --------------------------------
function bindBlocks(blocks, calloutLists) {
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        descend(b, calloutLists);
        if (b.type !== 'code-block' || !hasMarkers(b.content))
            continue;
        const next = blocks[i + 1];
        if (next && next.type === 'paragraph' && isCalloutCandidate(next)) {
            calloutLists.add(next);
        }
    }
}
function descend(b, calloutLists) {
    const anyB = b;
    if (Array.isArray(anyB.children))
        bindBlocks(anyB.children, calloutLists);
    if (Array.isArray(anyB.items))
        for (const it of anyB.items) {
            if (Array.isArray(it.children))
                bindBlocks(it.children, calloutLists); // list items
            if (Array.isArray(it.definitions))
                for (const def of it.definitions)
                    bindBlocks(def, calloutLists); // definition-list
        }
}
function hasMarkers(content) {
    return content.split('\n').some((l) => MARKER_RE.test(l));
}
/** Every soft-break line of the paragraph is a `<n> text` item (≥1). */
function isCalloutCandidate(p) {
    const lines = splitLines(p.children);
    return lines.length > 0 && lines.every((line) => firstText(line)?.match(ITEM_RE) != null);
}
// ----- render -----------------------------------------------------------------
function renderCode(node, ctx) {
    const lines = node.content.split('\n');
    if (!lines.some((l) => MARKER_RE.test(l)))
        return undefined;
    const pad = ctx.indent(ctx.level);
    const langAttr = node.lang ? ` class="language-${node.lang}"` : '';
    const body = lines
        .map((line) => {
        const m = MARKER_RE.exec(line);
        if (!m)
            return ctx.escapeHtml(line);
        const [, prefix, ws, n] = m;
        return `${ctx.escapeHtml(prefix)}${ws}<b class="callout" data-callout="${n}">${n}</b>`;
    })
        .join('\n');
    return `${pad}<pre${ctx.renderAttrs(node.attrs)}><code${langAttr}>${body}\n</code></pre>`;
}
function renderCalloutList(p, ctx) {
    const pad = ctx.indent(ctx.level);
    const inner = ctx.indent(ctx.level + 1);
    const items = splitLines(p.children).map((line) => {
        const head = firstText(line);
        const n = ITEM_RE.exec(head)[1];
        // Strip the leading `<n> ` from the first text node; render the rest inline.
        const rest = [
            { type: 'text', value: head.replace(ITEM_RE, '') },
            ...line.slice(1),
        ];
        return `${inner}<li value="${n}">${ctx.renderInlines(rest)}</li>`;
    });
    // Carry the author's `{#id .class}` onto the <ol> (minus our private marker),
    // `callouts` as the leading class - like the other block extensions.
    return `${pad}<ol${ctx.renderAttrs(listAttrs(p.attrs))}>\n${items.join('\n')}\n${pad}</ol>`;
}
/** The paragraph's authored attrs with `callouts` as the leading class. */
function listAttrs(attrs) {
    const a = attrs ? { ...attrs } : {};
    a.classes = ['callouts', ...(a.classes ?? [])];
    return a;
}
// ----- helpers ----------------------------------------------------------------
/** Split an inline run into per-line segments at each soft-break. */
function splitLines(nodes) {
    const lines = [[]];
    for (const n of nodes) {
        if (n.type === 'soft-break')
            lines.push([]);
        else
            lines[lines.length - 1].push(n);
    }
    return lines.filter((l) => l.length > 0);
}
function firstText(line) {
    const first = line[0];
    return first?.type === 'text' ? first.value : undefined;
}
//# sourceMappingURL=code-callouts.js.map