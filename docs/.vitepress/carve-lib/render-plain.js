import { SMART_PUNCTUATION_GLYPHS } from './ast.js';
const MAX_RENDER_DEPTH = 200;
const TRIM_NON_NBSP_RE = /^[^\S\u00a0]+|[^\S\u00a0]+$/g;
export function renderPlainText(ast, _opts = {}) {
    const ctx = {
        blockDepth: 0,
        inlineDepth: 0,
        definedFootnotes: new Set(Object.keys(ast.footnoteDefs ?? {})),
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
        case 'heading':
            return `${renderInlines(node.children, ctx)}\n\n`;
        case 'paragraph':
            return `${renderInlines(node.children, ctx)}\n\n`;
        case 'code_block':
            return `${stripControls(node.content)}\n\n`;
        case 'block_quote':
            return `"${trimNonNbsp(renderBlocks(node.children, ctx))}"\n\n`;
        case 'list':
            return renderList(node, ctx);
        case 'thematic_break':
            return '---\n\n';
        case 'table':
            return renderTable(node, ctx);
        case 'admonition': {
            const body = renderBlocks(node.children, ctx);
            const title = node.title !== undefined ? renderInlines(node.title, ctx) : '';
            // Caption floor: surface an unconsumed grouping [label] as a standalone
            // line (title first when both are present).
            const labelLine = node.label ? `${stripControls(node.label)}\n\n` : '';
            if (title !== '') {
                return `${title}\n\n${labelLine}${body}`;
            }
            return `${labelLine}${body}`;
        }
        case 'div':
            return node.label
                ? `${stripControls(node.label)}\n\n${renderBlocks(node.children, ctx)}`
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
            return `${stripControls(node.alt)}\n\n`;
        case 'raw_block':
        case 'abbreviation_def':
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
        out += `${trimNonNbsp(renderBlocks(item.children, ctx))}\n`;
    }
    return `${out}\n`;
}
function renderDefinitionList(items, ctx, trailingBlank) {
    let out = '';
    for (const item of items) {
        for (const term of item.terms)
            out += `${renderInlines(term, ctx)}\n`;
        for (const def of item.definitions)
            out += `  ${trimNonNbsp(renderBlocks(def, ctx))}\n`;
    }
    return trailingBlank ? `${out}\n` : out;
}
function renderTable(node, ctx) {
    // Use the table's true column count (max cells across rows) so a row with
    // rowspan/colspan filler cells still emits every column (matches the HTML and
    // Markdown renderers and carve-php / carve-rs).
    const cols = node.rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    let out = '';
    for (const row of node.rows) {
        const cells = [];
        for (let i = 0; i < cols; i++) {
            cells.push(i < row.cells.length ? trimNonNbsp(renderInlines(row.cells[i].children, ctx)) : '');
        }
        // Drop only SYNTHETIC trailing padding (columns this row does not have, so
        // a short/rowspan row stays ragged: `A`, not `A | `), but KEEP a genuine
        // trailing empty cell the row authored (`| x || ` -> `x |`). Matches carve-rs.
        while (cells.length > row.cells.length && cells[cells.length - 1] === '')
            cells.pop();
        out += `${cells.join(' | ')}\n`;
    }
    if (node.caption)
        out = `${trimEndNonNbsp(out)}\n${renderInlines(node.caption, ctx)}\n`;
    return `${out}\n`;
}
function renderFigure(node, ctx) {
    const target = node.target.type === 'image'
        ? stripControls(node.target.alt)
        : node.target.type === 'table'
            ? trimNonNbsp(renderTable(node.target, ctx))
            : trimNonNbsp(renderBlock(node.target, ctx));
    // The caption sits on its own line directly under the figure (`\n`) - an
    // image target used to glue it on. A blockquote target keeps the blank-line
    // separation; a table drops the caption entirely. End with the block
    // separator so a following block is not glued (matching carve-php).
    const sep = node.target.type === 'block_quote' ? '\n\n' : node.target.type === 'table' ? '' : '\n';
    return `${target}${sep}${renderInlines(node.caption, ctx)}\n\n`;
}
function renderFootnoteDefs(ast, ctx) {
    if (!ast.footnoteDefs)
        return '';
    let out = '';
    for (const [label, blocks] of Object.entries(ast.footnoteDefs)) {
        out += `[${stripControls(label)}]: ${trimNonNbsp(renderBlocks(blocks, ctx))}\n`;
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
        case 'escaped_text':
            return node.value;
        case 'emphasis':
        case 'strong':
        case 'underline':
        case 'superscript':
        case 'subscript':
        case 'highlight':
        case 'span':
        case 'insert':
        case 'strike':
            return renderInlines(node.children, ctx);
        case 'delete':
            return `~${renderInlines(node.children, ctx)}~`;
        case 'code':
            return stripControls(node.value);
        case 'link':
            return renderInlines(node.children, ctx);
        case 'image':
            return stripControls(node.alt);
        case 'math':
            return stripControls(node.content);
        case 'raw_inline':
            return '';
        case 'literal_inline':
            // §27: always emitted (unlike raw passthrough above), as plain prose.
            return stripControls(node.content);
        case 'symbol':
            return `:${stripControls(node.name)}:`;
        case 'autolink':
            // Raw autolink content: a URI autolink keeps its scheme, an email shows
            // the address; fall back to stripping an auto-added `mailto:`.
            return stripControls(node.text ?? (node.href.startsWith('mailto:') ? node.href.slice(7) : node.href));
        case 'mention':
            return `@${stripControls(node.user)}`;
        case 'tag':
            return `#${stripControls(node.name)}`;
        case 'inline_extension':
            return renderInlines(node.content, ctx);
        case 'abbreviation':
            return stripControls(node.abbr);
        case 'footnote': {
            if (node.inline)
                return `(${renderInlines(node.inline, ctx)})`;
            const id = stripControls(node.id ?? '');
            // An UNRESOLVED reference stays literal, exactly as the HTML target
            // renders it: the construct did not form, so `[^a]` is ordinary text and
            // dropping the caret invented a reference the document does not have.
            // carve-php already did this; carve-js and carve-rs both emitted `[a]`
            // (carve#352, corpus 132/133/157/161).
            return ctx.definedFootnotes.has(id) ? `[${id}]` : `[^${id}]`;
        }
        case 'soft_break':
            return ' ';
        case 'hard_break':
            return '\n';
        case 'substitution':
            // Keep both sides (old struck like critic-delete, then new).
            return `~${stripControls(node.oldText)}~${stripControls(node.newText)}`;
        // A critic comment is VISIBLE content: the HTML target renders it as
        // `<span class="critic-comment"> note </span>`, so dropping it here made two
        // targets of one engine disagree about whether the document says it.
        // carve-php kept it (carve#352, corpus 33-editorial-markup).
        case 'critic-comment':
            return stripControls(node.text);
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
            return node.glyph ?? SMART_PUNCTUATION_GLYPHS[node.kind] ?? node.value;
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
    // Trim only BLANK LINES, not the indentation of the first or last content line.
    // A document that opens with a fenced code block whose first line is indented had
    // that indentation eaten here, so a tab the HTML target emits inside `<code>`
    // vanished from plain text (carve#352, corpus 11-fenced-code-2). Code content is
    // data, and a document-level trim has no business reaching into it.
    // The two ends need different rules. At the START, trim blank lines only: the
    // indentation of the first content line is data - a document opening with a
    // fenced code block whose first line is indented had that eaten here, so a tab
    // the HTML target emits inside `<code>` vanished (carve#352, corpus
    // 11-fenced-code-2). At the END, trailing whitespace is trimmed as before,
    // because there it is layout rather than content: a table row ending in an empty
    // cell renders `x | ` and that space is an artifact of the separator.
    const body = trimEndNonNbsp(text.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, ''));
    return `${body}\n`.replace(/\ue000/g, ' ');
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
 *  so attacker ESC / OSC sequences cannot inject into terminal output. */
function stripControls(s) {
    return s.replace(/\p{Cc}/gu, (c) => (c === '\t' || c === '\n' ? c : ''));
}
//# sourceMappingURL=render-plain.js.map