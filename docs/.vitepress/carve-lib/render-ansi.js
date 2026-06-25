import { AbbrBudget, utf8ByteLength } from './abbr-budget.js';
const MAX_RENDER_DEPTH = 200;
const TRIM_NON_NBSP_RE = /^[^\S\u00a0]+|[^\S\u00a0]+$/g;
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
    const ctx = {
        listDepth: 0,
        blockQuoteDepth: 0,
        ordered: [],
        blockDepth: 0,
        inlineDepth: 0,
        abbrBudget: new AbbrBudget(ast.srcByteLength),
    };
    const out = renderBlocks(ast.children, ctx);
    const footnotes = renderFootnoteDefs(ast, ctx);
    return normalize(`${out}${footnotes}`);
}
function style(text, codes) {
    return `${codes}${text}${RESET}`;
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
            return renderHeading(node.level, renderInlines(node.children, ctx));
        case 'paragraph': {
            if (isLegacyDefinitionParagraph(node)) {
                const [term, def] = legacyDefinitionParts(node);
                return `${style(stripControls(term), BOLD + FG_YELLOW)}\n  ${stripControls(def)}\n\n`;
            }
            let content = renderInlines(node.children, ctx);
            const prefix = blockQuotePrefix(ctx);
            if (prefix)
                content = prefixLines(content, prefix);
            return `${content}\n\n`;
        }
        case 'code-block':
            return renderCodeBlock(stripControls(node.content), node.lang ? stripControls(node.lang) : node.lang);
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
        case 'admonition': {
            const body = renderBlocks(node.children, ctx);
            const title = node.title !== undefined ? renderInlines(node.title, ctx) : '';
            // Carry the blockquote `│` prefix onto a bold line, matching how the
            // paragraph renderer prefixes body content in a quote. `styled` is
            // already a styled string (title) or raw label text.
            const prefix = blockQuotePrefix(ctx);
            const boldLine = (styled) => prefix ? prefixLines(styled, prefix) : styled;
            // Caption floor: surface an unconsumed grouping [label] as a bold line
            // (title first when both are present).
            const labelLine = node.label
                ? `${boldLine(style(stripControls(node.label), BOLD))}\n\n`
                : '';
            if (title !== '') {
                return `${boldLine(style(title, BOLD))}\n\n${labelLine}${body}`;
            }
            return `${labelLine}${body}`;
        }
        case 'div': {
            if (!node.label)
                return renderBlocks(node.children, ctx);
            // Caption floor: a bold label line, prefixed with the blockquote `│` when
            // inside a quote (matching the admonition label/title and the div body).
            const prefix = blockQuotePrefix(ctx);
            const styled = style(stripControls(node.label), BOLD);
            const labelLine = prefix ? prefixLines(styled, prefix) : styled;
            return `${labelLine}\n\n${renderBlocks(node.children, ctx)}`;
        }
        case 'definition-list':
            return renderDefinitionList(node.items, ctx, true);
        case 'figure':
            return renderFigure(node, ctx);
        case 'image':
            return renderImage(node);
        case 'raw-block':
            return `${style(`[raw:${node.format}] ${stripControls(node.content)}`, DIM)}\n\n`;
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
        return `${indent}${marker} ${trimNonNbsp(renderBlocks(item.children, ctx))}\n`;
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
            out += `  ${trimNonNbsp(renderBlocks(def, ctx))}\n`;
    }
    return trailingBlank ? `${out}\n` : out;
}
function renderTable(node, ctx) {
    // Use the table's true column count (max cells across rows) so a row with
    // rowspan/colspan filler cells still emits every column and stays aligned
    // with the borders (matches the HTML/Markdown renderers and carve-php/rs).
    const cols = node.rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    const rows = node.rows.map((row) => {
        const isHeader = row.cells.length > 0 && row.cells.every((c) => c.header);
        return Array.from({ length: cols }, (_, i) => {
            const cell = row.cells[i];
            const content = cell ? trimNonNbsp(renderInlines(cell.children, ctx)) : '';
            return { content, plain: stripAnsi(content), isHeader };
        });
    });
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
    // Drop trailing empty cells so a short/rowspan header row is ragged
    // (`│ A │`, not `│ A │   │`); widths/borders stay full-width. Matches
    // carve-php / carve-rs.
    const lastFilled = cells.reduce((last, cell, i) => (cell.plain !== '' ? i : last), -1);
    const visible = cells.slice(0, lastFilled + 1);
    const parts = visible.map((cell, i) => {
        const padding = (widths[i] ?? 0) - width(cell.plain);
        const content = cell.isHeader
            ? style(cell.content + ' '.repeat(padding), BOLD)
            : cell.content + ' '.repeat(padding);
        return ` ${content} `;
    });
    return `${sep}${parts.join(sep)}${sep}\n`;
}
function renderFigure(node, ctx) {
    const target = node.target.type === 'image'
        ? renderImage(node.target)
        : node.target.type === 'table'
            ? trimEndNonNbsp(renderTable(node.target, ctx))
            : trimEndNonNbsp(renderBlock(node.target, ctx));
    const sep = node.target.type === 'blockquote' ? '\n\n' : '\n';
    return `${target}${sep}${renderCaption(node.caption, ctx)}`;
}
function renderCaption(nodes, ctx) {
    return `${style(trimNonNbsp(renderInlines(nodes, ctx)), ITALIC + DIM)}\n\n`;
}
function renderFootnoteDefs(ast, ctx) {
    if (!ast.footnoteDefs)
        return '';
    let out = '';
    for (const [label, blocks] of Object.entries(ast.footnoteDefs)) {
        out += `${style(`[${stripControls(label)}]`, FG_CYAN + DIM)} ${trimNonNbsp(renderBlocks(blocks, ctx))}\n`;
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
            return style(renderInlines(node.children, ctx), ITALIC);
        case 'strong':
            return style(renderInlines(node.children, ctx), BOLD);
        case 'underline':
            return style(renderInlines(node.children, ctx), UNDERLINE);
        case 'strike':
            return style(renderInlines(node.children, ctx), STRIKE);
        case 'sub':
            // Subscript is NOT strikethrough; map to Unicode subscripts (mirrors
            // super), unmapped chars pass through.
            return toSubscript(renderInlines(node.children, ctx));
        case 'super':
            return toSuperscript(renderInlines(node.children, ctx));
        case 'highlight':
            return style(renderInlines(node.children, ctx), '\x1b[7m' + FG_YELLOW);
        case 'bold-italic':
            return style(renderInlines(node.children, ctx), BOLD + ITALIC);
        case 'code':
            return style(stripControls(node.value), FG_BRIGHT_YELLOW);
        case 'link': {
            const text = renderInlines(node.children, ctx);
            const href = stripControls(node.href);
            let out = style(text, UNDERLINE + FG_BLUE);
            if (href && !href.startsWith('#') && href !== stripAnsi(text)) {
                out += style(` (${href})`, DIM);
            }
            return out;
        }
        case 'image':
            return renderImage(node);
        case 'span':
            return renderInlines(node.children, ctx);
        case 'math':
            return style(stripControls(node.content), FG_BRIGHT_MAGENTA);
        case 'raw-inline':
            return '';
        case 'emoji':
            return `:${stripControls(node.name)}:`;
        case 'autolink':
            return style(stripControls(node.href.startsWith('mailto:') ? node.href.slice(7) : node.href), UNDERLINE + FG_BLUE);
        case 'mention':
            return `@${stripControls(node.user)}`;
        case 'tag':
            return `#${stripControls(node.name)}`;
        case 'extension':
            return renderInlines(node.content, ctx);
        case 'abbreviation': {
            // DoS guard: once cumulative expansion bytes exceed the budget, degrade
            // to the plain key text only (no ` (EXPANSION)` suffix).
            if (!ctx.abbrBudget.charge(utf8ByteLength(node.expansion)))
                return stripControls(node.abbr);
            return `${stripControls(node.abbr)}${style(` (${stripControls(node.expansion)})`, DIM)}`;
        }
        case 'footnote':
            return node.inline
                ? `(${renderInlines(node.inline, ctx)})`
                : style(`[${stripControls(node.id ?? '')}]`, FG_CYAN + BOLD);
        case 'soft-break':
            return ' ';
        case 'hard-break':
            return '\n';
        case 'critic-insert':
            return style(renderInlines(node.children, ctx), FG_GREEN + UNDERLINE);
        case 'critic-delete':
            return style(renderInlines(node.children, ctx), STRIKE + '\x1b[31m');
        case 'critic-substitute':
            // Show BOTH sides; dropping oldText loses content.
            return (style(stripControls(node.oldText), STRIKE + '\x1b[31m') +
                style(stripControls(node.newText), FG_GREEN + UNDERLINE));
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
            throw new Error(`renderAnsi: unknown inline ${t.type}`);
        }
    }
}
function renderImage(node) {
    const alt = stripControls(node.alt);
    return `${style('[img:', FG_MAGENTA)}${alt ? ` ${alt}` : ''}${style(']', FG_MAGENTA)}`;
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
    return mapOutsideAnsi(text, map);
}
// Apply a per-character map, but leave ANSI escape sequences (e.g. `\x1b[4m`
// from a styled inline child) untouched — mapping their digits would corrupt
// the control codes and the terminal output.
function mapOutsideAnsi(text, map) {
    return text
        .split(/(\x1b\[[0-9;]*m)/)
        .map((seg, i) => i % 2 === 1 // odd segments are the captured escape sequences
        ? seg
        : Array.from(seg)
            .map((ch) => map[ch] ?? ch)
            .join(''))
        .join('');
}
function toSubscript(text) {
    const map = {
        '0': '₀',
        '1': '₁',
        '2': '₂',
        '3': '₃',
        '4': '₄',
        '5': '₅',
        '6': '₆',
        '7': '₇',
        '8': '₈',
        '9': '₉',
        '+': '₊',
        '-': '₋',
        '=': '₌',
        '(': '₍',
        ')': '₎',
        a: 'ₐ',
        e: 'ₑ',
        o: 'ₒ',
        x: 'ₓ',
    };
    return mapOutsideAnsi(text, map);
}
function normalize(text) {
    // The internal non-breaking-space placeholder (U+E000) collapses to an
    // ordinary space in terminal output. Done after trimming so placeholder-
    // derived leading indentation survives; a literal U+00A0 is left intact.
    return `${trimNonNbsp(text.replace(/\n{3,}/g, '\n\n'))}\n`.replace(/\ue000/g, ' ');
}
function trimNonNbsp(text) {
    return text.replace(TRIM_NON_NBSP_RE, '');
}
function trimEndNonNbsp(text) {
    return text.replace(/[^\S\u00a0]+$/g, '');
}
function cleanEscapedText(node) {
    // The value is the literal text (the parser already resolved backslash
    // escapes), so a `\*` reaches here as `*`. Strip control bytes so attacker
    // text cannot inject terminal escape sequences (see stripControls).
    return stripControls(node.value);
}
/** Drop C0/C1 control characters (keeping tab and newline) from author content
 *  so attacker ESC / OSC sequences cannot inject into ANSI terminal output. The
 *  renderer's own styling escapes are added separately and are not affected. */
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
//# sourceMappingURL=render-ansi.js.map