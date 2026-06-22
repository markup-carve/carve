const MAX_RENDER_DEPTH = 200;
export function renderPlainText(ast, _opts = {}) {
    const ctx = { blockDepth: 0, inlineDepth: 0 };
    const out = renderBlocks(ast.children, ctx);
    const footnotes = renderFootnoteDefs(ast, ctx);
    return normalize(`${out}${footnotes}`);
}
function renderBlocks(blocks, ctx) {
    if (ctx.blockDepth >= MAX_RENDER_DEPTH)
        return '';
    ctx.blockDepth++;
    try {
        return blocks.map((b) => renderBlock(b, ctx)).join('');
    }
    finally {
        ctx.blockDepth--;
    }
}
function renderBlock(node, ctx) {
    switch (node.type) {
        case 'heading':
            return `${renderInlines(node.children, ctx)}\n\n`;
        case 'paragraph':
            if (isLegacyDefinitionParagraph(node)) {
                const [term, def] = legacyDefinitionParts(node);
                return `${stripControls(term)}\n  ${stripControls(def)}\n\n`;
            }
            return `${renderInlines(node.children, ctx)}\n\n`;
        case 'code-block':
            return `${stripControls(node.content)}\n\n`;
        case 'blockquote':
            return `"${renderBlocks(node.children, ctx).trim()}"\n\n`;
        case 'list':
            return renderList(node, ctx);
        case 'thematic-break':
            return '---\n\n';
        case 'table':
            return renderTable(node, ctx);
        case 'admonition': {
            const body = renderBlocks(node.children, ctx);
            const title = node.title !== undefined ? renderInlines(node.title, ctx) : '';
            if (title !== '') {
                return `${title}\n\n${body}`;
            }
            return body;
        }
        case 'div':
            return renderBlocks(node.children, ctx);
        case 'definition-list':
            return renderDefinitionList(node.items, ctx, true);
        case 'figure':
            return renderFigure(node, ctx);
        case 'image':
            return stripControls(node.alt);
        case 'raw-block':
        case 'abbreviation-def':
        case 'comment':
            return '';
        default: {
            const t = node;
            throw new Error(`renderPlainText: unknown block ${t.type}`);
        }
    }
}
function renderList(node, ctx) {
    let out = '';
    let counter = node.start ?? 1;
    for (const item of node.items) {
        out += node.ordered ? `${counter}. ` : '- ';
        counter++;
        out += `${renderBlocks(item.children, ctx).trim()}\n`;
    }
    return `${out}\n`;
}
function renderDefinitionList(items, ctx, trailingBlank) {
    let out = '';
    for (const item of items) {
        for (const term of item.terms)
            out += `${renderInlines(term, ctx)}\n`;
        for (const def of item.definitions)
            out += `  ${renderBlocks(def, ctx).trim()}\n`;
    }
    return trailingBlank ? `${out}\n` : out;
}
function renderTable(node, ctx) {
    let out = '';
    for (const row of node.rows) {
        out += `${row.cells.map((cell) => renderInlines(cell.children, ctx).trim()).join(' | ')}\n`;
    }
    if (node.caption)
        out = `${out.trimEnd()}\n${renderInlines(node.caption, ctx)}\n`;
    return `${out}\n`;
}
function renderFigure(node, ctx) {
    const target = node.target.type === 'image'
        ? stripControls(node.target.alt)
        : node.target.type === 'table'
            ? renderTable(node.target, ctx).trim()
            : renderBlock(node.target, ctx).trim();
    // A block-level target (a code-block listing or a display-math equation)
    // keeps the caption on its own line; an inline image target stays adjacent.
    const sep = node.target.type === 'code-block' || node.target.type === 'paragraph' ? '\n' : '';
    return `${target}${sep}${renderInlines(node.caption, ctx)}`;
}
function renderFootnoteDefs(ast, ctx) {
    if (!ast.footnoteDefs)
        return '';
    let out = '';
    for (const [label, blocks] of Object.entries(ast.footnoteDefs)) {
        out += `[${stripControls(label)}]: ${renderBlocks(blocks, ctx).trim()}\n`;
    }
    return out;
}
function renderInlines(nodes, ctx) {
    if (ctx.inlineDepth >= MAX_RENDER_DEPTH)
        return '';
    ctx.inlineDepth++;
    try {
        return nodes.map((node) => renderInline(node, ctx)).join('');
    }
    finally {
        ctx.inlineDepth--;
    }
}
function renderInline(node, ctx) {
    switch (node.type) {
        case 'text':
            return cleanEscapedText(node);
        case 'italic':
        case 'strong':
        case 'underline':
        case 'super':
        case 'sub':
        case 'highlight':
        case 'bold-italic':
        case 'span':
        case 'critic-insert':
        case 'strike':
            return renderInlines(node.children, ctx);
        case 'critic-delete':
            return `~${renderInlines(node.children, ctx)}~`;
        case 'code':
            return stripControls(node.value);
        case 'link':
            return node.href.startsWith('#') ? renderInlines(node.children, ctx) : stripControls(node.href);
        case 'image':
            return stripControls(node.alt);
        case 'math':
            return stripControls(node.content);
        case 'raw-inline':
            return '';
        case 'emoji':
            return `:${stripControls(node.name)}:`;
        case 'autolink':
            return stripControls(node.href.startsWith('mailto:') ? node.href.slice(7) : node.href);
        case 'mention':
            return `@${stripControls(node.user)}`;
        case 'tag':
            return `#${stripControls(node.name)}`;
        case 'extension':
            return renderInlines(node.content, ctx);
        case 'abbreviation':
            return stripControls(node.abbr);
        case 'footnote':
            return node.inline ? `(${renderInlines(node.inline, ctx)})` : `[${stripControls(node.id ?? '')}]`;
        case 'soft-break':
            return ' ';
        case 'hard-break':
            return '\n';
        case 'critic-substitute':
            // Keep both sides (old struck like critic-delete, then new).
            return `~${stripControls(node.oldText)}~${stripControls(node.newText)}`;
        case 'critic-comment':
            return '';
        case 'crossref':
            return `</#${stripControls(node.target)}>`;
        case 'caption-number':
            return node.n === undefined ? '#' : String(node.n);
        case 'citation-group':
            // Tier-2 ext node; the core renderer has no numbering, so emit the source.
            return stripControls(node.raw);
        case 'comment':
            return '';
        default: {
            const t = node;
            throw new Error(`renderPlainText: unknown inline ${t.type}`);
        }
    }
}
function normalize(text) {
    // The internal non-breaking-space placeholder (U+E000) collapses to an
    // ordinary space in plain text. Done after trimming so placeholder-derived
    // leading indentation (e.g. in a line block) survives; a literal U+00A0 in
    // the author's text is left intact.
    return `${text.replace(/\n{3,}/g, '\n\n').trim()}\n`.replace(/\ue000/g, ' ');
}
function cleanEscapedText(node) {
    // The value is the literal text (the parser already resolved backslash
    // escapes), so a `\*` reaches here as `*`. Strip control bytes so attacker
    // text cannot inject terminal escape sequences (see stripControls).
    return stripControls(node.value);
}
/** Drop C0/C1 control characters (keeping tab and newline) from author content
 *  so attacker ESC / OSC sequences cannot inject into terminal output. */
function stripControls(s) {
    return s.replace(/\p{Cc}/gu, (c) => (c === '\t' || c === '\n' ? c : ''));
}
function isLegacyDefinitionParagraph(node) {
    return (node.children.length === 3 &&
        node.children[0]?.type === 'text' &&
        node.children[0].value.startsWith(': ') &&
        node.children[1]?.type === 'soft-break' &&
        node.children[2]?.type === 'text');
}
function legacyDefinitionParts(node) {
    return [
        (node.children[0].value).slice(2),
        node.children[2].value,
    ];
}
//# sourceMappingURL=render-plain.js.map