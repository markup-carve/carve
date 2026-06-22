const MAX_RENDER_DEPTH = 200;
export function renderMarkdown(ast, _opts = {}) {
    const headingIds = new Set();
    const referencedHeadingIds = new Set();
    walkBlocks(ast.children, (node) => {
        if (node.type === 'heading' && node.attrs?.id)
            headingIds.add(node.attrs.id);
    });
    walkBlocks(ast.children, (_node, inlines) => {
        if (!inlines)
            return;
        walkInlines(inlines, (node) => {
            if (node.type !== 'link')
                return;
            const id = fragmentId(node.href);
            if (id && headingIds.has(id))
                referencedHeadingIds.add(id);
        });
    });
    const ctx = { headingIds, referencedHeadingIds, listDepth: 0, blockDepth: 0, inlineDepth: 0 };
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
        case 'heading': {
            const text = renderInlines(node.children, ctx).replace(/\s*\n\s*/g, ' ').trim();
            const id = node.attrs?.id;
            const suffix = id && ctx.referencedHeadingIds.has(id) ? ` {#${id}}` : '';
            return `${'#'.repeat(node.level)} ${text}${suffix}\n\n`;
        }
        case 'paragraph':
            if (isLegacyDefinitionParagraph(node)) {
                const [term, def] = legacyDefinitionParts(node);
                return `**${escapeText(term)}**\n: ${escapeText(def)}\n\n`;
            }
            return `${renderInlines(node.children, ctx)}\n\n`;
        case 'code-block': {
            const content = stripControls(node.content);
            const fence = safeFence(content, 3);
            const lang = markdownFenceInfo(node.lang);
            return `${fence}${lang}\n${content}\n${fence}\n\n`;
        }
        case 'blockquote': {
            const lines = renderBlocks(node.children, ctx).trim().split('\n');
            return `${lines.map((line) => `> ${line}`).join('\n')}\n\n`;
        }
        case 'list':
            return renderList(node, ctx);
        case 'thematic-break':
            return '---\n\n';
        case 'table':
            return renderTable(node, ctx);
        case 'admonition': {
            // Markdown has no admonition; preserve the title (otherwise lost) as a
            // leading bold line, then the body.
            const body = renderBlocks(node.children, ctx);
            const title = node.title !== undefined ? renderInlines(node.title, ctx) : '';
            if (title !== '') {
                return `**${title}**\n\n${body}`;
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
            return renderImage(node);
        case 'raw-block':
            // Escape, not emit: raw HTML in Markdown would be live again downstream.
            return node.format === 'html' ? `${escapeMdHtml(stripControls(node.content))}\n\n` : '';
        case 'abbreviation-def':
        case 'comment':
            return '';
        default: {
            const t = node;
            throw new Error(`renderMarkdown: unknown block ${t.type}`);
        }
    }
}
function renderList(node, ctx) {
    ctx.listDepth++;
    let out = '';
    let counter = node.start ?? 1;
    for (const item of node.items) {
        const indent = '  '.repeat(ctx.listDepth - 1);
        let prefix;
        if (node.ordered) {
            prefix = `${counter}. `;
            counter++;
        }
        else if (item.checked !== undefined) {
            prefix = `- ${item.checked ? '[x]' : '[ ]'} `;
        }
        else {
            prefix = '- ';
        }
        const content = renderListItem(item, ctx).trim();
        const lines = content.split('\n');
        out += `${indent}${prefix}${lines.shift() ?? ''}\n`;
        const continuation = ' '.repeat(prefix.length);
        for (const line of lines)
            out += `${indent}${continuation}${line}\n`;
    }
    ctx.listDepth--;
    return out + (ctx.listDepth === 0 ? '\n' : '');
}
function renderListItem(item, ctx) {
    return renderBlocks(item.children, ctx);
}
function renderDefinitionList(items, ctx, trailingBlank) {
    let out = '';
    for (const item of items) {
        for (const term of item.terms)
            out += `**${renderInlines(term, ctx)}**\n`;
        for (const def of item.definitions)
            out += `: ${renderBlocks(def, ctx).trim()}\n`;
    }
    return trailingBlank ? `${out}\n` : out;
}
function renderTable(node, ctx) {
    let header;
    const rows = [];
    let columns = 0;
    for (const row of node.rows) {
        const cells = row.cells.map((cell) => renderInlines(cell.children, ctx).trim());
        columns = Math.max(columns, cells.length);
        const rendered = `| ${cells.join(' | ')} |`;
        if (row.cells.every((cell) => cell.header))
            header = rendered;
        else
            rows.push(rendered);
    }
    let out = '';
    if (header !== undefined) {
        out += `${header}\n`;
        out += `| ${Array.from({ length: columns }, () => '---').join(' | ')} |\n`;
    }
    out += `${rows.join('\n')}\n\n`;
    return out;
}
function renderFigure(node, ctx) {
    const target = node.target.type === 'image'
        ? renderImage(node.target)
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
        out += `[^${stripControls(label)}]: ${renderBlocks(blocks, ctx).trim()}\n`;
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
            if (/^<\/#[^>]+>$/.test(node.value))
                return node.value;
            return escapeText(cleanEscapedText(node));
        case 'italic':
            return `*${renderInlines(node.children, ctx)}*`;
        case 'strong':
            return `**${renderInlines(node.children, ctx)}**`;
        case 'underline':
            return `<u>${renderInlines(node.children, ctx)}</u>`;
        case 'strike':
            return `~~${renderInlines(node.children, ctx)}~~`;
        case 'sub':
            // Subscript is NOT strikethrough; mirror super's inline-HTML fallback.
            return `<sub>${renderInlines(node.children, ctx)}</sub>`;
        case 'super':
            return `<sup>${renderInlines(node.children, ctx)}</sup>`;
        case 'highlight':
            return `<mark>${renderInlines(node.children, ctx)}</mark>`;
        case 'bold-italic':
            return `***${renderInlines(node.children, ctx)}***`;
        case 'code':
            return renderCode(stripControls(node.value));
        case 'link':
            return renderLink(node, ctx);
        case 'image':
            return renderImage(node);
        case 'span':
            return renderInlines(node.children, ctx);
        case 'math':
            return node.display
                ? `$$${stripControls(node.content)}$$`
                : `$${stripControls(node.content)}$`;
        case 'raw-inline':
            return node.format === 'html' ? escapeMdHtml(stripControls(node.content)) : '';
        case 'emoji':
            return `:${stripControls(node.name)}:`;
        case 'autolink': {
            const label = stripControls(node.href);
            return `[${label}](${markdownDestination(node.href)})`;
        }
        case 'mention':
            return `@${stripControls(node.user)}`;
        case 'tag':
            return escapeText(`#${stripControls(node.name)}`);
        case 'extension':
            return renderInlines(node.content, ctx);
        case 'abbreviation': {
            // Markdown has no abbreviation syntax; emit an HTML `<abbr>` so the title
            // survives (markdown allows inline HTML), matching carve-php. Dropping it
            // to plain text would lose the expansion.
            const title = stripControls(node.expansion).replace(/[&<>"]/g, (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;');
            const text = stripControls(node.abbr).replace(/[&<>]/g, (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;');
            return `<abbr title="${title}">${text}</abbr>`;
        }
        case 'footnote':
            return node.inline
                ? `^[${renderInlines(node.inline, ctx)}]`
                : `[^${stripControls(node.id ?? '')}]`;
        case 'soft-break':
            return '\n';
        case 'hard-break':
            return '  \n';
        case 'critic-insert':
            return `<ins>${renderInlines(node.children, ctx)}</ins>`;
        case 'critic-delete':
            return `~~${renderInlines(node.children, ctx)}~~`;
        case 'critic-substitute':
            // Emit BOTH sides like the HTML renderer; dropping oldText loses content.
            return `<del>${escapeText(node.oldText)}</del><ins>${escapeText(node.newText)}</ins>`;
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
            throw new Error(`renderMarkdown: unknown inline ${t.type}`);
        }
    }
}
function renderLink(node, ctx) {
    const text = renderInlines(node.children, ctx);
    const id = fragmentId(node.href);
    if (id && !ctx.headingIds.has(id))
        return text;
    const destination = id ? markdownFragmentDestination(id) : markdownDestination(node.href);
    return node.title === undefined
        ? `[${text}](${destination})`
        : `[${text}](${destination} "${escapeMdTitle(node.title)}")`;
}
function renderImage(node) {
    const src = markdownDestination(node.src);
    const alt = escapeMarkdownLabel(node.alt);
    return node.title === undefined
        ? `![${alt}](${src})`
        : `![${alt}](${src} "${escapeMdTitle(node.title)}")`;
}
function markdownFenceInfo(lang) {
    if (lang === undefined)
        return '';
    // Keep only the first whitespace-delimited token (the language word); drop it
    // if it still contains a backtick (would break the fence).
    const token = stripControls(lang).split(/\s/)[0] ?? '';
    return token.includes('`') ? '' : token;
}
function escapeMarkdownLabel(text) {
    return stripControls(text).replace(/[\\[\]]/g, '\\$&');
}
function escapeMdTitle(title) {
    return stripControls(title).replace(/[\\"]/g, '\\$&');
}
function safeFence(content, min) {
    let longest = 0;
    for (const match of content.matchAll(/`+/g))
        longest = Math.max(longest, match[0].length);
    return '`'.repeat(Math.max(min, longest + 1));
}
function renderCode(content) {
    const fence = safeFence(content, 1);
    return content.startsWith('`') || content.endsWith('`')
        ? `${fence} ${content} ${fence}`
        : `${fence}${content}${fence}`;
}
function markdownFragmentDestination(id) {
    if (!/[\s()<>]/.test(id))
        return `#${id}`;
    return `<#${id.replace(/[\\<>]/g, (ch) => `\\${ch}`)}>`;
}
function markdownDestination(url) {
    return stripControls(sanitizeMdUrl(url).replace(/[ ()<>]/g, (ch) => {
        switch (ch) {
            case ' ':
                return '%20';
            case '(':
                return '%28';
            case ')':
                return '%29';
            case '<':
                return '%3C';
            case '>':
                return '%3E';
            default:
                return ch;
        }
    }));
}
function fragmentId(href) {
    return href.startsWith('#') ? href.slice(1) : undefined;
}
function escapeText(text) {
    text = stripControls(text);
    // Neutralize embedded HTML (<>&) so Markdown re-rendered to HTML cannot
    // execute it: carve's "HTML is text" guarantee holds for the Markdown target
    // too. `&` first so the entities are not re-escaped.
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Escape Markdown metacharacters (none overlap with the HTML chars above).
    return text.replace(/[\\`*_[\]#]/g, '\\$&');
}
/** Dangerous URL schemes blanked on Markdown link/image destinations, mirroring
 *  the HTML renderer so a `javascript:` URL does not survive into Markdown (and
 *  from there a downstream Markdown -> HTML render). */
const MD_DANGEROUS_SCHEMES = new Set(['javascript', 'vbscript', 'data', 'file']);
function sanitizeMdUrl(url) {
    const probe = url.replace(/[\u0000-\u0020]/g, '');
    const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe);
    if (m && MD_DANGEROUS_SCHEMES.has(m[1].toLowerCase()))
        return '';
    return url;
}
/** Drop C0/C1 control characters (keeping tab and newline) from author content. */
function stripControls(s) {
    return s.replace(/\p{Cc}/gu, (c) => (c === '\t' || c === '\n' ? c : ''));
}
/** Escape `<>&` so embedded raw HTML cannot become live markup downstream. */
function escapeMdHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function cleanEscapedText(node) {
    // The value is the literal text (the parser already resolved backslash
    // escapes), so a `\*` reaches here as `*`. Return it verbatim -- dropping the
    // character would lose data. Markdown re-escapes specials via escapeText;
    // plain/ansi need no escaping.
    return node.value;
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
function normalize(text) {
    // The internal non-breaking-space placeholder (U+E000) becomes a literal
    // non-breaking space (U+00A0). Markdown is a re-parseable round-trip format,
    // so unlike the display renderers it keeps the real nbsp: it survives a
    // re-render as `&nbsp;` and is never mistaken for an indented code-block
    // prefix the way ordinary leading spaces would be. Done after trimming so
    // placeholder-derived leading indentation survives.
    return `${text.replace(/\n{3,}/g, '\n\n').trim()}\n`.replace(/\ue000/g, '\u00a0');
}
function walkBlocks(blocks, visit) {
    for (const block of blocks) {
        visit(block);
        switch (block.type) {
            case 'heading':
            case 'paragraph':
                visit(block, block.children);
                break;
            case 'blockquote':
            case 'admonition':
            case 'div':
                walkBlocks(block.children, visit);
                break;
            case 'list':
                for (const item of block.items)
                    walkBlocks(item.children, visit);
                break;
            case 'definition-list':
                for (const item of block.items) {
                    for (const term of item.terms)
                        visit(block, term);
                    for (const def of item.definitions)
                        walkBlocks(def, visit);
                }
                break;
            case 'table':
                if (block.caption)
                    visit(block, block.caption);
                for (const row of block.rows)
                    for (const cell of row.cells)
                        visit(block, cell.children);
                break;
            case 'figure':
                visit(block, block.caption);
                if (block.target.type === 'blockquote')
                    walkBlocks(block.target.children, visit);
                else if (block.target.type === 'table')
                    walkBlocks([block.target], visit);
                break;
            default:
                break;
        }
    }
}
function walkInlines(nodes, visit) {
    for (const node of nodes) {
        visit(node);
        switch (node.type) {
            case 'italic':
            case 'strong':
            case 'underline':
            case 'strike':
            case 'super':
            case 'sub':
            case 'highlight':
            case 'bold-italic':
            case 'link':
            case 'span':
            case 'critic-insert':
            case 'critic-delete':
                walkInlines(node.children, visit);
                break;
            case 'extension':
                walkInlines(node.content, visit);
                break;
            case 'footnote':
                if (node.inline)
                    walkInlines(node.inline, visit);
                break;
            default:
                break;
        }
    }
}
//# sourceMappingURL=render-markdown.js.map