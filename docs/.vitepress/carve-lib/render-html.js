/*
 * HTML renderer — emits the canonical output the spec corpus expects.
 *
 * Output style: minimal indentation, block elements on their own line,
 * inline content stays flat within block element. Nested block
 * structures (table, blockquote, figure, admonition) get two-space
 * indented children for readability.
 */
/** Dangerous URL schemes blocked by default on links/images (denylist). */
const DANGEROUS_URL_SCHEMES = ['javascript', 'vbscript', 'data', 'file'];
/**
 * Neutralize a dangerous URL on a link `href` or image `src`, defeating
 * `javascript:` / `data:` style injection.
 *
 * Default policy is a DENYLIST: a URL whose scheme is `javascript`,
 * `vbscript`, `data`, or `file` collapses to an empty string (link text /
 * image alt still shows, element inert); every other scheme and any
 * scheme-less URL (relative, query, fragment, protocol-relative `//host`)
 * passes. Pass `allowedUrlSchemes` to switch to a strict ALLOWLIST instead;
 * pass `deniedUrlSchemes` to customize the denylist.
 *
 * Scheme detection ignores leading C0 control characters and whitespace,
 * which browsers strip before parsing a scheme - so `\tjavascript:` and
 * ` javascript:` are caught, not bypassed. The returned value is still
 * passed through `escapeAttr` by the caller.
 */
function sanitizeUrl(url, opts) {
    if (opts.sanitizeUrls === false)
        return url;
    // Browsers ignore C0 controls and whitespace when reading the scheme;
    // strip them for detection so obfuscated schemes can't slip through.
    const probe = url.replace(/[\u0000-\u0020]/g, '');
    const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe);
    if (!scheme)
        return url;
    const s = scheme[1].toLowerCase();
    // Explicit allowlist (opt-in): only the listed schemes pass.
    if (opts.allowedUrlSchemes) {
        return opts.allowedUrlSchemes.some((a) => a.toLowerCase() === s) ? url : '';
    }
    // Default: denylist of dangerous schemes.
    const denied = opts.deniedUrlSchemes ?? DANGEROUS_URL_SCHEMES;
    return denied.some((d) => d.toLowerCase() === s) ? '' : url;
}
/** HTML-injection sink attributes that are unsafe regardless of value. Event
 *  handlers (`on*`) and these are stripped from ALL rendered attributes, always
 *  - there is no legitimate use in a content-markup document. */
const DANGEROUS_ATTR_NAMES = new Set(['srcdoc', 'formaction']);
function isDangerousAttrName(name) {
    const n = name.toLowerCase();
    return n.startsWith('on') || DANGEROUS_ATTR_NAMES.has(n);
}
const HTML_ATTR_NAME_RE = /^[A-Za-z_:][A-Za-z0-9_.:-]*$/;
/** URL schemes that must never appear in an attribute value. */
const DANGEROUS_VALUE_SCHEMES = new Set(['javascript', 'vbscript', 'data', 'file']);
/**
 * Blank an attribute value that carries a dangerous URL scheme or a CSS
 * `expression(...)`, so an author cannot smuggle script through an attribute
 * the name filter allows (e.g. `background`, `style`). The scheme is
 * normalized (C0 controls + spaces stripped) before comparison to defeat
 * `java\tscript:` style evasion, matching the link/image URL sanitizer.
 */
function sanitizeAttrValue(name, value) {
    const colon = value.indexOf(':');
    if (colon !== -1) {
        const scheme = value.slice(0, colon).replace(/[\u0000-\u0020]+/g, '').toLowerCase();
        if (DANGEROUS_VALUE_SCHEMES.has(scheme))
            return '';
    }
    if (name.toLowerCase() === 'style' && hasDangerousCss(value))
        return '';
    return value;
}
/** Detect script-bearing / fetching constructs in a CSS `style` value. Blanks
 *  the whole value rather than attempting CSS surgery: `expression()` (legacy
 *  IE script), `url(...)` (can fetch or carry `javascript:`), `@import`, and
 *  the legacy `behavior` / `-moz-binding` script bindings. Whitespace is
 *  collapsed first so `expr ession (` cannot evade. */
function hasDangerousCss(value) {
    // Decode CSS escapes BEFORE lowercasing: an escaped uppercase code point
    // (e.g. `\55` -> `U`) must fold to lowercase too, or `\55rl(` would slip past
    // the lowercase needles.
    const compact = decodeCssEscapes(value.replace(/\/\*[\s\S]*?\*\//g, ''))
        .toLowerCase()
        .replace(/\s+/g, '');
    return (compact.includes('expression(') ||
        compact.includes('url(') ||
        compact.includes('@import') ||
        compact.includes('behavior:') ||
        compact.includes('-moz-binding'));
}
function decodeCssEscapes(value) {
    return value.replace(/\\([0-9a-f]{1,6}\s?|[\s\S])/gi, (_m, esc) => {
        if (/^[0-9a-f]/i.test(esc)) {
            const hex = esc.trim();
            const cp = Number.parseInt(hex, 16);
            return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
        }
        return esc;
    });
}
/** Inject `data-source-line` into the first opening tag of a rendered block. */
function withSourceLine(html, line) {
    if (line === undefined)
        return html;
    return html.replace(/^(\s*<[A-Za-z][A-Za-z0-9]*)/, `$1 data-source-line="${line}"`);
}
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
            // `!== undefined` so an explicit empty `id=""` renders `id=""` on the
            // <section> (it already suppressed the auto-slug in resolveHeadingIds).
            const sectionId = id !== undefined ? ` id="${escapeAttr(id)}"` : '';
            out.push(`${indent(depth)}<section${sectionId}>`);
            sectionStack.push(node.level);
            // An extension may render the <h*> element itself (e.g. heading
            // permalinks); the <section> wrapper above stays core. Returns undefined
            // to fall through to the default heading rendering.
            const custom = renderHeadingElement(node, opts, depth + 1);
            if (custom !== undefined) {
                out.push(opts.sourceLine ? withSourceLine(custom, node.pos?.startLine) : custom);
                continue;
            }
            const headingAttrs = stripId(node.attrs);
            const inner = renderInlines(node.children, opts);
            const slAttr = opts.sourceLine && node.pos ? ` data-source-line="${node.pos.startLine}"` : '';
            out.push(`${indent(depth + 1)}<h${node.level}${slAttr}${renderAttrs(headingAttrs)}>${inner}</h${node.level}>`);
            continue;
        }
        let rendered = renderBlock(node, opts, sectionStack.length);
        // Raw HTML blocks emit author markup verbatim, so there is no reliable
        // opening tag to annotate; leave them untouched.
        if (opts.sourceLine && node.type !== 'raw-block') {
            rendered = withSourceLine(rendered, node.pos?.startLine);
        }
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
    const seen = {};
    const labelIndexes = new Map();
    const onNode = (n) => {
        if (n.type !== 'footnote')
            return;
        // Inline footnote (`^[content]`): always a fresh, anonymous number.
        if (n.inline) {
            const number = order.length + 1;
            const refId = `fnref${number}`;
            order.push({ inline: n.inline, backrefs: [refId] });
            n.number = number;
            n.refId = refId;
            return;
        }
        // Reference footnote (`[^label]`): numbered at first resolved reference.
        if (!n.id || !defs[n.id])
            return;
        let idx = labelIndexes.get(n.id);
        if (idx === undefined) {
            order.push({ label: n.id, backrefs: [] });
            idx = order.length - 1;
            labelIndexes.set(n.id, idx);
        }
        const number = idx + 1;
        const occ = (seen[n.id] = (seen[n.id] ?? 0) + 1);
        const refId = occ === 1 ? `fnref${number}` : `fnref${number}-${occ}`;
        n.number = number;
        n.refId = refId;
        order[idx].backrefs.push(refId);
    };
    for (const b of ast.children)
        walkBlockInlines(b, (xs) => visitInlineTree(xs, onNode));
    // Reference bodies may cite further reference footnotes; walk them in
    // discovery order (the queue grows as onNode appends entries). Inline-note
    // content lives in `.inline`, which visitInlineTree does not descend, so it
    // is never walked for footnotes (design §3.1: no footnotes inside notes).
    for (let k = 0; k < order.length; k++) {
        const label = order[k].label;
        if (label === undefined)
            continue;
        for (const b of defs[label] ?? [])
            walkBlockInlines(b, (xs) => visitInlineTree(xs, onNode));
    }
    return { order };
}
/**
 * Endnotes section, djot-compatible roles. The backlink glyph is the
 * plain return arrow `↩` (Carve's choice; djot appends a variation
 * selector). Indentation follows Carve's house style.
 */
function renderFootnoteSection(ast, st, opts) {
    const defs = ast.footnoteDefs ?? {};
    const lines = ['<section role="doc-endnotes">', `${indent(1)}<hr>`, `${indent(1)}<ol>`];
    st.order.forEach((entry, idx) => {
        const number = idx + 1;
        const body = entry.inline
            ? [`${indent(3)}<p>${renderInlines(entry.inline, opts)}</p>`]
            : (defs[entry.label] ?? []).map((b) => renderBlock(b, opts, 3));
        // A note referenced once gets a plain `↩`; a note referenced N>1 times gets
        // one numbered backlink per reference (`↩<sup>k</sup>`, space-separated) so
        // each return arrow is distinct (matches carve-php + pandoc).
        const multiRef = entry.backrefs.length > 1;
        const blink = entry.backrefs
            .map((rid, k) => `<a href="#${rid}" role="doc-backlink">↩${multiRef ? `<sup>${k + 1}</sup>` : ''}</a>`)
            .join(multiRef ? ' ' : '');
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
    if (!attrs?.keyValues)
        return attrs;
    // HTML attribute names are case-insensitive, so a `{HREF=...}` override
    // must be dropped just like `{href=...}` - otherwise it slips past the
    // structural-URL sanitization as a second, unsanitized attribute.
    const lower = key.toLowerCase();
    const matches = (k) => k.toLowerCase() === lower;
    if (!Object.keys(attrs.keyValues).some(matches))
        return attrs;
    const kv = {};
    for (const [k, v] of Object.entries(attrs.keyValues))
        if (!matches(k))
            kv[k] = v;
    const result = { ...attrs, keyValues: kv };
    if (attrs.order)
        result.order = attrs.order.filter((s) => !matches(s));
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
        ? `class="${attrs.classes.map(escapeAttr).join(' ')}"`
        : '';
    // Escape the id value: an `#id` is identifier-restricted (escaping is a
    // no-op), but `id=value` (which now also feeds this slot, last-wins §15) can
    // carry arbitrary quoted text and must not inject markup.
    // `!== undefined`, not truthiness: an explicit `id=""` is a real (empty) id
    // and must render `id=""` (matches carve-php), the same last-wins slot as
    // `#id`/`id=value`. Escape the value: `#id` is identifier-restricted (escape
    // is a no-op), but `id=value` can carry arbitrary quoted text.
    const idAttr = () => (attrs.id !== undefined ? `id="${escapeAttr(attrs.id)}"` : '');
    const kvAttr = (k) => {
        // Always strip event-handler / injection-sink attribute names, and blank a
        // dangerous-scheme or CSS-expression value, regardless of render options.
        if (isDangerousAttrName(k))
            return '';
        if (!HTML_ATTR_NAME_RE.test(k))
            return '';
        const v = attrs.keyValues?.[k];
        return v !== undefined ? `${k}="${escapeAttr(sanitizeAttrValue(k, v))}"` : '';
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
// Let an extension render a top-level heading's <h*> element via a
// `blockRenderers.heading` renderer (the <section> wrapper stays core), tried
// in registration order like other block renderers. Returns undefined when no
// extension claims it, so core renders the default heading.
function renderHeadingElement(node, opts, level) {
    const headingRenderers = opts.extensions?.flatMap((e) => {
        const fn = e.blockRenderers?.heading;
        return fn ? [fn] : [];
    });
    if (!headingRenderers || !headingRenderers.length)
        return undefined;
    const ctx = {
        level,
        indent,
        renderChildren: (nodes, lvl) => nodes.map((c) => renderBlock(c, opts, lvl)).join('\n'),
        renderInlines: (nodes) => renderInlines(nodes, opts),
        escapeHtml,
        escapeAttr,
        renderAttrs,
    };
    for (const r of headingRenderers) {
        const out = r(node, ctx);
        if (out !== undefined)
            return out;
    }
    return undefined;
}
function renderBlock(node, opts, level) {
    const pad = indent(level);
    // Extension block renderers (keyed by node type) get first claim, tried in
    // registration order: each may return undefined to defer to the next
    // extension's renderer (so one extension can claim only some nodes of a
    // type, e.g. mermaid claims only `mermaid` code blocks), then to core.
    // Headings are excluded here: a top-level heading is rendered by the
    // section-wrapping pass (renderHeadingElement), where the id lives on the
    // <section>. A heading nested in a container keeps its id on the <h*> and is
    // rendered by core below, so heading renderers do not apply to it.
    const blockRenderers = node.type === 'heading'
        ? undefined
        : opts.extensions?.flatMap((e) => {
            const fn = e.blockRenderers?.[node.type];
            return fn ? [fn] : [];
        });
    if (blockRenderers && blockRenderers.length) {
        const ctx = {
            level,
            indent,
            renderChildren: (nodes, lvl) => nodes.map((c) => renderBlock(c, opts, lvl)).join('\n'),
            renderInlines: (nodes) => renderInlines(nodes, opts),
            escapeHtml,
            escapeAttr,
            renderAttrs,
        };
        for (const r of blockRenderers) {
            const out = r(node, ctx);
            if (out !== undefined)
                return out;
        }
    }
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
            // The opener "header" is resolved to a `title` attribute at parse time
            // (see parseBlocks), so it renders here AND wherever else a code block is
            // emitted (e.g. inside a code-group).
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
            const lines = [`${pad}<dl${renderAttrs(node.attrs)}>`];
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
            // Raw HTML passthrough; escape it instead when raw HTML is disabled
            // (untrusted input). Non-HTML raw formats are always dropped.
            return node.format === 'html'
                ? opts.allowRawHtml === false
                    ? escapeHtml(node.content)
                    : node.content
                : '';
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
    // `isLead` is the item's FIRST paragraph. In a tight item only the lead
    // paragraph is unwrapped (it sits on the <li> line); a SUBSEQUENT paragraph
    // -- e.g. one attached via `+` after the lead -- still renders as a real <p>
    // even though the list is tight (Bug B; carve-php parity).
    const wrapPara = (p, isLead) => {
        const inner = renderInlines(p.children, opts);
        // Tight items normally omit the <p> on the lead paragraph, but a paragraph
        // carrying its own attributes (e.g. a leading block-attribute line, §15)
        // must keep the <p> so the attributes survive.
        if (tight && isLead && !p.attrs)
            return inner;
        return `<p${renderAttrs(p.attrs)}>${inner}</p>`;
    };
    // Single paragraph: stays on the <li> line. Tight omits <p>, loose keeps it.
    if (item.children.length === 1 && item.children[0].type === 'paragraph') {
        return `${pad}<li${renderAttrs(item.attrs)}>${checkbox}${wrapPara(item.children[0], true)}</li>`;
    }
    // Mixed content (e.g. a lead paragraph followed by a nested list): the
    // first paragraph sits on the <li> line; remaining blocks go below,
    // indented one level deeper, with the closing </li> back at item indent.
    let head = `${pad}<li${renderAttrs(item.attrs)}>${checkbox}`;
    const body = [];
    // A paragraph that immediately follows the lead paragraph (a consecutive
    // run from index 0, e.g. a `+`-attached second paragraph -- Bug B) renders as
    // a real <p> even in a tight item, matching carve-php. Once a non-paragraph
    // block appears, the lead run ends and later paragraphs fall back to the
    // tight unwrapped form -- this leaves the DEFERRED "plain text after a
    // block-in-item" family (`- item` / `+` / fence / tail) unchanged.
    let inLeadRun = true;
    item.children.forEach((child, i) => {
        if (child.type === 'paragraph') {
            const rendered = wrapPara(child, i === 0 || !inLeadRun);
            if (i === 0)
                head += rendered;
            else
                body.push(`${indent(level + 1)}${rendered}`);
        }
        else {
            inLeadRun = false;
            // Skip blocks that render to nothing (a comment, an abbreviation def, a
            // non-HTML raw block): pushing `''` would leave stray blank lines inside
            // the <li> (`<p>a</p>\n\n  </li>`). Matches carve-rs.
            const rendered = renderBlock(child, opts, level + 1);
            if (rendered !== '')
                body.push(rendered);
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
    // Per column, the last row index (above the current one) whose cell is not
    // skipped. This is exactly what the previous `while (grid[up][c].skip) up--`
    // scan found, but maintained incrementally so a '^' resolves in O(1) instead
    // of walking up every prior row (an all-'^' table was O(rows^2)).
    const lastNonSkip = [];
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const entry = grid[r][c];
            if (entry.skip)
                continue;
            if (entry.cell.span === 'rowspan' && r > 0) {
                const up = lastNonSkip[c];
                const src = up !== undefined ? grid[up]?.[c] : undefined;
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
            // A cell that ends up non-skipped becomes the nearest source for the
            // cells below it in this column.
            if (!entry.skip)
                lastNonSkip[c] = r;
        }
    }
    // Detect header section: leading consecutive rows where all cells are headers
    let headerEnd = 0;
    while (headerEnd < grid.length &&
        grid[headerEnd].some((e) => !e.skip) &&
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
/**
 * Drop author cell attributes that collide with a structural attribute this
 * renderer ACTUALLY emits for the cell (a computed `rowspan` / `colspan` /
 * `style` from `^`/`<` markers or column alignment) -- the computed value is
 * authoritative, so an author copy would duplicate it. Comparison is
 * case-insensitive (HTML attribute names are). When no structural attribute is
 * emitted, the author's value (e.g. a custom `style`) is preserved.
 */
function stripStructuralAttrs(attrs, emitted) {
    if (!attrs?.keyValues || emitted.size === 0)
        return attrs;
    const collides = (k) => emitted.has(k.toLowerCase());
    if (!Object.keys(attrs.keyValues).some(collides))
        return attrs;
    const keyValues = Object.fromEntries(Object.entries(attrs.keyValues).filter(([k]) => !collides(k)));
    const out = { ...attrs, keyValues };
    if (attrs.order)
        out.order = attrs.order.filter((s) => !collides(s));
    return out;
}
function renderTableRowFlat(cells, opts) {
    // A row attribute block (`| … |{.x}`) lives on the TableRow, shared by every
    // grid entry in this row.
    const parts = [`<tr${renderAttrs(cells[0]?.row.attrs)}>`];
    for (const entry of cells) {
        if (entry.skip)
            continue;
        const tag = entry.cell.header ? 'th' : 'td';
        const attrs = [];
        const emitted = new Set();
        if (entry.rowspan > 1) {
            attrs.push(`rowspan="${entry.rowspan}"`);
            emitted.add('rowspan');
        }
        if (entry.colspan > 1) {
            attrs.push(`colspan="${entry.colspan}"`);
            emitted.add('colspan');
        }
        if (entry.align) {
            attrs.push(`style="text-align: ${entry.align};"`);
            emitted.add('style');
        }
        // Author cell attributes (a `{...}` glued to the opening pipe) come first,
        // then the structural span / alignment attributes; any author copy of a
        // structural key actually emitted here is dropped to avoid a duplicate.
        const attrStr = renderAttrs(stripStructuralAttrs(entry.cell.attrs, emitted)) +
            (attrs.length ? ' ' + attrs.join(' ') : '');
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
    const classValue = [baseClass, ...(node.attrs?.classes ?? [])].map(escapeAttr).join(' ');
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
    return `${pad}<${tag} class="${classValue}"${rest}>\n${titleLine}${body}\n${pad}</${tag}>`;
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
    else if (node.target.type === 'code-block' || node.target.type === 'paragraph') {
        inner = renderBlock(node.target, opts, level + 1);
    }
    else {
        inner = renderTable(node.target, opts, level + 1);
    }
    return `${pad}<figure${renderAttrs(node.attrs)}>\n${inner}\n${pad}  <figcaption>${renderInlines(node.caption, opts)}</figcaption>\n${pad}</figure>`;
}
function renderImage(img, opts) {
    const titleAttr = img.title !== undefined ? ` title="${escapeAttr(img.title)}"` : '';
    const src = escapeAttr(sanitizeUrl(img.src, opts));
    // The sanitized structural src wins; never re-emit an author-supplied
    // `src` from an attribute block, which would bypass sanitization.
    return `<img src="${src}" alt="${escapeAttr(img.alt)}"${titleAttr}${renderAttrs(stripKeyValue(img.attrs, 'src'))}>`;
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
            return `<em${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</em>`;
        case 'strong':
            return `<strong${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</strong>`;
        case 'underline':
            return `<u${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</u>`;
        case 'strike':
            return `<s${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</s>`;
        case 'super':
            return `<sup${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</sup>`;
        case 'sub':
            return `<sub${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</sub>`;
        case 'highlight':
            return `<mark${renderAttrs(node.attrs)}>${renderInlines(node.children, opts)}</mark>`;
        case 'bold-italic':
            return `<strong${renderAttrs(node.attrs)}><em>${renderInlines(node.children, opts)}</em></strong>`;
        case 'code':
            return `<code${renderAttrs(node.attrs)}>${escapeHtml(node.value)}</code>`;
        case 'link': {
            const titleAttr = node.title !== undefined ? ` title="${escapeAttr(node.title)}"` : '';
            const href = escapeAttr(sanitizeUrl(node.href, opts));
            // The sanitized structural href wins; never re-emit an author-supplied
            // `href` from an attribute block, which would bypass sanitization.
            return `<a href="${href}"${titleAttr}${renderAttrs(stripKeyValue(node.attrs, 'href'))}>${renderInlines(node.children, opts)}</a>`;
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
            // Escape it instead when raw HTML is disabled (untrusted input).
            return node.format === 'html'
                ? opts.allowRawHtml === false
                    ? escapeHtml(node.content)
                    : node.content
                : '';
        case 'emoji':
            return opts.emoji?.[node.name] ?? escapeHtml(`:${node.name}:`);
        case 'autolink': {
            const display = node.href.startsWith('mailto:') ? node.href.slice(7) : node.href;
            // The structural href always wins; never re-emit an author-supplied
            // `href` from an attribute block (it would duplicate the attribute).
            const href = escapeAttr(sanitizeUrl(node.href, opts));
            return `<a href="${href}"${renderAttrs(stripKeyValue(node.attrs, 'href'))}>${escapeHtml(display)}</a>`;
        }
        case 'mention': {
            const text = `@${escapeHtml(node.user)}`;
            if (!opts.mentionUrl)
                return `<span class="mention"><strong>${text}</strong></span>`;
            // Canonical placeholder is `{name}` (matching tags and carve-php);
            // `{user}` stays as a legacy alias.
            const enc = encodeURIComponent(node.user);
            const href = sanitizeUrl(opts.mentionUrl.replaceAll('{name}', enc).replaceAll('{user}', enc), opts);
            return `<a class="mention" href="${escapeAttr(href)}">${text}</a>`;
        }
        case 'tag': {
            const text = `#${escapeHtml(node.name)}`;
            if (!opts.tagUrl)
                return `<span class="tag"><strong>${text}</strong></span>`;
            const href = sanitizeUrl(opts.tagUrl.replaceAll('{name}', encodeURIComponent(node.name)), opts);
            return `<a class="tag" href="${escapeAttr(href)}">${text}</a>`;
        }
        case 'extension': {
            const renderer = opts.extensions
                ?.flatMap((e) => (e.renderers ? [e.renderers] : []))
                .map((r) => r[node.name])
                .find((fn) => fn !== undefined);
            if (renderer) {
                const ctx = {
                    renderInlines: (nodes) => renderInlines(nodes, opts),
                    escapeHtml,
                    escapeAttr,
                    renderAttrs,
                };
                return renderer(node, ctx);
            }
            return renderExtension(node.name, node.content, node.attrs, opts);
        }
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
        case 'critic-comment':
            return `<span class="critic-comment">${escapeHtml(node.text)}</span>`;
        case 'crossref':
            return `&lt;/#${escapeHtml(node.target)}&gt;`;
        case 'caption-number':
            // Filled by resolve(); an unresolved placeholder renders empty.
            return node.n === undefined ? '' : String(node.n);
        case 'citation-group': {
            // Extension-produced node: delegate to registered inline renderers in
            // order; each may return undefined to defer to the next (mirrors the
            // block-renderer dispatch). Fall back to the verbatim source.
            const inlineRenderers = opts.extensions?.flatMap((e) => {
                const fn = e.inlineRenderers?.[node.type];
                return fn ? [fn] : [];
            });
            if (inlineRenderers && inlineRenderers.length) {
                const ctx = {
                    renderInlines: (nodes) => renderInlines(nodes, opts),
                    escapeHtml,
                    escapeAttr,
                    renderAttrs,
                };
                for (const r of inlineRenderers) {
                    const out = r(node, ctx);
                    if (out !== undefined)
                        return out;
                }
            }
            return escapeHtml(node.raw);
        }
        case 'comment':
            // Comments are not rendered (§4.13); inline form mirrors the block one.
            return '';
        default: {
            const t = node;
            throw new Error(`renderHtml: unknown inline ${t.type}`);
        }
    }
}
function renderExtension(name, content, attrs, opts) {
    const inner = renderInlines(content, opts);
    // Author attributes on the extension (grammar §415 `extension_inline …
    // [attributes]`) attach to its output element, e.g. `:kbd[x]{.foo}`.
    // Handle common semantic shorthands
    const semanticTags = new Set(['kbd', 'dfn', 'abbr', 'cite', 'samp', 'var', 'code', 'mark', 'time']);
    if (semanticTags.has(name)) {
        return `<${name}${renderAttrs2(attrs)}>${inner}</${name}>`;
    }
    return `<span${renderAttrs2(attrs, { baseClass: `ext-${name}` })}>${inner}</span>`;
}
// ============================================================================
// Escaping
// ============================================================================
const HTML_ESCAPE = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\u00a0': '&nbsp;',
    // Internal non-breaking-space placeholder (line-block indent / escaped space).
    '\ue000': '&nbsp;',
};
function escapeHtml(s) {
    return s.replace(/[&<>\u00a0\ue000]/g, (c) => HTML_ESCAPE[c]);
}
function escapeAttr(s) {
    return s.replace(/[&<>"']/g, (c) => c === '"' ? '&quot;' : c === "'" ? '&apos;' : HTML_ESCAPE[c]);
}
//# sourceMappingURL=render-html.js.map