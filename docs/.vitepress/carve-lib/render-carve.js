const MAX_RENDER_DEPTH = 200;
const TRIM_NON_NBSP_RE = /^[^\S\u00a0]+|[^\S\u00a0]+$/g;
export function renderCarve(ast, _opts = {}) {
    const ctx = { blockDepth: 0, inlineDepth: 0, listDepth: 0 };
    const parts = [];
    if (ast.frontmatter)
        parts.push(renderFrontmatter(ast.frontmatter));
    const body = renderBlocks(ast.children, ctx);
    if (body)
        parts.push(body);
    const footnotes = renderFootnoteDefs(ast, ctx);
    if (footnotes)
        parts.push(footnotes);
    return normalize(parts.join('\n\n'));
}
function renderBlocks(blocks, ctx) {
    if (ctx.blockDepth >= MAX_RENDER_DEPTH)
        return '';
    ctx.blockDepth++;
    try {
        return blocks
            .map((b) => renderBlock(b, ctx))
            .filter((s) => s.length > 0)
            .join('\n\n');
    }
    finally {
        ctx.blockDepth--;
    }
}
function renderBlock(node, ctx) {
    const attrs = renderBlockAttrs(node.attrs);
    const withAttrs = (body) => (attrs ? `${attrs}\n${body}` : body);
    switch (node.type) {
        case 'heading': {
            const text = trimNonNbsp(renderInlines(node.children, ctx));
            return withAttrs(`${'#'.repeat(node.level)} ${text}`);
        }
        case 'paragraph':
            return withAttrs(renderInlines(node.children, ctx));
        case 'code-block': {
            const fence = safeFence(node.content, 3);
            const info = codeFenceInfo(node.lang, node.header, node.label);
            return withAttrs(`${fence}${info}\n${node.content}\n${fence}`);
        }
        case 'blockquote': {
            const inner = renderBlocks(node.children, ctx);
            const body = inner
                .split('\n')
                .map((line) => (line === '' ? '>' : `> ${line}`))
                .join('\n');
            return withAttrs(body);
        }
        case 'list':
            return withAttrs(renderList(node, ctx));
        case 'thematic-break':
            return withAttrs('---');
        case 'table':
            return withAttrs(renderTable(node, ctx));
        case 'admonition': {
            const title = node.title !== undefined ? ` "${escapeQuoted(renderInlines(node.title, ctx))}"` : '';
            const label = node.label !== undefined ? ` [${escapeBracketText(node.label)}]` : '';
            const body = renderBlocks(node.children, ctx);
            const fence = colonFenceFor(node.children);
            return withAttrs(`${fence} ${node.kind}${title}${label}\n${body}\n${fence}`);
        }
        case 'div': {
            // Always render divs generically (`::: {.class}`), never the `::: |` /
            // `::: \` line-block sugar: that sugar forces hard breaks, but a plain div
            // carrying a `.line-block` / `.hardbreaks` class keeps soft breaks. The
            // two are indistinguishable by attrs - only the child break nodes differ -
            // so we let those break nodes serialize themselves, which round-trips both.
            const label = node.label !== undefined ? ` [${escapeBracketText(node.label)}]` : '';
            const body = renderBlocks(node.children, ctx);
            const fence = colonFenceFor(node.children);
            return withAttrs(`${fence}${label}\n${body}\n${fence}`);
        }
        case 'definition-list':
            return withAttrs(renderDefinitionList(node.items, ctx));
        case 'figure':
            return withAttrs(renderFigure(node, ctx));
        case 'image':
            return renderImage(node);
        case 'raw-block': {
            const fence = safeFence(node.content, 3);
            return withAttrs(`${fence}=${escapeFormat(node.format)}\n${node.content}\n${fence}`);
        }
        case 'abbreviation-def':
            return `*[${escapeAbbr(node.abbr)}]: ${escapePlainLine(node.expansion)}`;
        case 'comment':
            return node.block ? renderBlockComment(node.content) : `%% ${node.content}`;
        default: {
            const t = node;
            throw new Error(`renderCarve: unknown block ${t.type}`);
        }
    }
}
function renderList(node, ctx) {
    ctx.listDepth++;
    try {
        let out = '';
        let counter = node.start ?? 1;
        node.items.forEach((item, idx) => {
            const indent = '  '.repeat(ctx.listDepth - 1);
            let prefix;
            if (node.ordered) {
                prefix = `${orderedMarker(counter, node.olType)}. `;
                counter++;
            }
            else if (item.checked !== undefined) {
                prefix = `- ${item.checked ? '[x]' : '[ ]'} `;
            }
            else {
                prefix = '- ';
            }
            const itemAttrs = renderAttrs(item.attrs);
            if (itemAttrs) {
                prefix = node.ordered
                    ? `${prefix.trimEnd()}${itemAttrs} `
                    : `-${itemAttrs}${item.checked !== undefined ? ` [${item.checked ? 'x' : ' '}] ` : ' '}`;
            }
            let content = trimNonNbsp(renderListItem(item, ctx));
            if (item.children.length === 1 && item.children[0]?.type === 'list') {
                content = content.replace(/^  /gm, '');
            }
            const lines = content ? content.split('\n') : [''];
            const first = lines.shift() ?? '';
            out += `${indent}${prefix}${first || '+'}\n`;
            const continuation = ' '.repeat(prefix.length);
            for (const line of lines)
                out += `${indent}${continuation}${line}\n`;
            if (!node.tight && idx < node.items.length - 1)
                out += '\n';
        });
        return trimEndNonNbsp(out);
    }
    finally {
        ctx.listDepth--;
    }
}
function renderListItem(item, ctx) {
    return renderBlocks(item.children, ctx);
}
function orderedMarker(n, type) {
    switch (type) {
        case 'a':
            return alphaMarker(n, false);
        case 'A':
            return alphaMarker(n, true);
        case 'i':
            return romanMarker(n).toLowerCase();
        case 'I':
            return romanMarker(n);
        default:
            return String(n);
    }
}
function alphaMarker(n, upper) {
    const base = String.fromCharCode((n - 1) % 26 + (upper ? 65 : 97));
    return base;
}
function romanMarker(n) {
    const values = [
        [1000, 'M'],
        [900, 'CM'],
        [500, 'D'],
        [400, 'CD'],
        [100, 'C'],
        [90, 'XC'],
        [50, 'L'],
        [40, 'XL'],
        [10, 'X'],
        [9, 'IX'],
        [5, 'V'],
        [4, 'IV'],
        [1, 'I'],
    ];
    let out = '';
    for (const [value, token] of values) {
        while (n >= value) {
            out += token;
            n -= value;
        }
    }
    return out || 'I';
}
function renderDefinitionList(items, ctx) {
    const out = [];
    for (const item of items) {
        for (const term of item.terms)
            out.push(`:: ${renderInlines(term, ctx)}`);
        for (const def of item.definitions) {
            const lines = trimNonNbsp(renderBlocks(def, ctx)).split('\n');
            out.push(`:  ${lines.shift() ?? ''}`);
            for (const line of lines)
                out.push(`   ${line}`);
        }
    }
    return out.join('\n');
}
function colonFenceFor(children) {
    return children.some((child) => child.type === 'admonition' || child.type === 'div') ? '::::' : ':::';
}
function renderTable(node, ctx) {
    const rows = [];
    const columns = node.rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    const gfmHeader = node.rows.length > 0 && node.rows[0].cells.every((cell) => cell.header);
    const headerAligns = node.rows[0]?.cells.map((cell) => cell.align) ?? [];
    node.rows.forEach((row, rowIndex) => {
        const cells = [];
        for (let i = 0; i < columns; i++) {
            const cell = row.cells[i];
            const suppressHeader = gfmHeader && rowIndex === 0;
            const suppressAlign = gfmHeader && rowIndex > 0 && cell?.align === headerAligns[i];
            cells.push(cell ? renderTableCell(cell, ctx, suppressHeader, suppressAlign) : { text: '', tight: false });
        }
        const attrs = renderAttrs(row.attrs);
        rows.push(renderTableRow(cells, attrs));
    });
    if (gfmHeader) {
        const sep = Array.from({ length: columns }, (_, i) => tableSeparator(node.rows[0].cells[i])).join('|');
        rows.splice(1, 0, `|${sep}|`);
    }
    if (node.caption)
        rows.push(`^ ${renderInlines(node.caption, ctx)}`);
    return rows.join('\n');
}
function renderTableRow(cells, attrs) {
    return `|${cells.map((cell) => (cell.tight ? cell.text : ` ${cell.text} `)).join('|')}|${attrs}`;
}
function renderTableCell(cell, ctx, suppressHeader, suppressAlign) {
    const attrs = renderAttrs(cell.attrs);
    if (cell.span === 'rowspan')
        return { text: `${attrs}^`, tight: true };
    if (cell.span === 'colspan')
        return { text: `${attrs}<`, tight: true };
    const prefix = `${attrs}${cell.header && !suppressHeader ? '=' : ''}${suppressAlign ? '' : alignMarker(cell.align)}`;
    return { text: `${prefix}${renderInlines(cell.children, ctx)}`, tight: prefix !== '' };
}
function tableSeparator(cell) {
    switch (cell?.align) {
        case 'left':
            return ':---';
        case 'right':
            return '---:';
        case 'center':
            return ':---:';
        default:
            return '---';
    }
}
function renderFigure(node, ctx) {
    const target = node.target.type === 'image'
        ? renderImage(node.target)
        : node.target.type === 'table'
            ? renderTable(node.target, ctx)
            : renderBlock(node.target, ctx);
    return `${target}\n^ ${renderInlines(node.caption, ctx)}`;
}
function renderFootnoteDefs(ast, ctx) {
    if (!ast.footnoteDefs)
        return '';
    const out = [];
    for (const [label, blocks] of Object.entries(ast.footnoteDefs)) {
        const rawBody = renderBlocks(blocks, ctx);
        const body = trimNonNbsp(blocks.length === 1 ? rawBody.replace(/\n\n/g, '\n') : rawBody);
        const lines = body.split('\n');
        const defLines = [`[^${escapeFootnoteLabel(label)}]: ${lines.shift() ?? ''}`];
        for (const line of lines)
            defLines.push(`   ${line}`);
        out.push(defLines.join('\n'));
    }
    return out.join('\n\n');
}
function renderInlines(nodes, ctx) {
    if (ctx.inlineDepth >= MAX_RENDER_DEPTH)
        return '';
    ctx.inlineDepth++;
    try {
        return nodes
            .map((node, idx) => renderInline(node, ctx, lastBoundary(nodes[idx - 1]), firstBoundary(nodes[idx + 1])))
            .join('');
    }
    finally {
        ctx.inlineDepth--;
    }
}
function renderInline(node, ctx, prevChar = '', nextChar = '') {
    const withAttrs = (body) => `${body}${renderAttrs(node.attrs)}`;
    switch (node.type) {
        case 'text':
            return escapeText(cleanEscapedText(node));
        case 'italic':
            return withAttrs(renderEmphasis('/', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'strong':
            return withAttrs(renderEmphasis('*', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'underline':
            return withAttrs(renderEmphasis('_', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'strike':
            return withAttrs(renderEmphasis('~', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'super':
            return withAttrs(renderEmphasis('^', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'sub':
            return withAttrs(renderEmphasis(',', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'highlight':
            return withAttrs(renderEmphasis('=', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'bold-italic':
            return withAttrs(`/*${renderInlines(node.children, ctx)}*/`);
        case 'code':
            return withAttrs(renderCode(node.value));
        case 'link':
            return renderLink(node, ctx);
        case 'image':
            return renderImage(node);
        case 'span':
            return `[${renderInlines(node.children, ctx)}]${renderAttrs(node.attrs) || '{}'}`;
        case 'math':
            return withAttrs(renderMath(node.display, node.content));
        case 'raw-inline':
            return `${renderCode(node.content)}{=${escapeFormat(node.format)}}`;
        case 'emoji':
            return `:${escapeIdentifier(node.name)}:`;
        case 'autolink':
            // Emit the raw autolink content verbatim (keeps a URI scheme like
            // `mailto:`); fall back to the href for nodes without `text`.
            return withAttrs(`<${escapeAutolinkHref(node.text ?? (node.href.startsWith('mailto:') ? node.href.slice(7) : node.href))}>`);
        case 'mention':
            return `@${escapeName(node.user)}`;
        case 'tag':
            return `#${escapeName(node.name)}`;
        case 'extension':
            return withAttrs(`:${escapeIdentifier(node.name)}[${renderInlines(node.content, ctx)}]`);
        case 'abbreviation':
            return escapeText(node.abbr);
        case 'footnote':
            return withAttrs(node.inline
                ? `^[${renderInlines(node.inline, ctx)}]`
                : `[^${escapeFootnoteLabel(node.id ?? '')}]`);
        case 'soft-break':
            return '\n';
        case 'hard-break':
            return '\\\n';
        case 'critic-insert':
            return `{+${renderInlines(node.children, ctx)}+}`;
        case 'critic-delete':
            return `{-${renderInlines(node.children, ctx)}-}`;
        case 'critic-substitute':
            return `{~${escapeCriticText(node.oldText)}~>${escapeCriticText(node.newText)}~}`;
        case 'critic-comment':
            return `{#${escapeCriticText(node.text)}#}`;
        case 'crossref':
            return `</#${escapeCrossrefTarget(node.target)}>`;
        case 'caption-number':
            return '#';
        case 'citation-group':
            return node.raw;
        case 'comment':
            return ` %% ${node.content}`;
        default: {
            const t = node;
            throw new Error(`renderCarve: unknown inline ${t.type}`);
        }
    }
}
function renderLink(node, ctx) {
    // An unresolved reference link (parse() left `ref` set with an empty href -
    // no matching `[label]: url` def) round-trips via its verbatim source. resolve
    // either matches it to a heading later or renders it literally; emitting the
    // raw reference reproduces that exactly, where `[text]()` would not.
    if (node.ref !== undefined && node.rawRef !== undefined) {
        return node.rawRef;
    }
    const text = renderInlines(node.children, ctx);
    const title = node.title === undefined ? '' : ` "${escapeQuoted(node.title)}"`;
    return `[${text}](${escapeDestination(node.href)}${title})${renderAttrs(node.attrs)}`;
}
function renderImage(node) {
    const title = node.title === undefined ? '' : ` "${escapeQuoted(node.title)}"`;
    return `![${escapeImageAlt(node.alt)}](${escapeDestination(node.src)}${title})${renderAttrs(node.attrs)}`;
}
function renderFrontmatter(frontmatter) {
    const open = frontmatter.format === 'yaml' ? '---' : `---${escapeFormat(frontmatter.format)}`;
    return `${open}\n${frontmatter.content}\n---`;
}
function renderBlockComment(content) {
    let longest = 0;
    for (const match of content.matchAll(/%+/g))
        longest = Math.max(longest, match[0].length);
    const fence = '%'.repeat(Math.max(3, longest + 1));
    return `${fence}\n${content}\n${fence}`;
}
function renderMath(display, content) {
    const code = renderCode(content);
    return `${display ? '$$' : '$'}${code}`;
}
function renderEmphasis(delim, content, prevChar, nextChar) {
    const needsForced = /[A-Za-z0-9_]/.test(prevChar) ||
        /[A-Za-z0-9_]/.test(nextChar) ||
        content.startsWith(delim) ||
        content.endsWith(delim) ||
        content.startsWith(' ') ||
        content.endsWith(' ') ||
        content === '';
    return needsForced ? `{${delim}${content}${delim}}` : `${delim}${content}${delim}`;
}
function renderCode(content) {
    const fence = safeFence(content, 1);
    return content.startsWith('`') || content.endsWith('`')
        ? `${fence} ${content} ${fence}`
        : `${fence}${content}${fence}`;
}
function codeFenceInfo(lang, header, label) {
    const parts = [];
    if (lang)
        parts.push(escapeFenceToken(lang));
    if (header !== undefined)
        parts.push(`"${escapeQuoted(header)}"`);
    if (label !== undefined)
        parts.push(`[${escapeBracketText(label)}]`);
    return parts.length ? ` ${parts.join(' ')}` : '';
}
function safeFence(content, min) {
    let longest = 0;
    for (const match of content.matchAll(/`+/g))
        longest = Math.max(longest, match[0].length);
    return '`'.repeat(Math.max(min, longest + 1));
}
function renderBlockAttrs(attrs) {
    const rendered = renderAttrs(attrs);
    return rendered;
}
function renderAttrs(attrs) {
    if (!attrs)
        return '';
    const parts = [];
    const kv = attrs.keyValues ?? {};
    const idAsKey = attrs.id !== undefined && !isAttrIdentifier(attrs.id);
    const emitId = () => {
        if (attrs.id === undefined)
            return;
        if (idAsKey)
            parts.push(`id=${quoteAttrValue(attrs.id)}`);
        else
            parts.push(`#${escapeAttrNameValue(attrs.id)}`);
    };
    const emitClasses = () => {
        for (const cls of attrs.classes ?? [])
            parts.push(`.${escapeAttrNameValue(cls)}`);
    };
    const emitKey = (key) => {
        if (kv[key] === undefined)
            return;
        parts.push(`${escapeAttrKey(key)}=${quoteAttrValue(kv[key])}`);
    };
    // Honor the author's source slot order so the reparsed Attrs - and therefore
    // the rendered HTML attribute order - is byte-identical. Fall back to a fixed
    // id / class / key order only for programmatically-built Attrs (no `order`).
    if (attrs.order) {
        const seen = new Set();
        for (const slot of attrs.order) {
            if (slot === '#id')
                emitId();
            else if (slot === '.class')
                emitClasses();
            else if (!seen.has(slot)) {
                emitKey(slot);
                seen.add(slot);
            }
        }
        // Any key-values not represented in `order` (defensive) keep source order.
        for (const key of Object.keys(kv)) {
            if (!seen.has(key))
                emitKey(key);
        }
    }
    else {
        emitId();
        emitClasses();
        for (const key of Object.keys(kv))
            emitKey(key);
    }
    return parts.length ? `{${parts.join(' ')}}` : '';
}
function quoteAttrValue(value) {
    if (/^[^\s"'{}]+$/.test(value))
        return value;
    return `"${value.replace(/[\\"]/g, '\\$&')}"`;
}
function alignMarker(align) {
    switch (align) {
        case 'left':
            return '<';
        case 'right':
            return '>';
        case 'center':
            return '~';
        default:
            return '';
    }
}
function normalize(text) {
    const lines = trimNonNbsp(text.replace(/\ue000/g, '\u00a0')).split('\n');
    return `${trimNonNbsp(lines.map((line) => line.replace(/[^\S\u00a0]+$/g, '')).join('\n').replace(/\n{3,}/g, '\n\n'))}\n`;
}
function trimNonNbsp(text) {
    return text.replace(TRIM_NON_NBSP_RE, '');
}
function trimEndNonNbsp(text) {
    return text.replace(/[^\S\u00a0]+$/g, '');
}
function cleanEscapedText(node) {
    return node.value;
}
function escapeText(text) {
    return text.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '').replace(/[\\`*_{}\[\]()#+\-.!~^/<>@%|=,:;"']/g, '\\$&');
}
function escapePlainLine(text) {
    return text.replace(/\n/g, ' ');
}
function escapeImageAlt(text) {
    return text.replace(/[\\[\]]/g, '\\$&');
}
function escapeDestination(text) {
    const scheme = /^[\u0000-\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]*([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(text)?.[1]?.toLowerCase();
    const sanitizeBlank = scheme !== undefined && ['javascript', 'vbscript', 'data', 'file'].includes(scheme);
    // A backslash is a literal destination character (no destination escapes),
    // so it is emitted verbatim -- escaping it would double on re-parse.
    // Whitespace is percent-encoded (it would otherwise end the destination).
    return text
        .replace(/\s/g, (ch) => (ch === ' ' ? '%20' : `%${ch.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`))
        .replace(/[()]/g, (ch) => (sanitizeBlank ? (ch === '(' ? '%28' : '%29') : ch));
}
function escapeQuoted(text) {
    return text.replace(/[\\"]/g, '\\$&');
}
function escapeBracketText(text) {
    return text.replace(/[\\\]]/g, '\\$&');
}
function escapeFootnoteLabel(text) {
    return text.replace(/[\\\]]/g, '\\$&');
}
function escapeAbbr(text) {
    return text.replace(/[\\\]]/g, '\\$&');
}
function escapeIdentifier(text) {
    return text.replace(/[^\w-]/g, '');
}
function escapeName(text) {
    return text.replace(/[^\w.-]/g, '').replace(/^\.+|\.+$/g, '');
}
function escapeFormat(text) {
    const safe = text.replace(/[^\w-]/g, '');
    return safe || 'text';
}
function escapeFenceToken(text) {
    return text.split(/\s/)[0].replace(/`/g, '');
}
function escapeAttrKey(text) {
    const safe = text.replace(/^[^a-zA-Z_]+|[^\w-]/g, '');
    return safe || 'x';
}
function escapeAttrNameValue(text) {
    return text.replace(/[^\w-]/g, '-');
}
function isAttrIdentifier(text) {
    return /^[A-Za-z_][\w-]*$/.test(text);
}
function escapeAutolinkHref(text) {
    return text.replace(/[\\<>]/g, '\\$&');
}
function escapeCrossrefTarget(text) {
    return text.replace(/[\\>]/g, '\\$&');
}
function escapeCriticText(text) {
    return text.replace(/[\\{}]/g, '\\$&');
}
function firstBoundary(node) {
    if (!node)
        return '';
    switch (node.type) {
        case 'text':
            return node.value[0] ?? '';
        case 'soft-break':
        case 'hard-break':
            return '\n';
        case 'code':
            return node.value[0] ?? '';
        case 'mention':
            return '@';
        case 'tag':
            return '#';
        default:
            return '';
    }
}
function lastBoundary(node) {
    if (!node)
        return '';
    switch (node.type) {
        case 'text':
            return node.value[node.value.length - 1] ?? '';
        case 'soft-break':
        case 'hard-break':
            return '\n';
        case 'code':
            return node.value[node.value.length - 1] ?? '';
        case 'mention':
            return node.user[node.user.length - 1] ?? '';
        case 'tag':
            return node.name[node.name.length - 1] ?? '';
        default:
            return '';
    }
}
//# sourceMappingURL=render-carve.js.map