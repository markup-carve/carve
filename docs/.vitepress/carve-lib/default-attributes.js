// carve-php uses snake_case node-type names; carve-js uses its own AST `type`
// strings. This maps each carve-php type to the carve-js AST type(s) it targets.
//
// The set mirrors carve-php's ACTUAL behavior, which differs from its docblock:
// carve-php applies a default only when a node's getType() equals the key, and
// its sub-structural nodes (list_item, table_cell, table_row) are rendered
// inline by their parent without a dispatch the extension can catch, so a
// default keyed on them never applies. We exclude those here to match. A php
// `div` default applies to BOTH a bare div and an admonition (carve-php has one
// Div node covering both; carve-js splits them), so `div` maps to both. Emphasis
// kinds map to the carve-js emphasis `type`: `emphasis` -> italic (`/x/`),
// `superscript` -> super (`^x^`), `strike` -> strike (`~x~`).
const TYPE_MAP = {
    paragraph: ['paragraph'],
    heading: ['heading'],
    code_block: ['code-block'],
    block_quote: ['blockquote'],
    list: ['list'],
    table: ['table'],
    div: ['div', 'admonition'],
    thematic_break: ['thematic-break'],
    link: ['link'],
    image: ['image'],
    span: ['span'],
    code: ['code'],
    footnote: ['footnote'],
    footnote_ref: ['footnote'],
    emphasis: ['italic'],
    strong: ['strong'],
    superscript: ['super'],
    subscript: ['sub'],
    strike: ['strike'],
};
/** Ensure `attrs.order` records a slot once, at first appearance. */
function pushOrder(attrs, slot) {
    if (!attrs.order)
        attrs.order = [];
    if (!attrs.order.includes(slot))
        attrs.order.push(slot);
}
function mergeClasses(attrs, classes) {
    const existing = attrs.classes ?? [];
    let changed = false;
    for (const cls of classes.split(' ')) {
        const c = cls.trim();
        if (c !== '' && !existing.includes(c)) {
            existing.push(c);
            changed = true;
        }
    }
    if (changed) {
        attrs.classes = existing;
        pushOrder(attrs, '.class');
    }
}
function applyDefaults(node, defaults) {
    const n = node;
    if (!n.attrs)
        n.attrs = {};
    const attrs = n.attrs;
    for (const [name, value] of Object.entries(defaults)) {
        if (name === 'class') {
            mergeClasses(attrs, value);
            continue;
        }
        if (name === 'id') {
            if (attrs.id === undefined) {
                attrs.id = value;
                pushOrder(attrs, '#id');
            }
            continue;
        }
        // Only set a key-value if the node does not already have it (case-sensitive
        // key, matching carve-php's hasAttribute check).
        if (!attrs.keyValues || attrs.keyValues[name] === undefined) {
            attrs.keyValues = { ...(attrs.keyValues ?? {}), [name]: value };
            pushOrder(attrs, name);
        }
    }
}
function visit(node, byType) {
    const defaults = byType.get(node.type);
    if (defaults)
        applyDefaults(node, defaults);
    // Recurse into every child container the AST exposes.
    const block = node;
    const inline = node;
    if (Array.isArray(node.children)) {
        for (const c of node.children)
            visit(c, byType);
    }
    if (Array.isArray(inline.content)) {
        for (const c of inline.content)
            visit(c, byType);
    }
    switch (node.type) {
        case 'list':
            for (const it of block.items)
                for (const c of it.children)
                    visit(c, byType);
            break;
        case 'definition-list':
            for (const it of block.items) {
                for (const t of it.terms)
                    for (const c of t)
                        visit(c, byType);
                for (const d of it.definitions)
                    for (const c of d)
                        visit(c, byType);
            }
            break;
        case 'table':
            // Visiting each cell applies cell defaults and recurses into the cell's
            // inline children via the generic `children` walk above - no second pass.
            for (const row of block.rows)
                for (const cell of row.cells)
                    visit(cell, byType);
            break;
        case 'figure':
            visit(block.target, byType);
            break;
        case 'blockquote': {
            const attribution = block.attribution;
            if (attribution)
                for (const c of attribution)
                    visit(c, byType);
            break;
        }
        default:
            break;
    }
}
/**
 * Apply configured default attributes to nodes by type, ported from carve-php's
 * DefaultAttributesExtension. Useful for adding CSS classes, lazy-loading, etc.
 *
 * A `beforeRender` transform. A `class` default is merged with any existing
 * classes; any other attribute is only set when the node does not already
 * carry it. Element types use carve-php's snake_case names (e.g. `code_block`,
 * `block_quote`); the carve-js AST equivalents are bridged via {@link TYPE_MAP}.
 *
 * Coverage matches carve-php's actual behavior: the sub-structural types
 * `list_item`, `table_cell`, and `table_row` are NOT targetable (carve-php does
 * not apply defaults to them either), and a `div` default also covers
 * admonitions. An unknown type key is a no-op.
 *
 * ```ts
 * carveToHtml('![x](a.jpg)', {
 *   extensions: [defaultAttributes({ defaults: { image: { loading: 'lazy' } } })],
 * })
 * // <img src="a.jpg" alt="x" loading="lazy">
 * ```
 */
export function defaultAttributes(opts = {}) {
    const defaults = opts.defaults ?? {};
    const byType = new Map();
    for (const [phpType, attrs] of Object.entries(defaults)) {
        const jsTypes = TYPE_MAP[phpType];
        if (!jsTypes)
            continue; // Unknown / non-applicable type (e.g. list_item).
        for (const jsType of jsTypes)
            byType.set(jsType, attrs);
    }
    return {
        name: 'default-attributes',
        beforeRender(doc) {
            if (byType.size === 0)
                return doc;
            for (const c of doc.children)
                visit(c, byType);
            return doc;
        },
    };
}
//# sourceMappingURL=default-attributes.js.map