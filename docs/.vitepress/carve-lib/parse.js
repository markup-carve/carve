/*
 * Carve parser — linear-time, block + inline.
 *
 * Block lexer reads line by line; inline parser does a single scan
 * over each block's text content. No backtracking.
 */
const RE_HEADING = /^(#{1,6})\s+(.+?)(?:\s+\{([^}\n]+)\})?\s*$/;
const RE_HR = /^-{3,}\s*$/;
const RE_FENCE = /^(\s*)(`{3,}|~{3,})\s*([a-zA-Z0-9_-]*)\s*$/;
const RE_UNORDERED = /^(\s*)[-*+]\s+(.*)$/;
const RE_ORDERED = /^(\s*)(\d+)\.\s+(.*)$/;
const RE_TASK = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/;
const RE_BLOCKQUOTE = /^>\s?(.*)$/;
const RE_ADMONITION_OPEN = /^:::\s*([a-zA-Z][\w-]*)\s*(.*)$/;
const RE_ADMONITION_CLOSE = /^:::\s*$/;
const RE_ABBR_DEF = /^\*\[([A-Z][A-Z0-9]*)\]:\s+(.+)$/;
const RE_CAPTION = /^\^\s+(.+)$/;
const RE_TABLE_ROW = /^\|/;
const RE_BARE_IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*(?:\{([^}]+)\})?\s*$/;
const RE_FRONTMATTER_FENCE = /^---\s*$/;
class Lexer {
    lines;
    pos = 0;
    frontmatter;
    abbrDefs = new Map();
    // True for sub-lexers over already-nested block content (list item /
    // blockquote / admonition bodies). The lone-marker paragraph-interruption
    // guard applies only at the document top level; inside nested content a
    // marker interrupts as before, so `- a\n  - b` (single nested child) still
    // nests. Mirrors djot-php #180's scoping (guard only on the top-level
    // paragraph path).
    nested = false;
    constructor(source) {
        this.lines = source.replace(/\r\n?/g, '\n').split('\n');
        // Drop trailing empty line introduced by terminal newline
        if (this.lines.length && this.lines[this.lines.length - 1] === '') {
            this.lines.pop();
        }
        this.consumeFrontmatter();
    }
    consumeFrontmatter() {
        if (this.lines.length < 2)
            return;
        if (!RE_FRONTMATTER_FENCE.test(this.lines[0]))
            return;
        for (let i = 1; i < this.lines.length; i++) {
            if (RE_FRONTMATTER_FENCE.test(this.lines[i])) {
                const yaml = this.lines.slice(1, i).join('\n');
                this.frontmatter = parseYaml(yaml);
                this.pos = i + 1;
                return;
            }
        }
    }
    peek(offset = 0) {
        return this.lines[this.pos + offset];
    }
    consume() {
        return this.lines[this.pos++];
    }
    eof() {
        return this.pos >= this.lines.length;
    }
}
export function parse(source, _opts = {}) {
    const lexer = new Lexer(source);
    // First pass: collect abbreviation definitions so they can be applied to inline text
    collectAbbrDefs(lexer);
    const children = parseBlocks(lexer, 0);
    const doc = { type: 'document', children };
    if (lexer.frontmatter)
        doc.frontmatter = lexer.frontmatter;
    return doc;
}
function collectAbbrDefs(lexer) {
    for (const line of lexer.lines) {
        const m = RE_ABBR_DEF.exec(line);
        if (m)
            lexer.abbrDefs.set(m[1], m[2]);
    }
}
function parseBlocks(lexer, baseIndent) {
    const out = [];
    while (!lexer.eof()) {
        const line = lexer.peek();
        if (line.trim() === '') {
            lexer.consume();
            continue;
        }
        // Stop at lower indent (caller's responsibility to detect this)
        const indent = leadingWhitespace(line);
        if (indent < baseIndent)
            break;
        const node = parseBlock(lexer);
        if (node)
            out.push(node);
    }
    return out;
}
function parseBlock(lexer) {
    const line = lexer.peek();
    // Block-level constructs in priority order
    if (RE_FENCE.test(line))
        return parseFence(lexer);
    if (RE_ADMONITION_OPEN.test(line) && !RE_ADMONITION_CLOSE.test(line))
        return parseAdmonition(lexer);
    if (RE_ABBR_DEF.test(line)) {
        return parseAbbrDef(lexer);
    }
    if (RE_HR.test(line.trim())) {
        lexer.consume();
        return { type: 'thematic-break' };
    }
    if (RE_HEADING.test(line))
        return parseHeading(lexer);
    if (RE_BLOCKQUOTE.test(line))
        return parseBlockQuote(lexer);
    if (RE_TASK.test(line) || RE_UNORDERED.test(line) || RE_ORDERED.test(line))
        return parseList(lexer);
    if (RE_TABLE_ROW.test(line))
        return parseTable(lexer);
    if (RE_BARE_IMAGE.test(line))
        return parseBlockImage(lexer);
    return parseParagraph(lexer);
}
function parseHeading(lexer) {
    const line = lexer.consume();
    const m = RE_HEADING.exec(line);
    const level = m[1].length;
    const text = m[2];
    const attrSrc = m[3];
    const node = {
        type: 'heading',
        level,
        children: parseInline(text, lexer.abbrDefs),
    };
    if (attrSrc)
        node.attrs = parseAttrs(attrSrc);
    return node;
}
function parseFence(lexer) {
    const open = lexer.consume();
    const m = RE_FENCE.exec(open);
    const indent = m[1].length;
    const marker = m[2];
    const lang = m[3] || undefined;
    const closeRe = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
    const lines = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (closeRe.test(ln) && ln.length - ln.trimStart().length <= 3) {
            lexer.consume();
            break;
        }
        lexer.consume();
        // Strip the common indent of the opening fence (Djot rule)
        lines.push(ln.slice(Math.min(indent, leadingWhitespace(ln))));
    }
    const cb = { type: 'code-block', content: lines.join('\n') };
    if (lang)
        cb.lang = lang;
    return cb;
}
function parseAdmonition(lexer) {
    const open = lexer.consume();
    const m = RE_ADMONITION_OPEN.exec(open);
    const kind = m[1];
    const titleText = m[2]?.trim();
    const inner = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (RE_ADMONITION_CLOSE.test(ln)) {
            lexer.consume();
            break;
        }
        lexer.consume();
        inner.push(ln);
    }
    const subLexer = new Lexer(inner.join('\n'));
    subLexer.abbrDefs = lexer.abbrDefs;
    subLexer.nested = true;
    const children = parseBlocks(subLexer, 0);
    const node = { type: 'admonition', kind, children };
    if (titleText)
        node.title = parseInline(titleText, lexer.abbrDefs);
    return node;
}
function parseAbbrDef(lexer) {
    const line = lexer.consume();
    const m = RE_ABBR_DEF.exec(line);
    return { type: 'abbreviation-def', abbr: m[1], expansion: m[2] };
}
function parseBlockQuote(lexer) {
    const inner = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        const m = RE_BLOCKQUOTE.exec(ln);
        if (m) {
            lexer.consume();
            inner.push(m[1] ?? '');
        }
        else {
            break;
        }
    }
    const subLexer = new Lexer(inner.join('\n'));
    subLexer.abbrDefs = lexer.abbrDefs;
    subLexer.nested = true;
    const children = parseBlocks(subLexer, 0);
    const bq = { type: 'blockquote', children };
    // Optional caption with ^
    // Allow one blank line between
    let lookahead = 0;
    while (!lexer.eof() && lexer.peek(lookahead)?.trim() === '')
        lookahead++;
    const next = lexer.peek(lookahead);
    if (next) {
        const cap = RE_CAPTION.exec(next);
        if (cap) {
            for (let i = 0; i <= lookahead; i++)
                lexer.consume();
            return {
                type: 'figure',
                target: bq,
                caption: parseInline(cap[1], lexer.abbrDefs),
            };
        }
    }
    return bq;
}
function parseBlockImage(lexer) {
    const line = lexer.consume();
    const m = RE_BARE_IMAGE.exec(line);
    const img = { type: 'image', src: m[2], alt: m[1] };
    if (m[3])
        img.title = m[3];
    if (m[4])
        img.attrs = parseAttrs(m[4]);
    // Optional caption
    let lookahead = 0;
    while (!lexer.eof() && lexer.peek(lookahead)?.trim() === '')
        lookahead++;
    const next = lexer.peek(lookahead);
    if (next) {
        const cap = RE_CAPTION.exec(next);
        if (cap) {
            for (let i = 0; i <= lookahead; i++)
                lexer.consume();
            return {
                type: 'figure',
                target: img,
                caption: parseInline(cap[1], lexer.abbrDefs),
            };
        }
    }
    return img;
}
function matchListMarker(line, isTask, isOrdered) {
    if (isTask)
        return RE_TASK.exec(line);
    if (isOrdered) {
        // An ordered list is not continued by a task or unordered marker.
        if (RE_TASK.test(line))
            return null;
        return RE_ORDERED.exec(line);
    }
    // Unordered: not continued by task or ordered markers.
    if (RE_TASK.test(line) || RE_ORDERED.test(line))
        return null;
    return RE_UNORDERED.exec(line);
}
function parseList(lexer) {
    const first = lexer.peek();
    const baseIndent = leadingWhitespace(first);
    const isTask = RE_TASK.test(first);
    const isOrdered = !isTask && RE_ORDERED.test(first);
    const items = [];
    let loose = false;
    while (!lexer.eof()) {
        const line = lexer.peek();
        if (line.trim() === '') {
            // Blank lines between siblings are handled by the per-item collector
            // below; a stray leading blank just ends the list.
            break;
        }
        if (leadingWhitespace(line) !== baseIndent)
            break;
        const m = matchListMarker(line, isTask, isOrdered);
        if (!m)
            break;
        let content;
        let checked;
        if (isTask) {
            checked = m[2].toLowerCase() === 'x';
            content = m[3];
        }
        else if (isOrdered) {
            content = m[3];
        }
        else {
            content = m[2];
        }
        // Column where item content begins; deeper-indented lines belong to
        // this item (continuation paragraphs or nested lists).
        const contentCol = m[0].length - content.length;
        lexer.consume();
        const nested = [];
        let pendingBlanks = 0;
        while (!lexer.eof()) {
            const l = lexer.peek();
            if (l.trim() === '') {
                pendingBlanks++;
                lexer.consume();
                continue;
            }
            if (leadingWhitespace(l) >= contentCol) {
                for (let k = 0; k < pendingBlanks; k++)
                    nested.push('');
                pendingBlanks = 0;
                nested.push(l.slice(contentCol));
                lexer.consume();
            }
            else {
                break;
            }
        }
        // Blank line(s) before the next sibling marker make the list loose.
        if (pendingBlanks > 0 && !lexer.eof()) {
            const nextLine = lexer.peek();
            if (leadingWhitespace(nextLine) === baseIndent &&
                matchListMarker(nextLine, isTask, isOrdered)) {
                loose = true;
            }
        }
        // An internal blank line (one kept inside `nested`, i.e. followed by
        // more item content) splits the item into multiple blocks, which by
        // the Djot/CommonMark rule makes the whole list loose.
        if (nested.includes(''))
            loose = true;
        // Parse the lead text together with its continuation/nested lines as
        // one block sequence. Lazy continuation (an indented line with no
        // blank before it) then merges into the lead paragraph instead of
        // becoming a stray second block.
        const sub = new Lexer([content, ...nested].join('\n'));
        sub.abbrDefs = lexer.abbrDefs;
        sub.nested = true;
        const children = parseBlocks(sub, 0);
        const item = { type: 'list-item', children };
        if (checked !== undefined)
            item.checked = checked;
        items.push(item);
    }
    return { type: 'list', ordered: isOrdered, tight: !loose, items };
}
/**
 * Parse a table cell's leading markers from its raw between-pipe text.
 *
 * Disambiguation follows the spec's writing convention: markers are
 * written *tight* against the pipe (`|=`, `|=>`, `|>`, `|<`, `|~`) with
 * no separating space, so they are only recognized at index 0 of the
 * raw cell text. A normal cell always has a space after the pipe
 * (`| Alice`, `| <https://x>`, `| >10`), so content that merely begins
 * with `<`/`>`/`~`/`=` is preserved verbatim.
 *
 * A cell whose trimmed content is exactly `^` or `<` (always written
 * spaced, e.g. `| ^ |`, `| < |`) is a rowspan/colspan marker. The tight
 * prefix is an optional `=` (header) followed by an optional alignment
 * marker (`>` right, `<` left, `~` center).
 */
function parseCellMarkers(src) {
    // Tight prefix only: the marker must sit at index 0 of the raw text.
    let i = 0;
    let header = false;
    if (src[i] === '=') {
        header = true;
        i++;
    }
    // A `<`/`>`/`~` immediately after `|` or `|=` IS an alignment marker
    // (spec: docs/case-study/syntax.md, "Disambiguation"). Exactly one is
    // recognized; a *repeated* character is the start of content, so for
    // `|=<<` the first `<` aligns and the second `<` is content.
    let align;
    const a = src[i];
    if (a === '>') {
        align = 'right';
        i++;
    }
    else if (a === '<') {
        align = 'left';
        i++;
    }
    else if (a === '~') {
        align = 'center';
        i++;
    }
    if (i > 0) {
        // A tight marker prefix was consumed; the rest is content.
        const content = src.slice(i).trim();
        return align ? { header, align, content } : { header, content };
    }
    // No tight prefix: a lone `^`/`<` (always spaced) is a span marker;
    // otherwise the whole trimmed text is content.
    const trimmed = src.trim();
    if (trimmed === '^')
        return { header: false, span: 'rowspan', content: '' };
    if (trimmed === '<')
        return { header: false, span: 'colspan', content: '' };
    return { header: false, content: trimmed };
}
function parseTable(lexer) {
    const rows = [];
    while (!lexer.eof() && RE_TABLE_ROW.test(lexer.peek())) {
        const line = lexer.consume();
        const cells = splitTableRow(line);
        const row = {
            type: 'table-row',
            cells: cells.map((src) => {
                const { header, span, align, content } = parseCellMarkers(src);
                const cell = {
                    type: 'table-cell',
                    header,
                    children: span ? [] : parseInline(content, lexer.abbrDefs),
                };
                if (span)
                    cell.span = span;
                if (align)
                    cell.align = align;
                return cell;
            }),
        };
        rows.push(row);
    }
    const table = { type: 'table', rows };
    // Optional caption ^ ...
    let lookahead = 0;
    while (!lexer.eof() && lexer.peek(lookahead)?.trim() === '')
        lookahead++;
    const next = lexer.peek(lookahead);
    if (next) {
        const cap = RE_CAPTION.exec(next);
        if (cap) {
            for (let i = 0; i <= lookahead; i++)
                lexer.consume();
            table.caption = parseInline(cap[1], lexer.abbrDefs);
        }
    }
    return table;
}
function splitTableRow(line) {
    // Split on unescaped pipes. Pipes inside backticks are protected.
    const cells = [];
    let buf = '';
    let inCode = false;
    let i = 0;
    // Skip leading pipe
    if (line[0] === '|')
        i = 1;
    for (; i < line.length; i++) {
        const ch = line[i];
        if (ch === '`')
            inCode = !inCode;
        if (ch === '\\' && line[i + 1] === '|') {
            buf += '|';
            i++;
            continue;
        }
        if (ch === '|' && !inCode) {
            cells.push(buf);
            buf = '';
            continue;
        }
        buf += ch;
    }
    // Trailing content after last pipe
    if (buf.trim() !== '')
        cells.push(buf);
    return cells;
}
function parseParagraph(lexer) {
    const lines = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (ln.trim() === '')
            break;
        if (isBlockStart(ln) &&
            (lexer.nested || interruptsParagraph(lexer, ln)))
            break;
        lexer.consume();
        lines.push(ln);
    }
    return {
        type: 'paragraph',
        children: parseInline(lines.join('\n'), lexer.abbrDefs),
    };
}
// Hard-wrap friendliness (Design Principle 7): a hard-wrapped prose line that
// happens to begin with an operator/marker (`* 3`, `- 3`, `> 5`, `| x`) must
// not silently become a list/quote/table. An ambiguous marker line only
// interrupts a paragraph when it forms a *real* block: 2+ consecutive markers
// of the same kind, or an indented continuation (multi-line first item). The
// blank-line-preceded case never reaches here — a blank line ends the
// paragraph earlier, and the block is then parsed fresh. Unambiguous starts
// (heading, fence, hr, admonition, image, abbr def, ordered list) always
// interrupt. Mirrors djot-php #180.
function interruptsParagraph(lexer, ln) {
    const isBullet = RE_UNORDERED.test(ln) || RE_TASK.test(ln);
    const isQuote = RE_BLOCKQUOTE.test(ln);
    const isTable = RE_TABLE_ROW.test(ln);
    if (!isBullet && !isQuote && !isTable)
        return true; // unambiguous block
    const next = lexer.peek(1);
    if (next === undefined || next.trim() === '')
        return false;
    if (isBullet) {
        if (RE_UNORDERED.test(next) || RE_TASK.test(next))
            return true; // 2+ markers
        if (leadingWhitespace(next) > 0)
            return true; // indented continuation
        return false;
    }
    // A following caption line (`^ ...`) is also a real-block signal: a
    // single-line quote/table directly under prose can still be a captioned
    // figure (parseBlockQuote/parseTable support `> q` / `|= h |` + `^ cap`).
    if (isQuote)
        return RE_BLOCKQUOTE.test(next) || RE_CAPTION.test(next);
    return RE_TABLE_ROW.test(next) || RE_CAPTION.test(next);
}
function isBlockStart(line) {
    return (RE_HEADING.test(line) ||
        RE_FENCE.test(line) ||
        RE_HR.test(line.trim()) ||
        RE_BLOCKQUOTE.test(line) ||
        RE_TASK.test(line) ||
        RE_UNORDERED.test(line) ||
        RE_ORDERED.test(line) ||
        RE_TABLE_ROW.test(line) ||
        RE_ADMONITION_OPEN.test(line) ||
        RE_BARE_IMAGE.test(line) ||
        RE_ABBR_DEF.test(line));
}
function leadingWhitespace(line) {
    let n = 0;
    while (n < line.length && (line[n] === ' ' || line[n] === '\t'))
        n++;
    return n;
}
// ============================================================================
// Inline parsing
// ============================================================================
const RE_LINK = /^(\[)([^\]]*)\]\(([^)\s]*)(?:\s+"([^"]*)")?\)(?:\{([^}]+)\})?/;
const RE_IMAGE = /^!\[([^\]]*)\]\(([^)\s]*)(?:\s+"([^"]*)")?\)(?:\{([^}]+)\})?/;
const RE_REF_LINK = /^\[([^\]]+)\]\[([^\]]*)\]/;
const RE_EXTENSION = /^:([a-zA-Z][\w-]*)\[([^\]]*)\](?:\{([^}]+)\})?/;
const RE_AUTOLINK = /^<([a-zA-Z][a-zA-Z0-9+.\-]*:[^>\s]+|[^\s>@]+@[^\s>]+)>/;
const RE_CROSSREF = /^<\/#([^>\s]+)>/;
const RE_INLINE_ATTR = /^\{([^}\n]+)\}/;
const RE_CRITIC_INS = /^\{\+([^}]*)\+\}/;
const RE_CRITIC_DEL = /^\{-([^}]*)-\}/;
const RE_CRITIC_SUB = /^\{~([^}]*)~>([^}]*)~\}/;
const RE_CRITIC_HL = /^\{=([^}]*)=\}/;
const RE_CRITIC_CMT = /^\{#([^}]*)#\}/;
// Names can include version-style dots between alnum runs (e.g. `#release-1.0`)
// but a trailing period is treated as sentence punctuation, not part of the name.
const RE_MENTION = /^@([a-zA-Z][\w-]*(?:\.\w+)*)/;
const RE_TAG = /^#([a-zA-Z][\w-]*(?:\.\w+)*)/;
function parseInline(text, abbrDefs) {
    const nodes = scanInline(text);
    return applyAbbreviations(nodes, abbrDefs);
}
function scanInline(text) {
    const out = [];
    let i = 0;
    let buf = '';
    const flush = () => {
        if (buf) {
            out.push({ type: 'text', value: buf });
            buf = '';
        }
    };
    while (i < text.length) {
        const c = text[i];
        const rest = text.slice(i);
        // Escape
        if (c === '\\' && i + 1 < text.length) {
            const nxt = text[i + 1];
            if (/[\\`*_{}\[\]()#+\-.!~^/<>@%|=,]/.test(nxt)) {
                buf += nxt;
                i += 2;
                continue;
            }
        }
        // Inline code spans first (opaque)
        if (c === '`') {
            const m = /^(`+)([\s\S]*?[^`])(\1)(?!`)/.exec(rest);
            if (m) {
                flush();
                const inner = m[2].replace(/^ (.*) $/, '$1');
                out.push({ type: 'code', value: inner });
                i += m[0].length;
                continue;
            }
        }
        // Image
        if (c === '!' && text[i + 1] === '[') {
            const m = RE_IMAGE.exec(rest);
            if (m) {
                flush();
                const img = { type: 'image', src: m[2], alt: m[1] };
                if (m[3])
                    img.title = m[3];
                if (m[4])
                    img.attrs = parseAttrs(m[4]);
                out.push(img);
                i += m[0].length;
                continue;
            }
        }
        // Link (inline)
        if (c === '[') {
            const m = RE_LINK.exec(rest);
            if (m) {
                flush();
                const link = {
                    type: 'link',
                    href: m[3],
                    children: scanInline(m[2]),
                };
                if (m[4])
                    link.title = m[4];
                if (m[5])
                    link.attrs = parseAttrs(m[5]);
                out.push(link);
                i += m[0].length;
                continue;
            }
            const mr = RE_REF_LINK.exec(rest);
            if (mr) {
                flush();
                out.push({ type: 'link', href: '', children: scanInline(mr[1]) });
                i += mr[0].length;
                continue;
            }
        }
        // Inline extension :type[content]{attrs}
        if (c === ':') {
            const m = RE_EXTENSION.exec(rest);
            if (m) {
                flush();
                const ext = {
                    type: 'extension',
                    name: m[1],
                    content: scanInline(m[2]),
                };
                if (m[3])
                    ext.attrs = parseAttrs(m[3]);
                out.push(ext);
                i += m[0].length;
                continue;
            }
        }
        // Autolink <url>
        if (c === '<') {
            const cr = RE_CROSSREF.exec(rest);
            if (cr) {
                flush();
                const cref = { type: 'crossref', target: cr[1] };
                out.push(cref);
                i += cr[0].length;
                continue;
            }
            const m = RE_AUTOLINK.exec(rest);
            if (m) {
                flush();
                const href = m[1];
                const auto = {
                    type: 'autolink',
                    href: href.includes('@') && !href.includes(':') ? `mailto:${href}` : href,
                };
                out.push(auto);
                i += m[0].length;
                continue;
            }
        }
        // CriticMarkup family
        if (c === '{') {
            const sub = RE_CRITIC_SUB.exec(rest);
            if (sub) {
                flush();
                out.push({
                    type: 'critic-substitute',
                    oldText: sub[1],
                    newText: sub[2],
                });
                i += sub[0].length;
                continue;
            }
            const ins = RE_CRITIC_INS.exec(rest);
            if (ins) {
                flush();
                out.push({ type: 'critic-insert', children: scanInline(ins[1]) });
                i += ins[0].length;
                continue;
            }
            const del = RE_CRITIC_DEL.exec(rest);
            if (del) {
                flush();
                out.push({ type: 'critic-delete', children: scanInline(del[1]) });
                i += del[0].length;
                continue;
            }
            const hl = RE_CRITIC_HL.exec(rest);
            if (hl) {
                flush();
                out.push({ type: 'critic-highlight', children: scanInline(hl[1]) });
                i += hl[0].length;
                continue;
            }
            const cmt = RE_CRITIC_CMT.exec(rest);
            if (cmt) {
                flush();
                out.push({ type: 'critic-comment', text: cmt[1] });
                i += cmt[0].length;
                continue;
            }
            // Inline attribute block — attaches to preceding node
            const attr = RE_INLINE_ATTR.exec(rest);
            if (attr && out.length) {
                const prev = out[out.length - 1];
                if (prev.type !== 'text') {
                    ;
                    prev.attrs = mergeAttrs(prev.attrs, parseAttrs(attr[1]));
                    i += attr[0].length;
                    continue;
                }
            }
        }
        // Mention
        if (c === '@' && (i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1]))) {
            const m = RE_MENTION.exec(rest);
            if (m) {
                flush();
                out.push({ type: 'mention', user: m[1] });
                i += m[0].length;
                continue;
            }
        }
        // Tag
        if (c === '#' && (i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1]))) {
            const m = RE_TAG.exec(rest);
            if (m) {
                flush();
                out.push({ type: 'tag', name: m[1] });
                i += m[0].length;
                continue;
            }
        }
        // Emphasis-family delimiters
        const em = matchEmphasis(text, i);
        if (em) {
            flush();
            out.push(em.node);
            i = em.end;
            continue;
        }
        // Soft break (single newline inside paragraph)
        if (c === '\n') {
            flush();
            out.push({ type: 'soft-break' });
            i++;
            continue;
        }
        buf += c;
        i++;
    }
    flush();
    return out;
}
function matchEmphasis(text, i) {
    const c = text[i];
    // Bold-italic /*...*/  (priority over /italic/ and *bold*)
    if (c === '/' && text[i + 1] === '*') {
        const close = findClose(text, i + 2, '*/');
        if (close !== -1) {
            const inner = text.slice(i + 2, close);
            return {
                node: { type: 'bold-italic', children: scanInline(inner) },
                end: close + 2,
            };
        }
    }
    // ,,sub,, (priority over single , — n/a, just match double)
    if (c === ',' && text[i + 1] === ',') {
        const close = findClose(text, i + 2, ',,');
        if (close !== -1 && close > i + 2) {
            const inner = text.slice(i + 2, close);
            if (inner.trim() && !inner.startsWith(' ') && !inner.endsWith(' ')) {
                return {
                    node: { type: 'sub', children: scanInline(inner) },
                    end: close + 2,
                };
            }
        }
    }
    // ==highlight== (priority over single =)
    if (c === '=' && text[i + 1] === '=') {
        const close = findClose(text, i + 2, '==');
        if (close !== -1 && close > i + 2) {
            const inner = text.slice(i + 2, close);
            if (inner.trim() && !inner.startsWith(' ') && !inner.endsWith(' ')) {
                return {
                    node: { type: 'highlight', children: scanInline(inner) },
                    end: close + 2,
                };
            }
        }
    }
    // Single-char delimiters
    const pairs = [
        ['/', 'italic'],
        ['*', 'strong'],
        ['_', 'underline'],
        ['~', 'strike'],
        ['^', 'super'],
    ];
    for (const [delim, type] of pairs) {
        if (c === delim) {
            // Opener must be followed by non-space and not be at end
            const after = text[i + 1];
            if (!after || after === ' ' || after === '\n' || after === delim)
                continue;
            // For italic/strong, avoid mid-word: previous char must not be word char
            // (Djot rule)
            if (delim === '/' || delim === '_') {
                const prev = text[i - 1];
                if (prev && /[A-Za-z0-9_/_]/.test(prev))
                    continue;
            }
            // Find closer that's not preceded by space
            const close = findEmphasisClose(text, i + 1, delim);
            if (close !== -1) {
                const inner = text.slice(i + 1, close);
                return {
                    node: { type, children: scanInline(inner) },
                    end: close + 1,
                };
            }
        }
    }
    return null;
}
function findClose(text, from, marker) {
    // Search forward for marker, simple substring match
    return text.indexOf(marker, from);
}
function findEmphasisClose(text, from, delim) {
    let depth = 0;
    for (let j = from; j < text.length; j++) {
        const ch = text[j];
        // Skip escapes
        if (ch === '\\' && j + 1 < text.length) {
            j++;
            continue;
        }
        // Skip code spans
        if (ch === '`') {
            const close = text.indexOf('`', j + 1);
            if (close !== -1) {
                j = close;
                continue;
            }
        }
        if (ch === delim) {
            // Closer must not be preceded by whitespace
            const prev = text[j - 1];
            if (prev === ' ' || prev === '\n' || prev === undefined)
                continue;
            const next = text[j + 1];
            // Closer must not be followed by alphanumeric for / and _
            if ((delim === '/' || delim === '_') && next && /[A-Za-z0-9]/.test(next))
                continue;
            if (depth === 0)
                return j;
            depth--;
        }
    }
    return -1;
}
function applyAbbreviations(nodes, defs) {
    if (defs.size === 0)
        return nodes;
    const out = [];
    const abbrRe = new RegExp(`\\b(${[...defs.keys()].join('|')})\\b`, 'g');
    for (const node of nodes) {
        if (node.type !== 'text') {
            // Recurse where applicable
            const anyChildren = node.children;
            if (Array.isArray(anyChildren)) {
                ;
                node.children = applyAbbreviations(anyChildren, defs);
            }
            out.push(node);
            continue;
        }
        const value = node.value;
        let last = 0;
        abbrRe.lastIndex = 0;
        let m;
        while ((m = abbrRe.exec(value))) {
            if (m.index > last) {
                out.push({ type: 'text', value: value.slice(last, m.index) });
            }
            const abbr = m[1];
            out.push({
                type: 'abbreviation',
                abbr,
                expansion: defs.get(abbr),
            });
            last = m.index + abbr.length;
        }
        if (last < value.length) {
            out.push({ type: 'text', value: value.slice(last) });
        }
        else if (last === 0) {
            out.push(node);
        }
    }
    return out;
}
// ============================================================================
// Attribute block parsing — {#id .class key=value key="value with spaces"}
// ============================================================================
export function parseAttrs(src) {
    const attrs = {};
    const re = /(?:#([\w-]+))|(?:\.([\w-]+))|(?:([\w-]+)=(?:"([^"]*)"|(\S+)))/g;
    let m;
    while ((m = re.exec(src))) {
        if (m[1]) {
            attrs.id = m[1];
        }
        else if (m[2]) {
            attrs.classes = [...(attrs.classes ?? []), m[2]];
        }
        else if (m[3]) {
            const val = m[4] ?? m[5] ?? '';
            attrs.keyValues = { ...(attrs.keyValues ?? {}), [m[3]]: val };
        }
    }
    return attrs;
}
function mergeAttrs(a, b) {
    if (!a)
        return b;
    const out = { ...a };
    if (b.id)
        out.id = b.id;
    if (b.classes)
        out.classes = [...(out.classes ?? []), ...b.classes];
    if (b.keyValues)
        out.keyValues = { ...(out.keyValues ?? {}), ...b.keyValues };
    return out;
}
// ============================================================================
// Minimal flat YAML parser (key: value, one per line; values are unquoted
// strings, bare ints, [array literals], or dates)
// ============================================================================
function parseYaml(src) {
    const out = {};
    for (const raw of src.split('\n')) {
        const line = raw.trim();
        if (line === '' || line.startsWith('#'))
            continue;
        const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
        if (!m)
            continue;
        out[m[1]] = parseYamlValue(m[2]);
    }
    return out;
}
function parseYamlValue(s) {
    const v = s.trim();
    if (v === '')
        return '';
    if (v === 'true')
        return true;
    if (v === 'false')
        return false;
    if (v === 'null')
        return null;
    if (/^-?\d+$/.test(v))
        return Number(v);
    if (/^-?\d+\.\d+$/.test(v))
        return Number(v);
    if (v.startsWith('[') && v.endsWith(']')) {
        return v
            .slice(1, -1)
            .split(',')
            .map((x) => parseYamlValue(x.trim()));
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
    }
    return v;
}
//# sourceMappingURL=parse.js.map