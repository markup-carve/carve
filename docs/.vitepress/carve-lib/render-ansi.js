const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ITALIC = '\x1b[3m';
const UNDERLINE = '\x1b[4m';
const STRIKE = '\x1b[9m';
const FG_BLUE = '\x1b[34m';
const FG_MAGENTA = '\x1b[35m';
const FG_CYAN = '\x1b[36m';
const FG_YELLOW = '\x1b[33m';
const FG_GREEN = '\x1b[32m';
const FG_BRIGHT_BLACK = '\x1b[90m';
const FG_BRIGHT_YELLOW = '\x1b[93m';
const FG_BRIGHT_MAGENTA = '\x1b[95m';
const FG_BRIGHT_CYAN = '\x1b[96m';
const FG_BRIGHT_BLUE = '\x1b[94m';
const FG_BRIGHT_GREEN = '\x1b[92m';
const FG_BRIGHT_WHITE = '\x1b[97m';
export function renderAnsi(ast, _opts = {}) {
    const ctx = { listDepth: 0, blockQuoteDepth: 0, ordered: [] };
    const out = renderBlocks(ast.children, ctx);
    const footnotes = renderFootnoteDefs(ast, ctx);
    return normalize(`${out}${footnotes}`);
}
function style(text, codes) {
    return `${codes}${text}${RESET}`;
}
function renderBlocks(blocks, ctx) {
    return blocks.map((b) => renderBlock(b, ctx)).join('');
}
function renderBlock(node, ctx) {
    switch (node.type) {
        case 'heading':
            return renderHeading(node.level, renderInlines(node.children, ctx));
        case 'paragraph': {
            if (isLegacyDefinitionParagraph(node)) {
                const [term, def] = legacyDefinitionParts(node);
                return `${style(term, BOLD + FG_YELLOW)}\n  ${def}\n\n`;
            }
            let content = renderInlines(node.children, ctx);
            const prefix = blockQuotePrefix(ctx);
            if (prefix)
                content = prefixLines(content, prefix);
            return `${content}\n\n`;
        }
        case 'code-block':
            return renderCodeBlock(node.content, node.lang);
        case 'blockquote':
            ctx.blockQuoteDepth++;
            {
                const out = renderBlocks(node.children, ctx);
                ctx.blockQuoteDepth--;
                return out;
            }
        case 'list':
            return renderList(node, ctx);
        case 'thematic-break':
            return `${style('─'.repeat(40), DIM)}\n\n`;
        case 'table':
            return renderTable(node, ctx);
        case 'admonition':
        case 'div':
            return renderBlocks(node.children, ctx);
        case 'definition-list':
            return renderDefinitionList(node.items, ctx, true);
        case 'figure':
            return renderFigure(node, ctx);
        case 'image':
            return renderImage(node);
        case 'raw-block':
            return `${style(`[raw:${node.format}] ${node.content}`, DIM)}\n\n`;
        case 'abbreviation-def':
        case 'comment':
            return '';
        default: {
            const t = node;
            throw new Error(`renderAnsi: unknown block ${t.type}`);
        }
    }
}
function renderHeading(level, content) {
    const color = level === 1
        ? FG_BRIGHT_MAGENTA
        : level === 2
            ? FG_BRIGHT_CYAN
            : level === 3
                ? FG_BRIGHT_BLUE
                : level === 4
                    ? FG_BRIGHT_GREEN
                    : level === 5
                        ? FG_BRIGHT_YELLOW
                        : FG_BRIGHT_WHITE;
    let out = style(content, BOLD + color);
    if (level <= 2) {
        const char = level === 1 ? '═' : '─';
        out += `\n${style(char.repeat(width(content)), color)}`;
    }
    return `${out}\n\n`;
}
function renderCodeBlock(content, lang) {
    let out = '';
    if (lang)
        out += `${style(`┌── ${lang} `, DIM)}\n`;
    for (const line of content.replace(/\n$/, '').split('\n')) {
        out += `${style(`  ${line}`, FG_BRIGHT_WHITE)}\n`;
    }
    return `${out}\n`;
}
function blockQuotePrefix(ctx) {
    return ctx.blockQuoteDepth > 0 ? `${style('│', FG_CYAN + DIM)} `.repeat(ctx.blockQuoteDepth) : '';
}
function prefixLines(content, prefix) {
    return content.split('\n').map((line) => `${prefix}${line}`).join('\n');
}
function renderList(node, ctx) {
    ctx.listDepth++;
    if (node.ordered)
        ctx.ordered[ctx.listDepth] = node.start ?? 1;
    const out = node.items
        .map((item) => {
        const indent = '  '.repeat(ctx.listDepth - 1);
        let marker;
        if (node.ordered) {
            const n = ctx.ordered[ctx.listDepth] ?? 1;
            ctx.ordered[ctx.listDepth] = n + 1;
            marker = style(`${n}.`, FG_YELLOW);
        }
        else if (item.checked !== undefined) {
            marker = item.checked ? style('☑', FG_GREEN) : style('☐', FG_BRIGHT_BLACK);
        }
        else {
            marker = style('•', FG_CYAN);
        }
        return `${indent}${marker} ${renderBlocks(item.children, ctx).trim()}\n`;
    })
        .join('');
    ctx.listDepth--;
    return ctx.listDepth === 0 ? `${out}\n` : out;
}
function renderDefinitionList(items, ctx, trailingBlank) {
    let out = '';
    for (const item of items) {
        for (const term of item.terms)
            out += `${style(renderInlines(term, ctx), BOLD + FG_YELLOW)}\n`;
        for (const def of item.definitions)
            out += `  ${renderBlocks(def, ctx).trim()}\n`;
    }
    return trailingBlank ? `${out}\n` : out;
}
function renderTable(node, ctx) {
    const rows = node.rows.map((row) => row.cells.map((cell) => {
        const content = renderInlines(cell.children, ctx).trim();
        return { content, plain: stripAnsi(content), isHeader: row.cells.every((c) => c.header) };
    }));
    const widths = [];
    for (const row of rows) {
        row.forEach((cell, i) => {
            widths[i] = Math.max(widths[i] ?? 0, width(cell.plain));
        });
    }
    let out = '';
    let headerRendered = false;
    if (rows.length)
        out += tableBorder(widths, 'top');
    for (const row of rows) {
        out += tableRow(row, widths);
        if (row[0]?.isHeader && !headerRendered) {
            out += tableBorder(widths, 'middle');
            headerRendered = true;
        }
    }
    if (rows.length)
        out += tableBorder(widths, 'bottom');
    if (node.caption)
        out += renderCaption(node.caption, ctx);
    return `${out}\n`;
}
function tableBorder(widths, pos) {
    const left = pos === 'top' ? '┌' : pos === 'middle' ? '├' : '└';
    const right = pos === 'top' ? '┐' : pos === 'middle' ? '┤' : '┘';
    const cross = pos === 'top' ? '┬' : pos === 'middle' ? '┼' : '┴';
    return `${style(left + widths.map((w) => '─'.repeat(w + 2)).join(cross) + right, DIM)}\n`;
}
function tableRow(cells, widths) {
    const sep = style('│', DIM);
    const parts = cells.map((cell, i) => {
        const padding = (widths[i] ?? 0) - width(cell.plain);
        const content = cell.isHeader
            ? style(cell.plain + ' '.repeat(padding), BOLD)
            : cell.content + ' '.repeat(padding);
        return ` ${content} `;
    });
    return `${sep}${parts.join(sep)}${sep}\n`;
}
function renderFigure(node, ctx) {
    const target = node.target.type === 'image'
        ? renderImage(node.target)
        : node.target.type === 'table'
            ? renderTable(node.target, ctx).trimEnd()
            : renderBlock(node.target, ctx).trimEnd();
    return `${target}\n${renderCaption(node.caption, ctx)}`;
}
function renderCaption(nodes, ctx) {
    return `${style(renderInlines(nodes, ctx).trim(), ITALIC + DIM)}\n\n`;
}
function renderFootnoteDefs(ast, ctx) {
    if (!ast.footnoteDefs)
        return '';
    let out = '';
    for (const [label, blocks] of Object.entries(ast.footnoteDefs)) {
        out += `${style(`[${label}]`, FG_CYAN + DIM)} ${renderBlocks(blocks, ctx).trim()}\n`;
    }
    return out;
}
function renderInlines(nodes, ctx) {
    return nodes.map((node) => renderInline(node, ctx)).join('');
}
function renderInline(node, ctx) {
    switch (node.type) {
        case 'text':
            return cleanEscapedText(node);
        case 'italic':
            return style(renderInlines(node.children, ctx), ITALIC);
        case 'strong':
            return style(renderInlines(node.children, ctx), BOLD);
        case 'underline':
            return style(renderInlines(node.children, ctx), UNDERLINE);
        case 'strike':
        case 'sub':
            return style(renderInlines(node.children, ctx), STRIKE);
        case 'super':
            return toSuperscript(renderInlines(node.children, ctx));
        case 'highlight':
            return style(renderInlines(node.children, ctx), '\x1b[7m' + FG_YELLOW);
        case 'bold-italic':
            return style(renderInlines(node.children, ctx), BOLD + ITALIC);
        case 'code':
            return style(node.value, FG_BRIGHT_YELLOW);
        case 'link': {
            const text = renderInlines(node.children, ctx);
            let out = style(text, UNDERLINE + FG_BLUE);
            if (node.href && !node.href.startsWith('#') && node.href !== stripAnsi(text)) {
                out += style(` (${node.href})`, DIM);
            }
            return out;
        }
        case 'image':
            return renderImage(node);
        case 'span':
            return renderInlines(node.children, ctx);
        case 'math':
            return style(node.content, FG_BRIGHT_MAGENTA);
        case 'raw-inline':
            return '';
        case 'emoji':
            return `:${node.name}:`;
        case 'autolink':
            return style(node.href.startsWith('mailto:') ? node.href.slice(7) : node.href, UNDERLINE + FG_BLUE);
        case 'mention':
            return `@${node.user}`;
        case 'tag':
            return `#${node.name}`;
        case 'extension':
            return renderInlines(node.content, ctx);
        case 'abbreviation':
            return `${node.abbr}${style(` (${node.expansion})`, DIM)}`;
        case 'footnote':
            return node.inline
                ? `(${renderInlines(node.inline, ctx)})`
                : style(`[${node.id ?? ''}]`, FG_CYAN + BOLD);
        case 'soft-break':
            return ' ';
        case 'hard-break':
            return '\n';
        case 'critic-insert':
            return style(renderInlines(node.children, ctx), FG_GREEN + UNDERLINE);
        case 'critic-delete':
            return style(renderInlines(node.children, ctx), STRIKE + '\x1b[31m');
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
            throw new Error(`renderAnsi: unknown inline ${t.type}`);
        }
    }
}
function renderImage(node) {
    return `${style('[img:', FG_MAGENTA)}${node.alt ? ` ${node.alt}` : ''}${style(']', FG_MAGENTA)}`;
}
function stripAnsi(text) {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}
function width(text) {
    return Array.from(stripAnsi(text)).length;
}
function toSuperscript(text) {
    const map = {
        '0': '⁰',
        '1': '¹',
        '2': '²',
        '3': '³',
        '4': '⁴',
        '5': '⁵',
        '6': '⁶',
        '7': '⁷',
        '8': '⁸',
        '9': '⁹',
        '+': '⁺',
        '-': '⁻',
        '=': '⁼',
        '(': '⁽',
        ')': '⁾',
        n: 'ⁿ',
        i: 'ⁱ',
    };
    return Array.from(text).map((ch) => map[ch] ?? ch).join('');
}
function normalize(text) {
    return `${text.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
function cleanEscapedText(node) {
    const span = node.pos?.startOffset !== undefined && node.pos.endOffset !== undefined
        ? node.pos.endOffset - node.pos.startOffset
        : undefined;
    return (span !== undefined && span > node.value.length
        ? node.value.replace(/[*#_]/g, '')
        : node.value).replace(/\u00a0/g, ' ');
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
//# sourceMappingURL=render-ansi.js.map