export function renderPlainText(ast, _opts = {}) {
    const out = renderBlocks(ast.children);
    const footnotes = renderFootnoteDefs(ast);
    return normalize(`${out}${footnotes}`);
}
function renderBlocks(blocks) {
    return blocks.map(renderBlock).join('');
}
function renderBlock(node) {
    switch (node.type) {
        case 'heading':
            return `${renderInlines(node.children)}\n\n`;
        case 'paragraph':
            if (isLegacyDefinitionParagraph(node)) {
                const [term, def] = legacyDefinitionParts(node);
                return `${term}\n  ${def}\n\n`;
            }
            return `${renderInlines(node.children)}\n\n`;
        case 'code-block':
            return `${node.content}\n\n`;
        case 'blockquote':
            return `"${renderBlocks(node.children).trim()}"\n\n`;
        case 'list':
            return renderList(node);
        case 'thematic-break':
            return '---\n\n';
        case 'table':
            return renderTable(node);
        case 'admonition':
        case 'div':
            return renderBlocks(node.children);
        case 'definition-list':
            return renderDefinitionList(node.items, true);
        case 'figure':
            return renderFigure(node);
        case 'image':
            return node.alt;
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
function renderList(node) {
    let out = '';
    let counter = node.start ?? 1;
    for (const item of node.items) {
        out += node.ordered ? `${counter}. ` : '- ';
        counter++;
        out += `${renderBlocks(item.children).trim()}\n`;
    }
    return `${out}\n`;
}
function renderDefinitionList(items, trailingBlank) {
    let out = '';
    for (const item of items) {
        for (const term of item.terms)
            out += `${renderInlines(term)}\n`;
        for (const def of item.definitions)
            out += `  ${renderBlocks(def).trim()}\n`;
    }
    return trailingBlank ? `${out}\n` : out;
}
function renderTable(node) {
    let out = '';
    for (const row of node.rows) {
        out += `${row.cells.map((cell) => renderInlines(cell.children).trim()).join(' | ')}\n`;
    }
    if (node.caption)
        out = `${out.trimEnd()}\n${renderInlines(node.caption)}\n`;
    return `${out}\n`;
}
function renderFigure(node) {
    const target = node.target.type === 'image'
        ? node.target.alt
        : node.target.type === 'table'
            ? renderTable(node.target).trim()
            : renderBlock(node.target).trim();
    // A block-level target (a code-block listing or a display-math equation)
    // keeps the caption on its own line; an inline image target stays adjacent.
    const sep = node.target.type === 'code-block' || node.target.type === 'paragraph' ? '\n' : '';
    return `${target}${sep}${renderInlines(node.caption)}`;
}
function renderFootnoteDefs(ast) {
    if (!ast.footnoteDefs)
        return '';
    let out = '';
    for (const [label, blocks] of Object.entries(ast.footnoteDefs)) {
        out += `[${label}]: ${renderBlocks(blocks).trim()}\n`;
    }
    return out;
}
function renderInlines(nodes) {
    return nodes.map(renderInline).join('');
}
function renderInline(node) {
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
            return renderInlines(node.children);
        case 'critic-delete':
            return `~${renderInlines(node.children)}~`;
        case 'code':
            return node.value;
        case 'link':
            return node.href.startsWith('#') ? renderInlines(node.children) : node.href;
        case 'image':
            return node.alt;
        case 'math':
            return node.content;
        case 'raw-inline':
            return '';
        case 'emoji':
            return `:${node.name}:`;
        case 'autolink':
            return node.href.startsWith('mailto:') ? node.href.slice(7) : node.href;
        case 'mention':
            return `@${node.user}`;
        case 'tag':
            return `#${node.name}`;
        case 'extension':
            return renderInlines(node.content);
        case 'abbreviation':
            return node.abbr;
        case 'footnote':
            return node.inline ? `(${renderInlines(node.inline)})` : `[${node.id ?? ''}]`;
        case 'soft-break':
            return ' ';
        case 'hard-break':
            return '\n';
        case 'critic-substitute':
            return node.newText;
        case 'critic-comment':
            return '';
        case 'crossref':
            return `</#${node.target}>`;
        case 'caption-number':
            return node.n === undefined ? '#' : String(node.n);
        case 'comment':
            return '';
        default: {
            const t = node;
            throw new Error(`renderPlainText: unknown inline ${t.type}`);
        }
    }
}
function normalize(text) {
    return `${text.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
function cleanEscapedText(node) {
    const span = node.pos?.startOffset !== undefined && node.pos.endOffset !== undefined
        ? node.pos.endOffset - node.pos.startOffset
        : undefined;
    return span !== undefined && span > node.value.length
        ? node.value.replace(/[*#_]/g, '')
        : node.value;
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