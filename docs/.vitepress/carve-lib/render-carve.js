import { parse } from './parse.js';
const MAX_RENDER_DEPTH = 200;
const TRIM_NON_NBSP_RE = /^[^\S\u00a0]+|[^\S\u00a0]+$/g;
export function renderCarve(ast, _opts = {}) {
    // PART 11 section 4: emit the minimal-escape form when dropping the candidate
    // escapes changes nothing, and fall back to the conservative form when it
    // does. The check is the parser's, not a table's, so the writer cannot drift
    // as the grammar grows.
    const minimal = renderWithEscapes(ast, 'minimal');
    const conservative = renderWithEscapes(ast, 'conservative');
    if (minimal === conservative)
        return minimal;
    return escapingIsRedundant(minimal, conservative) ? minimal : conservative;
}
function renderWithEscapes(ast, mode) {
    const previous = escapeMode;
    escapeMode = mode;
    try {
        const ctx = { blockDepth: 0, inlineDepth: 0, listDepth: 0, lineBlockDepth: 0 };
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
    finally {
        escapeMode = previous;
    }
}
/**
 * True when the two renders mean the same thing, so the escapes the
 * conservative form adds are redundant and the minimal form can be emitted.
 *
 * The comparison is minimal-against-conservative rather than
 * minimal-against-the-original-AST, deliberately. The writer does not satisfy
 * `parse(fmt(x)) == parse(x)` for every construct today - tables with a colspan,
 * doubled alignment markers, some list-item attributes and one line-block shape
 * all re-parse to a different AST while rendering identical HTML. Comparing
 * against the original document would inherit those defects and make the
 * escaping decision flip between passes, breaking idempotence for a reason that
 * has nothing to do with escaping. Comparing the two renders isolates the only
 * question this decision is about: does dropping the candidate escapes change
 * anything?
 *
 * It is also document-scoped rather than per-line. Verifying anything smaller
 * loses the document's link and footnote definitions, so a paragraph carrying a
 * reference link comes back with an empty href and reports a difference that
 * escaping never caused.
 */
function escapingIsRedundant(minimal, conservative) {
    try {
        return stableJson(parse(minimal)) === stableJson(parse(conservative));
    }
    catch {
        // A writer bug that produces unparseable source must not throw out of the
        // renderer: fall back to the conservative form, which is what the writer
        // emitted before minimal escaping existed.
        return false;
    }
}
function stableJson(value) {
    return JSON.stringify(canonical(value));
}
/**
 * Key-order-insensitive view of a node tree.
 *
 * A parsed document and a re-parsed one carry the same fields in different
 * insertion order - `attrs` before `children` in one, after it in the other -
 * so a plain JSON.stringify comparison reports a difference that does not
 * exist and escalates the whole document to conservative escaping for nothing.
 *
 * `pos` and `srcByteLength` describe where the text sat rather than what it
 * says, and the writer legitimately renormalizes indentation, so they are
 * dropped rather than compared.
 */
function canonical(value) {
    if (Array.isArray(value))
        return mergeTextRuns(value).map(canonical);
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).sort()) {
            if (key === 'pos' || key === 'srcByteLength')
                continue;
            out[key] = canonical(value[key]);
        }
        return out;
    }
    return value;
}
/**
 * Collapse adjacent text and escaped-text nodes into one text node.
 *
 * An escape is exactly what this comparison is deciding, so the two renders
 * must not be told apart BY it. Escaping a character both retypes the node and
 * SPLITS the run it sat in - `blue.` is one text node, `blue\.` is a text node
 * plus an escaped-text node - so without this every candidate character would
 * report a difference and escalate the whole document to conservative escaping.
 *
 * What survives the merge is the question worth asking: same characters, same
 * order, same surrounding structure - does dropping the escapes change anything
 * ELSE?
 */
function mergeTextRuns(nodes) {
    const out = [];
    for (const node of nodes) {
        const current = node;
        const isTextish = current !== null &&
            typeof current === 'object' &&
            (current['type'] === 'text' || current['type'] === 'escaped_text');
        const previous = out[out.length - 1];
        if (isTextish && previous !== undefined && previous['type'] === 'text') {
            previous['value'] = String(previous['value'] ?? '') + String(current['value'] ?? '');
            if (current['escapedLeadingCaret'] === true)
                previous['escapedLeadingCaret'] = true;
            continue;
        }
        if (isTextish) {
            const merged = { type: 'text', value: String(current['value'] ?? '') };
            if (current['escapedLeadingCaret'] === true)
                merged['escapedLeadingCaret'] = true;
            out.push(merged);
            continue;
        }
        out.push(node);
    }
    return out;
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
/** A copy of `attrs` without one key-value, dropping the slot from `order`. */
function withoutKey(attrs, key) {
    if (!attrs?.keyValues || !(key in attrs.keyValues))
        return attrs;
    const keyValues = { ...attrs.keyValues };
    delete keyValues[key];
    const next = { ...attrs, keyValues };
    if (next.order)
        next.order = next.order.filter((slot) => slot !== key);
    if (next.id === undefined &&
        (next.classes === undefined || next.classes.length === 0) &&
        Object.keys(keyValues).length === 0) {
        return undefined;
    }
    return next;
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
            return withAttrs(guardThematicBreakLines(renderInlines(node.children, ctx)));
        case 'code_block': {
            const fence = safeFence(node.content, 3);
            const info = codeFenceInfo(node.lang, node.header, node.label);
            // The opener's quoted title is resolved onto `attrs.title` at parse time
            // so it reaches every consumer, but the fence carries it too - emitting
            // both says it twice (`{title=x}` AND `\`\`\` lang "x"`), which is longer
            // than the author wrote and re-parses with an attribute ORDER the source
            // never had (issue 369). The fence is the authored spelling, so it wins.
            const attrsWithoutTitle = node.header !== undefined && node.attrs?.keyValues?.['title'] === node.header
                ? renderBlockAttrs(withoutKey(node.attrs, 'title'))
                : attrs;
            const body = `${fence}${info}\n${protectVerbatim(node.content)}\n${fence}`;
            return attrsWithoutTitle ? `${attrsWithoutTitle}\n${body}` : body;
        }
        case 'block_quote': {
            const inner = renderBlocks(node.children, ctx);
            const body = inner
                .split('\n')
                .map((line) => (line === '' ? '>' : `> ${line}`))
                .join('\n');
            return withAttrs(body);
        }
        case 'list':
            return withAttrs(renderList(node, ctx));
        case 'thematic_break':
            return withAttrs('---');
        case 'table':
            return withAttrs(renderTable(node, ctx));
        case 'admonition': {
            // The quoted title is re-parsed as a quoted_title token (which admits
            // no escapes and cannot contain a quote), so the inline serialization
            // must be emitted verbatim: wrapping it in escapeQuoted doubles the
            // backslashes renderInlines already produced and compounds on every
            // fmt pass (issue 295).
            const title = node.title !== undefined ? ` "${renderInlines(node.title, ctx)}"` : '';
            const label = node.label !== undefined ? ` [${escapeBracketText(node.label)}]` : '';
            const body = renderBlocks(node.children, ctx);
            const fence = colonFenceFor(node.children);
            return withAttrs(`${fence} ${node.kind}${title}${label}\n${body}\n${fence}`);
        }
        case 'line_block': {
            // `::: |` is the line-block opener (PART 3, line_block_open). Emitting a
            // bare `:::` and tagging the node with a `.line-block` class instead
            // re-parsed as an ordinary div, so the node type changed across a format
            // round trip and `parse(fmt(x)) == parse(x)` did not hold (issue 359).
            //
            // Inside the fence every newline IS a hard break (PART 3,
            // line_block_body), so the explicit backslash the inline writer emits for
            // a hard_break would double it on re-parse.
            ctx.lineBlockDepth++;
            let body;
            try {
                body = renderBlocks(node.children, ctx);
            }
            finally {
                ctx.lineBlockDepth--;
            }
            const fence = colonFenceFor(node.children);
            return withAttrs(fence + ' |\n' + lineBlockIndent(body) + '\n' + fence);
        }
        case 'div': {
            // Divs render generically (`::: {.class}`), never the `::: \` hardbreaks
            // sugar: that sugar forces hard breaks, but a plain div carrying a
            // `.hardbreaks` class keeps soft breaks. The two are indistinguishable by
            // attrs - only the child break nodes differ - so we let those break nodes
            // serialize themselves, which round-trips both. (A line block is its own
            // node type and is handled above.)
            const label = node.label !== undefined ? ` [${escapeBracketText(node.label)}]` : '';
            const body = renderBlocks(node.children, ctx);
            const fence = colonFenceFor(node.children);
            return withAttrs(`${fence}${label}\n${body}\n${fence}`);
        }
        case 'definition_list':
            return withAttrs(renderDefinitionList(node.items, ctx));
        case 'figure':
            return withAttrs(renderFigure(node, ctx));
        case 'image':
            return renderImage(node);
        case 'raw_block': {
            const fence = safeFence(node.content, 3);
            return withAttrs(`${fence}=${escapeFormat(node.format)}\n${protectVerbatim(node.content)}\n${fence}`);
        }
        case 'abbreviation_def':
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
        // The marker is semantic (§11: a different bullet char / ordered delim
        // starts a new list), so emit it as authored - normalizing would merge
        // adjacent sibling lists on re-parse (carve issue 286).
        const delim = node.delim ?? '.';
        const bullet = node.bulletChar ?? '-';
        node.items.forEach((item, idx) => {
            const indent = '  '.repeat(ctx.listDepth - 1);
            let prefix;
            if (node.ordered) {
                prefix = `${orderedMarker(counter, node.olType)}${delim} `;
                counter++;
            }
            else if (item.checked !== undefined) {
                prefix = `${bullet} ${item.checked ? '[x]' : '[ ]'} `;
            }
            else {
                prefix = `${bullet} `;
            }
            const itemAttrs = renderAttrs(item.attrs);
            if (itemAttrs) {
                prefix = node.ordered
                    ? `${prefix.trimEnd()}${itemAttrs} `
                    : `${bullet}${itemAttrs}${item.checked !== undefined ? ` [${item.checked ? 'x' : ' '}] ` : ' '}`;
            }
            let content = trimNonNbsp(renderListItem(item, ctx, node.tight));
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
function renderListItem(item, ctx, tight) {
    // A loose item separates its blocks with a blank line; a tight item joins
    // them with a single newline so the re-parse stays tight. Using the generic
    // blank-line join here would loosen a tight item that has more than one child
    // (e.g. text after a fenced block), breaking toHtml(fmt(x)) == toHtml(x).
    if (!tight)
        return renderBlocks(item.children, ctx);
    if (ctx.blockDepth >= MAX_RENDER_DEPTH)
        return '';
    ctx.blockDepth++;
    try {
        return item.children
            .map((b) => renderBlock(b, ctx))
            .filter((s) => s.length > 0)
            .join('\n');
    }
    finally {
        ctx.blockDepth--;
    }
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
/**
 * Tables prefer the NATIVE header form: an `=` on each header cell, plus the
 * per-cell `<`/`>`/`~` alignment markers.
 *
 * The GFM delimiter row is an accepted alias on input, but it says something
 * the AST does not: its alignment applies to the WHOLE column, header and body
 * alike (PART 9 T7), while alignment on the AST belongs to each cell. Writing a
 * delimiter row for the ordinary shape - an aligned header over unaligned body
 * cells - brought every body cell back aligned, so `parse(fmt(x)) == parse(x)`
 * did not hold (issue 359).
 *
 * Two header shapes have no native spelling, because `header_cell` in the
 * grammar is `'=' [alignment_marker] content` and admits neither an attribute
 * block nor a span marker:
 *
 *   | < | b |     a span marker promoted to a header cell
 *   |{.x} a | b | a header cell carrying attributes
 *
 * Those still need a delimiter row to promote the first row. It is emitted BARE
 * (`|---|---|`), never with colons: the cells keep their own alignment markers,
 * so the delimiter contributes structure only and cannot spill alignment down
 * the column.
 */
function renderTable(node, ctx) {
    const rows = [];
    const columns = node.rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    const first = node.rows[0];
    const headerRow = first !== undefined && first.cells.length > 0 && first.cells.every((c) => c.header);
    const needsDelimiter = headerRow && first.cells.some((c) => c.span !== undefined || c.attrs !== undefined);
    node.rows.forEach((row, rowIndex) => {
        const cells = [];
        for (let i = 0; i < columns; i++) {
            const cell = row.cells[i];
            // In the delimiter form the promoted row is written as ordinary data
            // cells - the row after it is what makes them headers.
            const asHeader = !(needsDelimiter && rowIndex === 0);
            cells.push(cell ? renderTableCell(cell, ctx, asHeader) : { text: '', tight: false });
        }
        rows.push(renderTableRow(cells, renderAttrs(row.attrs)));
    });
    if (needsDelimiter) {
        rows.splice(1, 0, `|${Array.from({ length: columns }, () => '---').join('|')}|`);
    }
    if (node.caption)
        rows.push(`^ ${renderInlines(node.caption, ctx)}`);
    return rows.join('\n');
}
function renderTableRow(cells, attrs) {
    return `|${cells.map((cell) => (cell.tight ? cell.text : ` ${cell.text} `)).join('|')}|${attrs}`;
}
function renderTableCell(cell, ctx, markHeader = true) {
    const attrs = renderAttrs(cell.attrs);
    if (cell.span === 'rowspan')
        return { text: `${attrs}^`, tight: true };
    if (cell.span === 'colspan')
        return { text: `${attrs}<`, tight: true };
    const prefix = `${attrs}${cell.header && markHeader ? '=' : ''}${alignMarker(cell.align)}`;
    return { text: `${prefix}${renderInlines(cell.children, ctx)}`, tight: prefix !== '' };
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
        case 'escaped_text':
            // The author escaped this character; the writer says so again. No
            // minimal/conservative decision applies - the node IS the decision.
            return '\\' + node.value;
        case 'emphasis':
            return withAttrs(renderEmphasis('/', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'strong': {
            // The combined bold-italic form is a single production, and the nested
            // spelling parses to the SAME strong-wrapping-emphasis tree - so the
            // nesting does not record which one the author wrote and cannot be
            // serialized back "literally". The comment here used to claim each
            // spelling re-parses to the shape it came from; it does not, which is why
            // the documented form was being rewritten into an undocumented one
            // (carve#375). `boldItalic` carries the answer (PART 11 section 6).
            const inner = node.children[0];
            if (node.boldItalic === true && node.children.length === 1 && inner?.type === 'emphasis') {
                const content = renderInlines(inner.children, ctx);
                return withAttrs(`/*${content}*/`);
            }
            return withAttrs(renderEmphasis('*', renderInlines(node.children, ctx), prevChar, nextChar));
        }
        case 'underline':
            return withAttrs(renderEmphasis('_', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'strike':
            return withAttrs(renderEmphasis('~', renderInlines(node.children, ctx), prevChar, nextChar));
        case 'superscript':
            return withAttrs(renderForcedEmphasis('^', renderInlines(node.children, ctx)));
        case 'subscript':
            return withAttrs(renderForcedEmphasis(',', renderInlines(node.children, ctx)));
        case 'highlight':
            return withAttrs(renderEmphasis('=', renderInlines(node.children, ctx), prevChar, nextChar));
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
        case 'raw_inline':
            return `${renderCode(node.content)}{=${escapeFormat(node.format)}}`;
        case 'literal_inline':
            // §27: `!` prefix on a verbatim span. A trailing attribute block is the
            // ordinary inline attribute block (same as a code span carries).
            // renderCode widens the backtick fence when the content holds backticks.
            return `!${renderCode(node.content)}${renderAttrs(node.attrs)}`;
        case 'symbol':
            return withAttrs(`:${escapeSymbolName(node.name)}:`);
        case 'autolink':
            // Emit the raw autolink content verbatim (keeps a URI scheme like
            // `mailto:`); fall back to the href for nodes without `text`.
            return withAttrs(`<${escapeAutolinkHref(node.text ?? (node.href.startsWith('mailto:') ? node.href.slice(7) : node.href))}>`);
        case 'mention':
            return `@${escapeName(node.user)}`;
        case 'tag':
            return `#${escapeName(node.name)}`;
        case 'inline_extension':
            return withAttrs(`:${escapeIdentifier(node.name)}[${renderInlines(node.content, ctx)}]`);
        case 'abbreviation':
            return escapeText(node.abbr);
        case 'footnote':
            return withAttrs(node.inline
                ? `^[${renderInlines(node.inline, ctx)}]`
                : `[^${escapeFootnoteLabel(node.id ?? '')}]`);
        case 'soft_break':
            return '\n';
        case 'hard_break':
            return ctx.lineBlockDepth > 0 ? '\n' : '\\\n';
        case 'insert':
            return `{+${renderInlines(node.children, ctx)}+}${renderAttrs(node.attrs)}`;
        case 'delete':
            return `{-${renderInlines(node.children, ctx)}-}${renderAttrs(node.attrs)}`;
        case 'substitution':
            return `{~${escapeCriticText(node.oldText)}~>${escapeCriticText(node.newText)}~}`;
        case 'critic-comment':
            return `{#${escapeCriticText(node.text)}#}`;
        case 'heading_ref':
            return `</#${escapeCrossrefTarget(node.target)}>`;
        case 'caption_number':
            return '#';
        case 'citation_group':
            return node.raw;
        case 'comment':
            return ` %% ${node.content}`;
        case 'smart_punctuation':
            // The whole point: reproduce the author's source run verbatim.
            return node.value;
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
    // An unresolved reference image round-trips via its verbatim source, exactly
    // like an unresolved reference link (renderLink); `![alt]()` would change the
    // rendered text and break the carveToHtml(fmt(x)) == carveToHtml(x) invariant.
    if (node.ref !== undefined && node.rawRef !== undefined) {
        return node.rawRef;
    }
    const title = node.title === undefined ? '' : ` "${escapeQuoted(node.title)}"`;
    return `![${escapeImageAlt(node.alt)}](${escapeDestination(node.src)}${title})${renderAttrs(node.attrs)}`;
}
function renderFrontmatter(frontmatter) {
    const open = frontmatter.format === 'yaml' ? '---' : `---${escapeFormat(frontmatter.format)}`;
    return `${open}\n${protectVerbatim(frontmatter.content)}\n---`;
}
function renderBlockComment(content) {
    let longest = 0;
    for (const match of content.matchAll(/%+/g))
        longest = Math.max(longest, match[0].length);
    const fence = '%'.repeat(Math.max(3, longest + 1));
    return `${fence}\n${protectVerbatim(content)}\n${fence}`;
}
function renderMath(display, content) {
    const code = renderCode(content);
    return `${display ? '$$' : '$'}${code}`;
}
// Superscript and subscript have no bare delimiter form -- always emit the
// braced `{^x^}` / `{,x,}` form.
function renderForcedEmphasis(delim, content) {
    return `{${delim}${content}${delim}}`;
}
function renderEmphasis(delim, content, prevChar, nextChar, closeDelim = delim) {
    const needsForced = /[A-Za-z0-9_]/.test(prevChar) ||
        /[A-Za-z0-9_]/.test(nextChar) ||
        content.startsWith(delim) ||
        content.endsWith(closeDelim) ||
        content.startsWith(' ') ||
        content.endsWith(' ') ||
        content === '';
    return needsForced
        ? `{${delim}${content}${closeDelim}}`
        : `${delim}${content}${closeDelim}`;
}
function renderCode(content) {
    const fence = safeFence(content, 1);
    // Pad exactly when the parser will strip, so the strip is reversible and fmt
    // stays idempotent; the padding sits INSIDE the fence, so a trailing attribute
    // block still attaches to the closing run. The parser strips one leading and
    // one trailing space when the content BOTH begins and ends with a space but is
    // NOT entirely spaces (see stripVerbatimPadding in parse.ts), and needs a space
    // around backtick-adjacent content. All-space content must therefore NOT be
    // padded: it is emitted verbatim and read back unchanged. Padding it instead
    // grew the span by two spaces on every fmt pass.
    const needsPad = content.startsWith('`') ||
        content.endsWith('`') ||
        (content.startsWith(' ') && content.endsWith(' ') && content.trim() !== '');
    return needsPad ? `${fence} ${content} ${fence}` : `${fence}${content}${fence}`;
}
function codeFenceInfo(lang, header, label) {
    const parts = [];
    if (lang)
        parts.push(escapeFenceToken(lang));
    // The fence header is a LITERAL quoted_title token: no escape processing
    // on parse, and it cannot contain a quote. Emit it verbatim - escaping a
    // backslash here would round-trip to a doubled backslash (issue 295).
    if (header !== undefined)
        parts.push(`"${header}"`);
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
/**
 * Write a line block's leading indentation back as ordinary spaces.
 *
 * The parser records that indentation as the U+E000 placeholder (the same
 * sentinel an escaped space uses, so the two never collide with a literal
 * nbsp). normalize() resolves every remaining U+E000 to a real nbsp, which is
 * right for an escaped space and wrong here: the source form of a line block's
 * indent is a plain space, and a real nbsp re-parses as literal text rather
 * than as indentation, so the text node came back different (issue 359).
 *
 * Hand the run to the verbatim scheme instead, which restores plain spaces
 * after normalize() has run.
 */
function lineBlockIndent(body) {
    return body.replace(/^\ue000+/gm, (run) => '\ue001'.repeat(run.length));
}
function normalize(text) {
    // The placeholder means the author wrote an ESCAPED SPACE, so the writer says
    // that again. Resolving it to a literal non-breaking space instead lost the
    // distinction the parser draws - `10\ kg` came back carrying U+00A0, which
    // re-parses as a literal nbsp rather than as an escape, so the text node
    // differed even though the HTML did not (carve#369).
    //
    // A line block's indent is the other user of this sentinel and is already
    // routed through the verbatim scheme before this runs, so what is left here
    // is an escaped space and nothing else.
    const lines = trimNonNbsp(text.replace(/\ue000/g, '\\ ')).split('\n');
    const swept = lines.map((line, i) => {
        // A line whose only content is ASCII space or tab is emitted EMPTY, wherever
        // it sits (PART 11 \u00a77). Verbatim content is still sentinel-encoded here, so
        // three spaces inside a code block are out of reach and stay intact.
        if (line.length > 0 && line.replace(/[ \t]+/g, '') === '')
            return '';
        // Otherwise strip a line's trailing whitespace only where it CANNOT be
        // content. At the end of a block the parser drops it too, so the writer
        // must; before a SOFT BREAK the parser keeps it, and stripping it there
        // changes the rendered output - `a \nb` renders `<p>a \nb</p>`, so the
        // stripped form broke carveToHtml(fmt(x)) == carveToHtml(x). carve-rs and
        // carve-php already restricted this (carve#359, carve#375); this engine did
        // not, and no corpus case covered an ASCII trailing space before a soft
        // break, so nothing caught it.
        const next = lines[i + 1];
        const endsBlock = next === undefined || next.trim() === '';
        return endsBlock ? line.replace(/[^\S\u00a0]+$/g, '') : line;
    });
    const cleaned = trimNonNbsp(swept.join('\n').replace(/\n{3,}/g, '\n\n'));
    return `${restoreVerbatim(cleaned)}\n`;
}
/**
 * Whole-document normalization (trailing-whitespace strip, blank-line
 * collapsing) must not reach inside verbatim content - code blocks, raw
 * blocks, frontmatter, and block comments reproduce their content
 * byte-exact (issue 340). Sentinel-encode the vulnerable bytes before the
 * content joins the document string; normalize() restores them at the end.
 * U+E000 is already the NBSP sentinel; U+E001..U+E003 extend the scheme.
 */
function protectVerbatim(content) {
    return content
        .replace(/[ \t]+(?=\n|$)/g, (run) => run.replace(/ /g, '\ue001').replace(/\t/g, '\ue002'))
        .split('\n')
        .map((line) => (line === '' ? '\ue003' : line))
        .join('\n');
}
function restoreVerbatim(text) {
    return text.replace(/\ue001/g, ' ').replace(/\ue002/g, '\t').replace(/\ue003/g, '');
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
// `,` needs no escape: there is no bare subscript delimiter, and the braced
// `{,` opener is neutralized by the `{` escape. `^` stays escaped for the
// inline-footnote (`^[`) and caption (line-leading `^`) channels.
// PART 11 section 5. The UNCONDITIONAL set is escaped in every mode: a
// backslash and a backtick are never re-derivable, and a bare quote
// re-derives as smart punctuation (PART 9 section 8), so a quote that reached
// the writer as TEXT is one the author escaped and stays escaped. The
// CANDIDATE set is every other character the grammar can read as an opener,
// escaped only when the minimal form fails to round-trip.
// The caret joins this set even though it opens nothing on its own. Its
// escape carries information the AST records separately - a text node whose
// LEADING caret came from an escape is flagged, so an image followed by a
// caret line is not promoted to a figure. Comparing that flag would escalate
// any document whose text starts with a caret; ignoring it would silently
// turn the image case into a figure. Escaping the caret in both modes keeps
// the two renders identical on that point and sidesteps the question, at the
// cost of one escape on a character that is rare in prose.
const UNCONDITIONAL_ESCAPES = /[\\`"'^]/g;
const CANDIDATE_ESCAPES = /[\\`*_{}\[\]()#+\-.!~^/<>@%|=:;"']/g;
// Which set the writer is escaping right now. renderCarve renders the document
// minimally, checks that it re-parses to the same AST, and re-renders
// conservatively only when it does not (PART 11 section 4).
let escapeMode = 'conservative';
/**
 * Protect a paragraph line that would re-parse as a thematic break.
 *
 * Source indentation is not in the AST, so an indented `---` - a paragraph
 * holding an em dash - is emitted at column 0, where it stops being a paragraph
 * and becomes a thematic break.
 *
 * Text nodes are already covered: the conservative form escapes the hyphens, so
 * the round-trip check sees the difference and picks that form. A
 * `smart_punctuation` run is not, because its source run is emitted verbatim in
 * BOTH forms - that is the point of the node - so the check never sees a
 * difference to act on. Escaping the run in the conservative form does not work
 * either: it would make that form change the document, and the check would then
 * never be able to prefer the minimal one.
 *
 * So the guard sits on the rendered line instead, where it does not care which
 * node produced the hyphens.
 */
function guardThematicBreakLines(body) {
    if (!body.includes('-'))
        return body;
    return body
        .split('\n')
        .map((line) => (/^-{3,}[ \t]*$/.test(line) ? ` ${line}` : line))
        .join('\n');
}
function escapeText(text) {
    const escapes = escapeMode === 'minimal' ? UNCONDITIONAL_ESCAPES : CANDIDATE_ESCAPES;
    return text.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '').replace(escapes, '\\$&');
}
function escapePlainLine(text) {
    return text.replace(/\n/g, ' ');
}
function escapeImageAlt(text) {
    return text.replace(/[\\[\]]/g, '\\$&');
}
/**
 * Backslash-escape exactly the characters the destination scan would otherwise
 * read differently: a parenthesis with no partner, and a backslash sitting in
 * front of one of the three escapable characters. Balanced parentheses are
 * left alone -- they re-parse as themselves, and escaping them would be churn
 * against the minimal-escaping rule in PART 11 section 4.
 */
function escapeDestinationEscapes(text) {
    const openers = [];
    const unbalanced = new Set();
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '(')
            openers.push(i);
        else if (text[i] === ')') {
            if (openers.length > 0)
                openers.pop();
            else
                unbalanced.add(i);
        }
    }
    for (const i of openers)
        unbalanced.add(i);
    let out = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const escapable = ch === '\\' && (text[i + 1] === '(' || text[i + 1] === ')' || text[i + 1] === '\\');
        out += unbalanced.has(i) || escapable ? `\\${ch}` : ch;
    }
    return out;
}
function escapeDestination(text) {
    const scheme = /^[\u0000-\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]*([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(text)?.[1]?.toLowerCase();
    const sanitizeBlank = scheme !== undefined && ['javascript', 'vbscript', 'data', 'file'].includes(scheme);
    // Whitespace is percent-encoded (it would otherwise end the destination).
    // A parenthesis only needs escaping when it is unbalanced, because a
    // balanced pair survives the scan as-is -- and leaving it bare is what keeps
    // the common case (`.../Foo_(bar)`) readable. A backslash is escaped only
    // in front of the three characters the destination scan treats as escapes,
    // so backslashes elsewhere in a URL are emitted verbatim.
    const escaped = escapeDestinationEscapes(text);
    return escaped
        .replace(/\s/g, (ch) => (ch === ' ' ? '%20' : `%${ch.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`))
        .replace(/\\?[()]/g, (m) => (sanitizeBlank ? (m.endsWith('(') ? '%28' : '%29') : m));
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
// A symbol name may contain `+` and `-` (so `:+1:` / `:-1:` round-trip),
// unlike an extension identifier.
function escapeSymbolName(text) {
    return text.replace(/[^\w+-]/g, '');
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
        // The CHARACTER, not the backslash that precedes it in the output. A text
        // node holding `_b_` and an escaped-text node holding `_` describe the same
        // neighbour, and the writer has to brace an adjacent delimiter the same way
        // for both - otherwise the first pass (text) and the second (escaped text)
        // disagree and `fmt(fmt(x)) != fmt(x)`.
        case 'escaped_text':
            return node.value;
        case 'soft_break':
        case 'hard_break':
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
        case 'escaped_text':
            return node.value;
        case 'soft_break':
        case 'hard_break':
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