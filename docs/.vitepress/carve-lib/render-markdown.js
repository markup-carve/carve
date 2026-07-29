import { SMART_PUNCTUATION_GLYPHS } from './ast.js';
import { AbbrBudget, utf8ByteLength } from './abbr-budget.js';
const MAX_RENDER_DEPTH = 200;
const TRIM_NON_NBSP_RE = /^[^\S\u00a0]+|[^\S\u00a0]+$/g;
export function renderMarkdown(ast, opts = {}) {
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
    const ctx = {
        headingIds,
        referencedHeadingIds,
        listDepth: 0,
        blockDepth: 0,
        inlineDepth: 0,
        abbrBudget: new AbbrBudget(ast.srcByteLength),
        smartTypography: opts.smartTypography ?? 'glyph',
    };
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
            const text = trimNonNbsp(renderInlines(node.children, ctx).replace(/[^\S\u00a0]*\n[^\S\u00a0]*/g, ' '));
            const id = node.attrs?.id;
            const suffix = id && ctx.referencedHeadingIds.has(id) ? ` {#${id}}` : '';
            return `${'#'.repeat(node.level)} ${text}${suffix}\n\n`;
        }
        case 'paragraph':
            return `${renderInlines(node.children, ctx)}\n\n`;
        case 'code_block': {
            const content = stripControls(node.content);
            const fence = safeFence(content, 3);
            const info = markdownFenceInfo(node.lang, node.header, node.label);
            return `${fence}${info}\n${content}\n${fence}\n\n`;
        }
        case 'block_quote': {
            const lines = trimNonNbsp(renderBlocks(node.children, ctx)).split('\n');
            return `${lines.map((line) => `> ${line}`).join('\n')}\n\n`;
        }
        case 'list':
            return renderList(node, ctx);
        case 'thematic_break':
            return '---\n\n';
        case 'table':
            return renderTable(node, ctx);
        case 'admonition': {
            // Markdown has no admonition; preserve the title (otherwise lost) as a
            // leading bold line, then an unconsumed grouping [label] (also bold, the
            // caption floor; title first when both are present), then the body.
            const body = renderBlocks(node.children, ctx);
            const title = node.title !== undefined ? renderInlines(unwrapStrong(node.title), ctx) : '';
            // Escape the label the same way text is escaped (HTML + Markdown
            // metacharacters), not just strip controls: a label like `[<img …>]`
            // must not emit live HTML when the Markdown is re-rendered.
            const labelLine = node.label ? `**${escapeText(node.label)}**\n\n` : '';
            if (title !== '') {
                return `**${title}**\n\n${labelLine}${body}`;
            }
            return `${labelLine}${body}`;
        }
        case 'div':
            return node.label
                ? `**${escapeText(node.label)}**\n\n${renderBlocks(node.children, ctx)}`
                : renderBlocks(node.children, ctx);
        case 'line_block':
            return renderBlocks(node.children, ctx);
        case 'definition_list':
            return renderDefinitionList(node.items, ctx, true);
        case 'figure':
            return renderFigure(node, ctx);
        case 'image':
            // Block-level (standalone) image: emit the trailing block separator so a
            // following block is not glued to it, matching carve-php / carve-rs.
            return `${renderImage(node)}\n\n`;
        case 'raw_block':
            // Escape, not emit: raw HTML in Markdown would be live again downstream.
            return node.format === 'html' ? `${escapeMdHtml(stripControls(node.content))}\n\n` : '';
        case 'abbreviation_def':
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
    // The authored bullet, not a normalized one. A change of bullet is what
    // SEPARATES two adjacent lists in CommonMark, so emitting `-` for a `*` list
    // merges lists the source kept apart - the same section 11 rule the AST
    // records `bulletChar` for and `renderCarve` already honors (carve#352).
    const bullet = node.bulletChar ?? '-';
    for (const item of node.items) {
        const indent = '  '.repeat(ctx.listDepth - 1);
        let prefix;
        if (node.ordered) {
            prefix = `${counter}. `;
            counter++;
        }
        else if (item.checked !== undefined) {
            prefix = `${bullet} ${item.checked ? '[x]' : '[ ]'} `;
        }
        else {
            prefix = `${bullet} `;
        }
        const content = trimNonNbsp(renderListItem(item, ctx));
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
            out += `: ${trimNonNbsp(renderBlocks(def, ctx))}\n`;
    }
    return trailingBlank ? `${out}\n` : out;
}
function renderTable(node, ctx) {
    let header;
    const rows = [];
    let columns = 0;
    // Per-column alignment, taken from the first non-header row (matching
    // carve-php), so the Markdown separator preserves `:---` / `:---:` / `---:`
    // instead of dropping alignment.
    const aligns = [];
    for (const row of node.rows) {
        const cells = row.cells.map((cell) => trimNonNbsp(renderInlines(cell.children, ctx)));
        columns = Math.max(columns, cells.length);
        const rendered = `| ${cells.join(' | ')} |`;
        if (row.cells.every((cell) => cell.header))
            header = rendered;
        else {
            rows.push(rendered);
            row.cells.forEach((cell, i) => {
                if (aligns[i] === undefined)
                    aligns[i] = cell.align;
            });
        }
    }
    const separator = (i) => {
        switch (aligns[i]) {
            case 'left':
                return ':---';
            case 'center':
                return ':---:';
            case 'right':
                return '---:';
            default:
                return '---';
        }
    };
    let out = '';
    if (header !== undefined) {
        out += `${header}\n`;
        out += `| ${Array.from({ length: columns }, (_, i) => separator(i)).join(' | ')} |\n`;
    }
    out += `${rows.join('\n')}\n\n`;
    return out;
}
function renderFigure(node, ctx) {
    const target = node.target.type === 'image'
        ? renderImage(node.target)
        : node.target.type === 'table'
            ? trimNonNbsp(renderTable(node.target, ctx))
            : trimNonNbsp(renderBlock(node.target, ctx));
    // The caption sits on its own line directly under the figure (`\n`) - an
    // image target used to glue it on (`![a](/u)cap`). A blockquote target keeps
    // the blank-line separation; a table drops the caption entirely.
    const sep = node.target.type === 'block_quote' ? '\n\n' : node.target.type === 'table' ? '' : '\n';
    // End with the block separator so a following block is not glued to the
    // caption (matching every other block renderer and carve-php).
    return `${target}${sep}${renderInlines(node.caption, ctx)}\n\n`;
}
function renderFootnoteDefs(ast, ctx) {
    if (!ast.footnoteDefs)
        return '';
    let out = '';
    for (const [label, blocks] of Object.entries(ast.footnoteDefs)) {
        out += `[^${stripControls(label)}]: ${trimNonNbsp(renderBlocks(blocks, ctx))}\n`;
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
        case 'escaped_text':
            // Reproduce the author's escape. `\-\-` was written precisely so a
            // downstream processor with smart punctuation on would not read an en
            // dash; emitting the character bare loses exactly that (carve#350).
            // The underscore still goes through the sentinel, so the intraword rule
            // can drop the backslash where CommonMark ignores it anyway.
            return node.value === '_' ? UNDERSCORE_ESCAPE : '\\' + node.value;
        case 'emphasis':
            return `*${renderInlines(node.children, ctx)}*`;
        case 'strong':
            return `**${renderInlines(node.children, ctx)}**`;
        case 'underline':
            return `<u>${renderInlines(node.children, ctx)}</u>`;
        case 'strike':
            return `~~${renderInlines(node.children, ctx)}~~`;
        case 'subscript':
            // Subscript is NOT strikethrough; mirror super's inline-HTML fallback.
            return `<sub>${renderInlines(node.children, ctx)}</sub>`;
        case 'superscript':
            return `<sup>${renderInlines(node.children, ctx)}</sup>`;
        case 'highlight':
            return `<mark>${renderInlines(node.children, ctx)}</mark>`;
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
        case 'raw_inline':
            return node.format === 'html' ? escapeMdHtml(stripControls(node.content)) : '';
        case 'literal_inline':
            // §27: emitted by EVERY renderer, never dropped. It is prose, not code,
            // so no code fence -- the content becomes literal text, with Markdown
            // metacharacters escaped so `*not bold*` stays visible as authored.
            return escapeText(node.content);
        case 'symbol':
            return `:${stripControls(node.name)}:`;
        case 'autolink': {
            // Visible text is the raw autolink content (an email autolink shows the
            // address, not the `mailto:` href); fall back to href for older nodes.
            const label = stripControls(node.text ?? node.href);
            return `[${label}](${markdownDestination(node.href)})`;
        }
        case 'mention':
            return `@${stripControls(node.user)}`;
        case 'tag':
            return escapeText(`#${stripControls(node.name)}`);
        case 'inline_extension':
            return renderInlines(node.content, ctx);
        case 'abbreviation': {
            // Markdown has no abbreviation syntax; emit an HTML `<abbr>` so the title
            // survives (markdown allows inline HTML), matching carve-php. Dropping it
            // to plain text would lose the expansion.
            const text = stripControls(node.abbr).replace(/[&<>]/g, (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;');
            // DoS guard: once cumulative expansion bytes exceed the budget, degrade
            // to the plain key text only (no <abbr>, no title).
            if (!ctx.abbrBudget.charge(utf8ByteLength(node.expansion)))
                return text;
            const title = stripControls(node.expansion).replace(/[&<>"]/g, (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;');
            return `<abbr title="${title}">${text}</abbr>`;
        }
        case 'footnote':
            return node.inline
                ? `^[${renderInlines(node.inline, ctx)}]`
                : `[^${stripControls(node.id ?? '')}]`;
        case 'soft_break':
            return '\n';
        case 'hard_break':
            return '  \n';
        case 'insert':
            return `<ins>${renderInlines(node.children, ctx)}</ins>`;
        case 'delete':
            return `<del>${renderInlines(node.children, ctx)}</del>`;
        case 'substitution':
            // Emit BOTH sides like the HTML renderer; dropping oldText loses content.
            return `<del>${escapeText(node.oldText)}</del><ins>${escapeText(node.newText)}</ins>`;
        case 'critic-comment':
            return '';
        case 'heading_ref':
            return `</#${stripControls(node.target)}>`;
        case 'caption_number':
            return node.n === undefined ? '#' : String(node.n);
        case 'citation_group':
            // Tier-2 ext node; the core renderer has no numbering, so emit the source.
            return stripControls(node.raw);
        case 'comment':
            return '';
        case 'smart_punctuation':
            // Source mode reproduces what the author typed; the glyph is a
            // presentation choice a machine consumer cannot reverse.
            return ctx.smartTypography === 'source'
                ? node.value
                : (node.glyph ?? SMART_PUNCTUATION_GLYPHS[node.kind] ?? node.value);
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
function markdownFenceInfo(lang, header, label) {
    // Keep only the first whitespace-delimited token (the language word); drop it
    // if it still contains a backtick (would break the fence).
    const rawToken = lang === undefined ? '' : (stripControls(lang).split(/\s/)[0] ?? '');
    const token = rawToken.includes('`') ? '' : rawToken;
    // A grouping `[label]` rides along after the language and title. Dropping it
    // was silent data loss: an info string is free-form after the first word, so
    // every consumer ignores what it does not understand, and carve-php was
    // already emitting it (carve#352).
    const grouping = label === undefined || label === '' ? '' : ` [${stripControls(label).replace(/[[\]`]/g, '')}]`;
    if (header === undefined)
        return `${token}${grouping}`;
    return `${token} "${escapeMdTitle(header)}"${grouping}`;
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
    // The underscore escape is emitted as a sentinel rather than a backslash:
    // whether it survives depends on its neighbours in the assembled document,
    // which only normalize() can see. See UNDERSCORE_ESCAPE.
    return text.replace(/[\\`*_[\]#]/g, (ch) => (ch === '_' ? UNDERSCORE_ESCAPE : `\\${ch}`));
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
/**
 * Drop C0/C1 control characters (keeping tab and newline) from author content,
 * and the underscore-escape sentinel with them: author content that carried it
 * would otherwise reach normalize() and be read as an escape this renderer
 * emitted. Every path to the output passes through here.
 */
function stripControls(s) {
    return s.replace(/\p{Cc}|\ue004/gu, (c) => (c === '\t' || c === '\n' ? c : ''));
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
/**
 * Sentinel standing in for an underscore escape this renderer emitted, so the
 * final pass can tell those apart from a backslash the author wrote. U+E000 is
 * the NBSP sentinel and render-carve claims U+E001..U+E003; this extends the
 * scheme. Author content never carries it: stripControls() drops it on the way
 * in, and every path to the output runs through stripControls().
 */
const UNDERSCORE_ESCAPE = '\ue004';
/**
 * Resolve the underscore escapes, dropping the backslash from an intraword one.
 *
 * CommonMark does not honour an intraword underscore, so `company_id` renders
 * literally with or without the escape - the backslash only litters identifiers
 * in output meant to be read and searched. An asterisk is NOT symmetric here
 * (`a*b*c` does emphasise), so this applies to `_` alone.
 *
 * Runs on the assembled output rather than in escapeText() because whether an
 * underscore is intraword is a property of the rendered stream, not of one
 * node: the parser splits `company_id` into the text nodes `company` and
 * `_id`, so at escape time the underscore looks like it starts a word.
 *
 * It decides on the sentinel rather than on `\_` because the assembled document
 * also contains regions this renderer must reproduce byte-exact - code spans,
 * code blocks, link destinations, titles, raw HTML - and a backslash there is
 * content, not an escape. Matching `\_` rewrote those too (issue 400).
 */
function resolveUnderscoreEscapes(text) {
    return text.replace(/\ue004/g, (_match, offset) => /[\p{L}\p{N}]/u.test(text[offset - 1] ?? '') && /[\p{L}\p{N}]/u.test(text[offset + 1] ?? '')
        ? '_'
        : '\\_');
}
function normalize(text) {
    // The internal non-breaking-space placeholder (U+E000) becomes a literal
    // non-breaking space (U+00A0). Markdown is a re-parseable round-trip format,
    // so unlike the display renderers it keeps the real nbsp: it survives a
    // re-render as `&nbsp;` and is never mistaken for an indented code-block
    // prefix the way ordinary leading spaces would be. Done after trimming so
    // placeholder-derived leading indentation survives.
    const collapsed = `${trimNonNbsp(text.replace(/\n{3,}/g, '\n\n'))}\n`.replace(/\ue000/g, '\u00a0');
    return resolveUnderscoreEscapes(collapsed);
}
function trimNonNbsp(text) {
    return text.replace(TRIM_NON_NBSP_RE, '');
}
function walkBlocks(blocks, visit) {
    for (const block of blocks) {
        visit(block);
        switch (block.type) {
            case 'heading':
            case 'paragraph':
                visit(block, block.children);
                break;
            case 'block_quote':
            case 'admonition':
            case 'div':
            case 'line_block':
                walkBlocks(block.children, visit);
                break;
            case 'list':
                for (const item of block.items)
                    walkBlocks(item.children, visit);
                break;
            case 'definition_list':
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
                if (block.target.type === 'block_quote')
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
            case 'emphasis':
            case 'strong':
            case 'underline':
            case 'strike':
            case 'superscript':
            case 'subscript':
            case 'highlight':
            case 'link':
            case 'span':
            case 'insert':
            case 'delete':
                walkInlines(node.children, visit);
                break;
            case 'inline_extension':
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
/**
 * The admonition-title line is emitted inside a bold wrapper; nested `strong`
 * nodes would produce degenerate output (`**a **b****` in Markdown, a
 * mid-title SGR reset in ANSI), and bold-in-bold is visually a no-op anyway,
 * so strong nodes unwrap to their children inside the title only.
 */
function unwrapStrong(nodes) {
    return nodes.flatMap((n) => {
        const kids = n.children;
        if (n.type === 'strong')
            return unwrapStrong(kids ?? []);
        if (Array.isArray(kids))
            return [{ ...n, children: unwrapStrong(kids) }];
        return [n];
    });
}
//# sourceMappingURL=render-markdown.js.map