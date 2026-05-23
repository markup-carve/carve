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
    // Number footnote refs by document reference order before rendering.
    const footnotes = collectFootnotes(ast);
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
    if (footnotes.order.length)
        out.push(renderFootnoteSection(ast, footnotes, opts));
    return out.join('\n');
}
/** Visit every inline array under a block subtree (depth-first). */
function walkBlockInlines(node, visit) {
    switch (node.type) {
        case 'heading':
        case 'paragraph':
            visit(node.children);
            break;
        case 'blockquote':
            if (node.attribution)
                visit(node.attribution);
            node.children.forEach((c) => walkBlockInlines(c, visit));
            break;
        case 'list':
            for (const it of node.items)
                it.children.forEach((c) => walkBlockInlines(c, visit));
            break;
        case 'admonition':
            if (node.title)
                visit(node.title);
            node.children.forEach((c) => walkBlockInlines(c, visit));
            break;
        case 'div':
            node.children.forEach((c) => walkBlockInlines(c, visit));
            break;
        case 'definition-list':
            for (const it of node.items) {
                for (const t of it.terms)
                    visit(t);
                for (const d of it.definitions)
                    for (const b of d)
                        walkBlockInlines(b, visit);
            }
            break;
        case 'table':
            if (node.caption)
                visit(node.caption);
            for (const row of node.rows)
                for (const cell of row.cells)
                    visit(cell.children);
            break;
        case 'figure':
            visit(node.caption);
            if (node.target.type === 'blockquote' || node.target.type === 'table')
                walkBlockInlines(node.target, visit);
            break;
        default:
            break;
    }
}
function visitInlineTree(nodes, fn) {
    for (const n of nodes) {
        fn(n);
        const kids = n.children ??
            n.content;
        if (Array.isArray(kids))
            visitInlineTree(kids, fn);
    }
}
function collectFootnotes(ast) {
    const defs = ast.footnoteDefs ?? {};
    const order = [];
    const backrefs = {};
    const seen = {};
    const onNode = (n) => {
        if (n.type !== 'footnote' || !n.id || !defs[n.id])
            return;
        let idx = order.indexOf(n.id);
        if (idx === -1) {
            order.push(n.id);
            idx = order.length - 1;
            backrefs[n.id] = [];
        }
        const number = idx + 1;
        const occ = (seen[n.id] = (seen[n.id] ?? 0) + 1);
        const refId = occ === 1 ? `fnref${number}` : `fnref${number}-${occ}`;
        n.number = number;
        n.refId = refId;
        backrefs[n.id].push(refId);
    };
    for (const b of ast.children)
        walkBlockInlines(b, (xs) => visitInlineTree(xs, onNode));
    // Footnote bodies may reference further footnotes; walk referenced
    // bodies in discovery order (the queue grows as onNode appends labels).
    for (let k = 0; k < order.length; k++) {
        for (const b of defs[order[k]] ?? [])
            walkBlockInlines(b, (xs) => visitInlineTree(xs, onNode));
    }
    return { order, backrefs };
}
/**
 * Endnotes section, djot-compatible roles. The backlink glyph is the
 * plain return arrow `↩` (Carve's choice; djot appends a variation
 * selector). Indentation follows Carve's house style.
 */
function renderFootnoteSection(ast, st, opts) {
    const defs = ast.footnoteDefs ?? {};
    const lines = ['<section role="doc-endnotes">', `${indent(1)}<hr>`, `${indent(1)}<ol>`];
    st.order.forEach((label, idx) => {
        const number = idx + 1;
        const body = (defs[label] ?? []).map((b) => renderBlock(b, opts, 3));
        const blink = (st.backrefs[label] ?? [])
            .map((rid) => `<a href="#${rid}" role="doc-backlink">↩</a>`)
            .join('');
        const last = body.length - 1;
        if (last >= 0 && /<\/p>\s*$/.test(body[last])) {
            body[last] = body[last].replace(/<\/p>(\s*)$/, `${blink}</p>$1`);
        }
        else {
            body.push(`${indent(3)}<p>${blink}</p>`);
        }
        lines.push(`${indent(2)}<li id="fn${number}">`, ...body, `${indent(2)}</li>`);
    });
    lines.push(`${indent(1)}</ol>`, '</section>');
    return lines.join('\n');
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
/** Copy attrs without a given key-value (e.g. a structural `href`). */
function stripKeyValue(attrs, key) {
    if (!attrs?.keyValues || attrs.keyValues[key] === undefined)
        return attrs;
    const { [key]: _omit, ...kv } = attrs.keyValues;
    const result = { ...attrs, keyValues: kv };
    if (attrs.order)
        result.order = attrs.order.filter((s) => s !== key);
    return result;
}
function indent(level) {
    return '  '.repeat(level);
}
function renderAttrs(attrs) {
    if (!attrs)
        return '';
    const parts = [];
    const classAttr = () => attrs.classes && attrs.classes.length
        ? `class="${attrs.classes.join(' ')}"`
        : '';
    const idAttr = () => (attrs.id ? `id="${attrs.id}"` : '');
    const kvAttr = (k) => {
        const v = attrs.keyValues?.[k];
        return v !== undefined ? `${k}="${escapeAttr(v)}"` : '';
    };
    // Emit the recorded source order first (matches djot + carve-php),
    // then append any populated slot not covered by `order` -- so an attr
    // added programmatically after parse() (with stale/no `order`) still
    // renders rather than being silently dropped.
    const seen = new Set(attrs.order ?? []);
    if (attrs.order) {
        for (const slot of attrs.order) {
            const p = slot === '.class' ? classAttr() : slot === '#id' ? idAttr() : kvAttr(slot);
            if (p)
                parts.push(p);
        }
    }
    if (!seen.has('.class')) {
        const c = classAttr();
        if (c)
            parts.push(c);
    }
    if (!seen.has('#id')) {
        const i = idAttr();
        if (i)
            parts.push(i);
    }
    if (attrs.keyValues) {
        for (const k of Object.keys(attrs.keyValues)) {
            if (!seen.has(k)) {
                const p = kvAttr(k);
                if (p)
                    parts.push(p);
            }
        }
    }
    return parts.length ? ' ' + parts.join(' ') : '';
}
/**
 * Like renderAttrs, but merges a mandatory `baseClass` ahead of author
 * classes (math keeps `math inline` while honoring `{.foo}`), and can
 * drop the author id when a structural id already exists (footnote refs).
 * With no attrs and no baseClass it returns '' — unchanged output.
 */
function renderAttrs2(attrs, opts = {}) {
    if (!attrs && !opts.baseClass)
        return '';
    // Build a synthetic Attrs and delegate to renderAttrs so author
    // attributes still emit in source order (PART 10 §1): merge a
    // mandatory base class ahead of author classes (math keeps
    // `math inline` while honoring `{.foo}`), and optionally drop the
    // author id when a structural id already exists (footnote refs).
    const a = attrs ? { ...attrs } : {};
    if (opts.baseClass) {
        a.classes = [opts.baseClass, ...(a.classes ?? [])];
        if (a.order && !a.order.includes('.class'))
            a.order = ['.class', ...a.order];
    }
    if (opts.dropId) {
        delete a.id;
        if (a.order)
            a.order = a.order.filter((s) => s !== '#id');
    }
    return renderAttrs(a);
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
            return `${pad}<hr${renderAttrs(node.attrs)}>`;
        case 'code-block': {
            const langAttr = node.lang ? ` class="language-${node.lang}"` : '';
            const escaped = escapeHtml(node.content);
            return `${pad}<pre${renderAttrs(node.attrs)}><code${langAttr}>${escaped}\n</code></pre>`;
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
        case 'div': {
            const open = `${pad}<div${renderAttrs(node.attrs)}>`;
            if (node.children.length === 0)
                return `${open}\n${pad}</div>`;
            const body = node.children.map((c) => renderBlock(c, opts, level + 1)).join('\n');
            return `${open}\n${body}\n${pad}</div>`;
        }
        case 'definition-list': {
            const lines = [`${pad}<dl>`];
            for (const it of node.items) {
                for (const t of it.terms)
                    lines.push(`${pad}  <dt>${renderInlines(t, opts)}</dt>`);
                for (const d of it.definitions) {
                    if (d.length === 1 && d[0].type === 'paragraph') {
                        lines.push(`${pad}  <dd>${renderInlines(d[0].children, opts)}</dd>`);
                    }
                    else {
                        const body = d.map((b) => renderBlock(b, opts, level + 2)).join('\n');
                        lines.push(`${pad}  <dd>\n${body}\n${pad}  </dd>`);
                    }
                }
            }
            lines.push(`${pad}</dl>`);
            return lines.join('\n');
        }
        case 'figure':
            return renderFigure(node, opts, level);
        case 'abbreviation-def':
            return '';
        case 'raw-block':
            return node.format === 'html' ? node.content : '';
        case 'comment':
            // Comments are not rendered (§4.13).
            return '';
        default: {
            const t = node;
            throw new Error(`renderHtml: unknown block ${t.type}`);
        }
    }
}
function renderBlockQuote(node, opts, level) {
    const pad = indent(level);
    const attrs = renderAttrs(node.attrs);
    if (node.children.length === 1 && node.children[0].type === 'paragraph') {
        const para = node.children[0];
        const inner = renderInlines(para.children, opts);
        return `${pad}<blockquote${attrs}><p${renderAttrs(para.attrs)}>${inner}</p></blockquote>`;
    }
    const inner = node.children.map((c) => renderBlock(c, opts, level + 1)).join('\n');
    return `${pad}<blockquote${attrs}>\n${inner}\n${pad}</blockquote>`;
}
function renderList(node, opts, level) {
    const pad = indent(level);
    const tag = node.ordered ? 'ol' : 'ul';
    // An ordered list emits `type` for alpha/roman dialects and `start` when
    // it begins at n != 1 (the `)` vs `.` delimiter affects list-splitting,
    // not the rendered <ol>).
    const typeAttr = node.ordered && node.olType ? ` type="${node.olType}"` : '';
    const startAttr = node.ordered && node.start !== undefined && node.start !== 1
        ? ` start="${node.start}"`
        : '';
    const items = node.items
        .map((it) => renderListItem(it, opts, level + 1, node.tight))
        .join('\n');
    return `${pad}<${tag}${typeAttr}${startAttr}${renderAttrs(node.attrs)}>\n${items}\n${pad}</${tag}>`;
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
        // Tight items normally omit the <p>, but a paragraph carrying its
        // own attributes (e.g. a leading block-attribute line, §15) must
        // keep the <p> so the attributes survive.
        if (tight && !p.attrs)
            return inner;
        return `<p${renderAttrs(p.attrs)}>${inner}</p>`;
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
    const lines = [`${pad}<table${renderAttrs(node.attrs)}>`];
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
/**
 * The eight canonical admonition types (grammar PART 9 §12, Tier 1).
 * These render as a semantic `<aside class="admonition {type}">`; any
 * other type is a Tier-2 generic `<div class="{type}">`.
 */
const CANONICAL_ADMONITIONS = new Set([
    'note',
    'tip',
    'warning',
    'danger',
    'info',
    'success',
    'example',
    'quote',
]);
function renderAdmonition(node, opts, level) {
    const pad = indent(level);
    // `node.title` undefined => no title supplied; an empty-but-defined
    // title (`::: note ""`) still emits an (empty) title element.
    const titleLine = node.title !== undefined
        ? `${pad}  <p class="admonition-title">${renderInlines(node.title, opts)}</p>\n`
        : '';
    const body = node.children.map((c) => renderBlock(c, opts, level + 1)).join('\n');
    // Leading block attributes (§15) merge with the admonition's own
    // wrapper class: extra classes append, id/key attach to the wrapper.
    const canonical = CANONICAL_ADMONITIONS.has(node.kind);
    const baseClass = canonical ? `admonition ${node.kind}` : node.kind;
    const extraClasses = node.attrs?.classes?.length
        ? ' ' + node.attrs.classes.join(' ')
        : '';
    const restAttrs = {};
    if (node.attrs?.id !== undefined)
        restAttrs.id = node.attrs.id;
    if (node.attrs?.keyValues)
        restAttrs.keyValues = node.attrs.keyValues;
    // The class is structurally first (`admonition {type}`); the id/key
    // attrs after it keep their source order (order minus the class slot).
    if (node.attrs?.order)
        restAttrs.order = node.attrs.order.filter((s) => s !== '.class');
    const rest = renderAttrs(restAttrs);
    const tag = canonical ? 'aside' : 'div';
    return `${pad}<${tag} class="${baseClass}${extraClasses}"${rest}>\n${titleLine}${body}\n${pad}</${tag}>`;
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
    return `${pad}<figure${renderAttrs(node.attrs)}>\n${inner}\n${pad}  <figcaption>${renderInlines(node.caption, opts)}</figcaption>\n${pad}</figure>`;
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
        case 'span':
            return `<span${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</span>`;
        case 'math': {
            const base = node.display ? 'math display' : 'math inline';
            const body = node.display
                ? `\\[${escapeHtml(node.content)}\\]`
                : `\\(${escapeHtml(node.content)}\\)`;
            return `<span${renderAttrs2(node.attrs, { baseClass: base })}>${body}</span>`;
        }
        case 'raw-inline':
            // Verbatim only when the format matches this output; else dropped.
            return node.format === 'html' ? node.content : '';
        case 'emoji':
            return opts.emoji?.[node.name] ?? escapeHtml(`:${node.name}:`);
        case 'autolink': {
            const display = node.href.startsWith('mailto:') ? node.href.slice(7) : node.href;
            // The structural href always wins; never re-emit an author-supplied
            // `href` from an attribute block (it would duplicate the attribute).
            return `<a href="${escapeAttr(node.href)}"${renderAttrs(stripKeyValue(node.attrs, 'href'))}>${escapeHtml(display)}</a>`;
        }
        case 'mention': {
            const text = `@${escapeHtml(node.user)}`;
            if (!opts.mentionUrl)
                return `<span class="mention"><strong>${text}</strong></span>`;
            const href = opts.mentionUrl.replaceAll('{user}', encodeURIComponent(node.user));
            return `<a class="mention" href="${escapeAttr(href)}">${text}</a>`;
        }
        case 'tag': {
            const text = `#${escapeHtml(node.name)}`;
            if (!opts.tagUrl)
                return `<span class="tag"><strong>${text}</strong></span>`;
            const href = opts.tagUrl.replaceAll('{name}', encodeURIComponent(node.name));
            return `<a class="tag" href="${escapeAttr(href)}">${text}</a>`;
        }
        case 'extension':
            return renderExtension(node.name, node.content, opts);
        case 'abbreviation':
            return `<abbr title="${escapeAttr(node.expansion)}">${escapeHtml(node.abbr)}</abbr>`;
        case 'footnote':
            // number is assigned by collectFootnotes for refs with a matching
            // definition; an unresolved ref falls back to literal source.
            return node.number === undefined
                ? escapeHtml(`[^${node.id ?? ''}]`)
                : `<a id="${node.refId}" href="#fn${node.number}" role="doc-noteref"${renderAttrs2(node.attrs, { dropId: true })}><sup>${node.number}</sup></a>`;
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
    '\u00a0': '&nbsp;',
};
function escapeHtml(s) {
    return s.replace(/[&<>\u00a0]/g, (c) => HTML_ESCAPE[c]);
}
function escapeAttr(s) {
    return s.replace(/[&<>"']/g, (c) => c === '"' ? '&quot;' : c === "'" ? '&apos;' : HTML_ESCAPE[c]);
}
//# sourceMappingURL=render-html.js.map