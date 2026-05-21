/*
 * HTML renderer — emits the canonical output the spec corpus expects.
 *
 * Output style: minimal indentation, block elements on their own line,
 * inline content stays flat within block element. Nested block
 * structures (table, blockquote, figure, admonition) get two-space
 * indented children for readability.
 */
export function renderHtml(ast, opts = {}) {
    const out = [];
    // Section-wrapping pass (grammar PART 9 §13): every top-level heading
    // opens a <section id="{slug}"> that holds the heading and the content
    // up to the next same-or-shallower heading. The id lives on the
    // <section>, not on the <h*>. Sections nest by heading level.
    const sectionStack = []; // open section heading-levels, outer→inner
    const closeTo = (level) => {
        while (sectionStack.length && sectionStack[sectionStack.length - 1] >= level) {
            sectionStack.pop();
            out.push(`${indent(sectionStack.length)}</section>`);
        }
    };
    for (const node of ast.children) {
        if (node.type === 'abbreviation-def')
            continue;
        if (node.type === 'heading') {
            closeTo(node.level);
            const depth = sectionStack.length;
            // The id moves to <section>; any other heading attrs (classes,
            // key-values) stay on the <h*>.
            const id = node.attrs?.id;
            const sectionId = id ? ` id="${escapeAttr(id)}"` : '';
            out.push(`${indent(depth)}<section${sectionId}>`);
            sectionStack.push(node.level);
            const headingAttrs = stripId(node.attrs);
            const inner = renderInlines(node.children, opts);
            out.push(`${indent(depth + 1)}<h${node.level}${renderAttrs(headingAttrs)}>${inner}</h${node.level}>`);
            continue;
        }
        const rendered = renderBlock(node, opts, sectionStack.length);
        if (rendered !== '')
            out.push(rendered);
    }
    closeTo(1); // close any sections still open at end of document
    return out.join('\n');
}
/** Copy attrs without the `id` (the id moves to the enclosing <section>). */
function stripId(attrs) {
    if (!attrs)
        return undefined;
    if (attrs.id === undefined)
        return attrs;
    const { id: _omit, ...rest } = attrs;
    return rest;
}
function indent(level) {
    return '  '.repeat(level);
}
function renderAttrs(attrs) {
    if (!attrs)
        return '';
    const parts = [];
    if (attrs.classes && attrs.classes.length) {
        parts.push(`class="${attrs.classes.join(' ')}"`);
    }
    if (attrs.id)
        parts.push(`id="${attrs.id}"`);
    if (attrs.keyValues) {
        for (const [k, v] of Object.entries(attrs.keyValues)) {
            parts.push(`${k}="${escapeAttr(v)}"`);
        }
    }
    return parts.length ? ' ' + parts.join(' ') : '';
}
function renderBlock(node, opts, level) {
    const pad = indent(level);
    switch (node.type) {
        case 'heading': {
            const inner = renderInlines(node.children, opts);
            return `${pad}<h${node.level}${renderAttrs(node.attrs)}>${inner}</h${node.level}>`;
        }
        case 'paragraph': {
            const inner = renderInlines(node.children, opts);
            return `${pad}<p${renderAttrs(node.attrs)}>${inner}</p>`;
        }
        case 'thematic-break':
            return `${pad}<hr>`;
        case 'code-block': {
            const langAttr = node.lang ? ` class="language-${node.lang}"` : '';
            const escaped = escapeHtml(node.content);
            return `${pad}<pre><code${langAttr}>${escaped}\n</code></pre>`;
        }
        case 'blockquote':
            return renderBlockQuote(node, opts, level);
        case 'list':
            return renderList(node, opts, level);
        case 'image':
            return `${pad}${renderImage(node, opts)}`;
        case 'table':
            return renderTable(node, opts, level);
        case 'admonition':
            return renderAdmonition(node, opts, level);
        case 'figure':
            return renderFigure(node, opts, level);
        case 'abbreviation-def':
            return '';
        case 'raw-block':
            return node.format === 'html' ? node.content : '';
        case 'comment':
            return `${pad}<!-- ${node.content} -->`;
        default: {
            const t = node;
            throw new Error(`renderHtml: unknown block ${t.type}`);
        }
    }
}
function renderBlockQuote(node, opts, level) {
    const pad = indent(level);
    if (node.children.length === 1 && node.children[0].type === 'paragraph') {
        const inner = renderInlines(node.children[0].children, opts);
        return `${pad}<blockquote><p>${inner}</p></blockquote>`;
    }
    const inner = node.children.map((c) => renderBlock(c, opts, level + 1)).join('\n');
    return `${pad}<blockquote>\n${inner}\n${pad}</blockquote>`;
}
function renderList(node, opts, level) {
    const pad = indent(level);
    const tag = node.ordered ? 'ol' : 'ul';
    const items = node.items
        .map((it) => renderListItem(it, opts, level + 1, node.tight))
        .join('\n');
    return `${pad}<${tag}>\n${items}\n${pad}</${tag}>`;
}
function renderListItem(item, opts, level, tight) {
    const pad = indent(level);
    const checkbox = item.checked === undefined
        ? ''
        : item.checked
            ? '<input type="checkbox" checked disabled> '
            : '<input type="checkbox" disabled> ';
    const wrapPara = (p) => {
        const inner = renderInlines(p.children, opts);
        return tight ? inner : `<p>${inner}</p>`;
    };
    // Single paragraph: stays on the <li> line. Tight omits <p>, loose keeps it.
    if (item.children.length === 1 && item.children[0].type === 'paragraph') {
        return `${pad}<li>${checkbox}${wrapPara(item.children[0])}</li>`;
    }
    // Mixed content (e.g. a lead paragraph followed by a nested list): the
    // first paragraph sits on the <li> line; remaining blocks go below,
    // indented one level deeper, with the closing </li> back at item indent.
    let head = `${pad}<li>${checkbox}`;
    const body = [];
    item.children.forEach((child, i) => {
        if (child.type === 'paragraph') {
            const rendered = wrapPara(child);
            if (i === 0)
                head += rendered;
            else
                body.push(`${indent(level + 1)}${rendered}`);
        }
        else {
            body.push(renderBlock(child, opts, level + 1));
        }
    });
    if (body.length === 0)
        return `${head}</li>`;
    return `${head}\n${body.join('\n')}\n${pad}</li>`;
}
function renderTable(node, opts, level) {
    const pad = indent(level);
    const lines = [`${pad}<table>`];
    if (node.caption) {
        lines.push(`${pad}  <caption>${renderInlines(node.caption, opts)}</caption>`);
    }
    // Build effective rowspan/colspan by walking rows.
    // For each cell, compute span counts: a '^' cell extends the cell above;
    // a '<' cell extends the cell to its left.
    const grid = [];
    for (let r = 0; r < node.rows.length; r++) {
        const row = node.rows[r];
        const gridRow = [];
        for (let c = 0; c < row.cells.length; c++) {
            const cell = row.cells[c];
            gridRow.push({ row, cell, rowspan: 1, colspan: 1, skip: false });
        }
        grid.push(gridRow);
    }
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const entry = grid[r][c];
            if (entry.skip)
                continue;
            if (entry.cell.span === 'rowspan' && r > 0) {
                // Find the source cell above (handling possibly stacked '^')
                let up = r - 1;
                while (up >= 0 && grid[up][c] && grid[up][c].skip)
                    up--;
                const src = grid[up]?.[c];
                if (src) {
                    src.rowspan++;
                    entry.skip = true;
                }
            }
            else if (entry.cell.span === 'colspan' && c > 0) {
                let left = c - 1;
                while (left >= 0 && grid[r][left].skip)
                    left--;
                const src = grid[r][left];
                if (src) {
                    src.colspan++;
                    entry.skip = true;
                }
            }
        }
    }
    // Detect header section: leading consecutive rows where all cells are headers
    let headerEnd = 0;
    while (headerEnd < grid.length &&
        grid[headerEnd].every((e) => e.cell.header || e.skip)) {
        headerEnd++;
    }
    // Column defaults come from the header section. With multiple header
    // rows the last row that specifies an alignment for a column wins;
    // omission does not reset (so we only overwrite on an explicit marker).
    // A header colspan seeds every column it covers. Headerless tables
    // (headerEnd === 0) have no column default — body markers are the only
    // alignment available.
    const columnAlign = [];
    for (let r = 0; r < headerEnd; r++) {
        const hr = grid[r];
        for (let c = 0; c < hr.length; c++) {
            const entry = hr[c];
            if (entry.skip || !entry.cell.align)
                continue;
            for (let k = c; k < c + entry.colspan; k++)
                columnAlign[k] = entry.cell.align;
        }
    }
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const a = grid[r][c].cell.align ?? columnAlign[c];
            if (a)
                grid[r][c].align = a;
        }
    }
    if (headerEnd > 0) {
        const rows = grid.slice(0, headerEnd).map((r) => renderTableRowFlat(r, opts));
        lines.push(`${pad}  <thead>${rows.join('')}</thead>`);
    }
    if (headerEnd < grid.length) {
        lines.push(`${pad}  <tbody>`);
        for (let r = headerEnd; r < grid.length; r++) {
            lines.push(`${pad}    ${renderTableRowFlat(grid[r], opts)}`);
        }
        lines.push(`${pad}  </tbody>`);
    }
    lines.push(`${pad}</table>`);
    return lines.join('\n');
}
function renderTableRowFlat(cells, opts) {
    const parts = ['<tr>'];
    for (const entry of cells) {
        if (entry.skip)
            continue;
        const tag = entry.cell.header ? 'th' : 'td';
        const attrs = [];
        if (entry.rowspan > 1)
            attrs.push(`rowspan="${entry.rowspan}"`);
        if (entry.colspan > 1)
            attrs.push(`colspan="${entry.colspan}"`);
        if (entry.align)
            attrs.push(`style="text-align: ${entry.align};"`);
        const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
        parts.push(`<${tag}${attrStr}>${renderInlines(entry.cell.children, opts)}</${tag}>`);
    }
    parts.push('</tr>');
    return parts.join('');
}
function renderAdmonition(node, opts, level) {
    const pad = indent(level);
    const cls = `admonition ${node.kind}`;
    const titleLine = node.title
        ? `${pad}  <p class="admonition-title">${renderInlines(node.title, opts)}</p>\n`
        : '';
    const body = node.children.map((c) => renderBlock(c, opts, level + 1)).join('\n');
    return `${pad}<aside class="${cls}">\n${titleLine}${body}\n${pad}</aside>`;
}
function renderFigure(node, opts, level) {
    const pad = indent(level);
    let inner;
    if (node.target.type === 'image') {
        inner = `${pad}  ${renderImage(node.target, opts)}`;
    }
    else if (node.target.type === 'blockquote') {
        const bq = renderBlockQuote(node.target, opts, level + 1);
        inner = bq;
    }
    else {
        inner = renderTable(node.target, opts, level + 1);
    }
    return `${pad}<figure>\n${inner}\n${pad}  <figcaption>${renderInlines(node.caption, opts)}</figcaption>\n${pad}</figure>`;
}
function renderImage(img, _opts) {
    const titleAttr = img.title ? ` title="${escapeAttr(img.title)}"` : '';
    return `<img src="${escapeAttr(img.src)}" alt="${escapeAttr(img.alt)}"${titleAttr}${renderAttrs(img.attrs)}>`;
}
// ============================================================================
// Inline rendering
// ============================================================================
function renderInlines(nodes, opts) {
    return nodes.map((n) => renderInline(n, opts)).join('');
}
function renderInline(node, opts) {
    switch (node.type) {
        case 'text':
            return escapeHtml(node.value);
        case 'italic':
            return `<em>${renderInlines(node.children, opts)}</em>`;
        case 'strong':
            return `<strong>${renderInlines(node.children, opts)}</strong>`;
        case 'underline':
            return `<u>${renderInlines(node.children, opts)}</u>`;
        case 'strike':
            return `<s>${renderInlines(node.children, opts)}</s>`;
        case 'super':
            return `<sup>${renderInlines(node.children, opts)}</sup>`;
        case 'sub':
            return `<sub>${renderInlines(node.children, opts)}</sub>`;
        case 'highlight':
            return `<mark>${renderInlines(node.children, opts)}</mark>`;
        case 'bold-italic':
            return `<strong><em>${renderInlines(node.children, opts)}</em></strong>`;
        case 'code':
            return `<code>${escapeHtml(node.value)}</code>`;
        case 'link': {
            const titleAttr = node.title ? ` title="${escapeAttr(node.title)}"` : '';
            return `<a href="${escapeAttr(node.href)}"${titleAttr}${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</a>`;
        }
        case 'image':
            return renderImage(node, opts);
        case 'autolink': {
            const display = node.href.startsWith('mailto:') ? node.href.slice(7) : node.href;
            return `<a href="${escapeAttr(node.href)}">${escapeHtml(display)}</a>`;
        }
        case 'mention': {
            const href = opts.mentionUrl
                ? opts.mentionUrl.replace('{user}', node.user)
                : `/users/${node.user}`;
            return `<a class="mention" href="${escapeAttr(href)}">@${escapeHtml(node.user)}</a>`;
        }
        case 'tag': {
            const href = opts.tagUrl ? opts.tagUrl.replace('{name}', node.name) : `/tags/${node.name}`;
            return `<a class="tag" href="${escapeAttr(href)}">#${escapeHtml(node.name)}</a>`;
        }
        case 'extension':
            return renderExtension(node.name, node.content, opts);
        case 'abbreviation':
            return `<abbr title="${escapeAttr(node.expansion)}">${escapeHtml(node.abbr)}</abbr>`;
        case 'footnote':
            return node.id
                ? `<sup class="footnote-ref"><a href="#fn-${node.id}">${escapeHtml(node.id)}</a></sup>`
                : '';
        case 'soft-break':
            return '\n';
        case 'hard-break':
            return '<br>\n';
        case 'critic-insert':
            return `<ins>${renderInlines(node.children, opts)}</ins>`;
        case 'critic-delete':
            return `<del>${renderInlines(node.children, opts)}</del>`;
        case 'critic-substitute':
            return `<del>${escapeHtml(node.oldText)}</del><ins>${escapeHtml(node.newText)}</ins>`;
        case 'critic-highlight':
            return `<mark>${renderInlines(node.children, opts)}</mark>`;
        case 'critic-comment':
            return `<span class="critic-comment">${escapeHtml(node.text)}</span>`;
        case 'crossref':
            return `&lt;/#${escapeHtml(node.target)}&gt;`;
        default: {
            const t = node;
            throw new Error(`renderHtml: unknown inline ${t.type}`);
        }
    }
}
function renderExtension(name, content, opts) {
    const inner = renderInlines(content, opts);
    // Handle common semantic shorthands
    const semanticTags = new Set(['kbd', 'dfn', 'abbr', 'cite', 'samp', 'var', 'code', 'mark', 'time']);
    if (semanticTags.has(name)) {
        return `<${name}>${inner}</${name}>`;
    }
    return `<span class="ext-${name}">${inner}</span>`;
}
// ============================================================================
// Escaping
// ============================================================================
const HTML_ESCAPE = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
};
function escapeHtml(s) {
    return s.replace(/[&<>]/g, (c) => HTML_ESCAPE[c]);
}
function escapeAttr(s) {
    return s.replace(/[&<>"]/g, (c) => (c === '"' ? '&quot;' : HTML_ESCAPE[c]));
}
//# sourceMappingURL=render-html.js.map