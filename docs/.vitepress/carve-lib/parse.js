/*
 * Carve parser — linear-time, block + inline.
 *
 * Block lexer reads line by line; inline parser does a single scan
 * over each block's text content. No backtracking.
 */
const RE_HEADING = /^(#{1,6})\s+(.+?)(?:\s+\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?\s*$/;
// Thematic break: a line of 3+ of the same `-`, `*`, or `_` (grammar
// thematic_break). A run alone on a line can't be emphasis (no content).
const RE_HR = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
// Info string is a single language token. The charset covers real-world tags
// with punctuation (c++, c#, f#, asp.net); a multiword/quoted info (e.g.
// `js title="x"`) is still not a fence (anchored, no whitespace allowed).
const RE_FENCE = /^(\s*)(`{3,}|~{3,})\s*([a-zA-Z0-9_+#.-]*)\s*$/;
// Bullets are `-` and `*` only. Unlike Markdown/djot, `+` is not a Carve bullet
// -- it is reserved as the list-continuation marker (PART 9 §17), so a lone `+`
// is unambiguous and a `+ x` line is ordinary paragraph text. A marker is a list
// item only with non-empty content: a content-less marker (`-`, `- `, `-   ` --
// bare or trailing whitespace only) is NOT a list, it is paragraph text.
const RE_UNORDERED = /^(\s*)[-*]\s+(\S.*)$/;
// Ordered marker: decimal, a single letter (alpha), or a roman-numeral
// run, then `.` or `)`. The dialect is fixed by the FIRST item (see
// olKindOf); letter/roman markers are ambiguous w.r.t. paragraphs (§10).
const RE_ORDERED = /^(\s*)([0-9]+|[ivxlcdm]+|[IVXLCDM]+|[a-z]|[A-Z])([.)])\s+(\S.*)$/;
// Task states (matches djot-php): `x`/`X` are checked; ` `, `-`, `_`,
// `>`, `?` are all accepted and render as an unchecked checkbox.
const RE_TASK = /^(\s*)[-*]\s+\[([ xX\-_>?])\]\s+(\S.*)$/;
const RE_BLOCKQUOTE = /^>\s?(.*)$/;
// Fences are a run of 3+ colons (group 1). A longer opener nests: a
// `::::` block contains `:::` blocks, and only a bare closer of equal-or-
// greater length closes it (djot fence-length rule).
const RE_ADMONITION_OPEN = /^(:{3,})\s*([a-zA-Z][\w-]*)\s*(.*)$/;
const RE_ADMONITION_CLOSE = /^(:{3,})\s*$/;
// Generic fenced div: a `:::` opener with NO type word -- bare `:::` or
// an attributes-only `::: {.class}` (djot's generic container). A typed
// `::: word` routes to parseAdmonition instead. Shares the `:::` closer.
const RE_DIV_OPEN = /^(:{3,})\s*(?:\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?\s*$/;
// Definition list (§4.5). A TERM line is exactly two colons + space(s)
// + text — the `(?!:)` keeps it distinct from a `:::` div/admonition. A
// DEFINITION line is a colon + two-or-more spaces + text.
const RE_DEFLIST_TERM = /^::(?!:)\s+(.+)$/;
const RE_DEFLIST_DEF = /^: {2,}(.+)$/;
const RE_ABBR_DEF = /^\*\[([A-Z][A-Z0-9]*)\]:\s+(.+)$/;
// Block-level reference-link definition: `[label]: url "title"` or
// `[label]: url 'title'` (grammar.ebnf link_title allows both quote
// styles). The destination is a bare token; an angle-bracketed `<url>`
// is the separate `autolink` production, not a ref-def destination
// (grammar.ebnf:243,251), so it is intentionally not accepted here.
const RE_LINK_DEF = /^\s*\[([^\]]+)\]:\s+(\S+)(?:\s+(?:"([^"]*)"|'([^']*)'))?\s*$/;
// Footnote definition `[^label]: body`. Tested before RE_LINK_DEF, which
// would otherwise capture `^label` as a link reference label.
const RE_FOOTNOTE_DEF = /^\[\^([^\]]+)\]:\s+(.+)$/;
const RE_CAPTION = /^\^\s+(.+)$/;
const RE_TABLE_ROW = /^\|/;
// A `+`-prefixed continuation row (multi-line cell). Like the grammar's
// continuation_row it ends with `|`; that trailing pipe distinguishes
// it from a `+ ` list item (which never ends with `|`). Only consumed
// inside parseTable, after a standard `|` row has opened the table.
const RE_TABLE_CONT = /^\+.*\|\s*$/;
const RE_BARE_IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)"|\s+'([^']*)')?\)\s*(?:\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?\s*$/;
// Frontmatter open fence: `---` with an optional format token (`---toml`,
// `---json`); bare `---` uses the default format. The space before the token is
// optional (lenient input: both `---toml` and `--- toml` are accepted; the
// no-space form is canonical). The token keeps it distinct from a thematic
// break (`-{3,}`).
const RE_FRONTMATTER_OPEN = /^---[ \t]*(\w*)\s*$/;
// Frontmatter close fence: bare `---` only.
const RE_FRONTMATTER_CLOSE = /^---\s*$/;
// Raw passthrough block: ```raw FORMAT … ``` (§4.15). The info string has
// two tokens ("raw FORMAT"), so this never collides with RE_FENCE (which
// allows only a single info token).
const RE_RAW_FENCE = /^(`{3,}|~{3,})\s*raw\s+([a-zA-Z][\w-]*)\s*$/;
// Comments (§4.13): a `%%%`+ line opens/closes a block comment (matched
// by length); a `%%` line is a line comment. Neither is rendered.
const RE_COMMENT_BLOCK = /^%{3,}\s*$/;
const RE_COMMENT_LINE = /^%%/;
// Maximum block-container nesting depth. Each level of blockquote / div / list /
// footnote recurses parseBlocks -> parseBlock -> parseContainer -> parseBlocks,
// so unbounded nesting (e.g. `> ` repeated thousands of times) overflows the
// call stack. Past this depth, container openers degrade to literal paragraph
// text instead of crashing. Far above any real document; only adversarial input
// reaches it.
const MAX_NESTING_DEPTH = 200;
class Lexer {
    lines;
    lineOffsets;
    pos = 0;
    // Block-container nesting depth of this (sub-)lexer; 0 at the document top.
    depth = 0;
    frontmatter;
    /** Format applied to a bare `---` fence; set from ParseOptions. */
    defaultFrontmatterFormat = 'yaml';
    abbrDefs = new Map();
    linkDefs = new Map();
    // Footnote definitions keyed by raw label; value is the parsed note
    // body (def line + indented continuation), set by parseFootnoteDef.
    footnoteDefs = new Map();
    // True for sub-lexers over already-nested block content (list item /
    // blockquote / admonition bodies). The §10 paragraph-interruption guard
    // (a visible block needs a blank line to interrupt) applies at the document
    // top level; inside nested content a marker still interrupts, so
    // `- a\n  - b` (single nested child) still nests. Mirrors djot-php #180's
    // scoping (guard only on the top-level paragraph path).
    nested = false;
    // Negative cache for divHasCloser: the smallest line index from which
    // NO bare colon-fence closer of ANY length exists onward. Once a scan
    // proves that, every later bare opener (pos only advances) is O(1),
    // keeping pathological "many unclosed `:::`" input linear.
    divNoCloserFrom = Infinity;
    constructor(source, opts = {}) {
        this.defaultFrontmatterFormat = opts.defaultFrontmatterFormat ?? 'yaml';
        this.lines = source.replace(/\r\n?/g, '\n').split('\n');
        // Drop trailing empty line introduced by terminal newline
        if (this.lines.length && this.lines[this.lines.length - 1] === '') {
            this.lines.pop();
        }
        this.lineOffsets = [];
        let offset = 0;
        for (const line of this.lines) {
            this.lineOffsets.push(offset);
            offset += line.length + 1;
        }
        // Frontmatter is document-leading only; the root lexer consumes it
        // explicitly in parse(). Sub-lexers (list items, divs, admonitions)
        // must NOT, or nested `---`-fenced content would be swallowed.
    }
    consumeFrontmatter() {
        if (this.lines.length < 2)
            return;
        const open = RE_FRONTMATTER_OPEN.exec(this.lines[0]);
        if (!open)
            return;
        for (let i = 1; i < this.lines.length; i++) {
            if (RE_FRONTMATTER_CLOSE.test(this.lines[i])) {
                const content = this.lines.slice(1, i).join('\n');
                const format = open[1] !== '' ? open[1] : this.defaultFrontmatterFormat;
                this.frontmatter = { format, content };
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
    lineOffset(lineIndex) {
        return this.lineOffsets[lineIndex] ?? 0;
    }
}
export function parse(source, opts = {}) {
    newlineIndexCache.clear();
    const lexer = new Lexer(source, opts);
    // Consume leading frontmatter first so `lexer.pos` marks the end of the
    // metadata region; the def passes and parseBlocks all start from there.
    lexer.consumeFrontmatter();
    // First pass: collect abbreviation and reference-link definitions so
    // they can be resolved regardless of document order (grammar §6).
    collectAbbrDefs(lexer);
    collectLinkDefs(lexer);
    const children = parseBlocks(lexer, 0);
    const doc = { type: 'document', children };
    if (lexer.frontmatter)
        doc.frontmatter = lexer.frontmatter;
    if (lexer.footnoteDefs.size)
        doc.footnoteDefs = Object.fromEntries(lexer.footnoteDefs);
    return doc;
}
function collectAbbrDefs(lexer) {
    for (let idx = 0; idx < lexer.lines.length; idx++) {
        // Skip leading frontmatter (opaque metadata); see collectLinkDefs.
        if (idx < lexer.pos)
            continue;
        const m = RE_ABBR_DEF.exec(lexer.lines[idx]);
        if (m)
            lexer.abbrDefs.set(m[1], m[2]);
    }
}
/**
 * Normalize an explicit `[label]: url` reference label for matching:
 * whitespace-collapsed but case-SENSITIVE. Djot does "no case normalization
 * on reference definitions" (links_and_images spec), and Carve keeps a
 * case-mismatched reference unresolved -> literal (corpus 36). Implicit
 * heading references match heading TEXT and are fuzzier (case-insensitive);
 * they wrap this in heading-ids.ts rather than fold case here.
 */
export function normalizeRefLabel(label) {
    return label.trim().replace(/\s+/g, ' ');
}
/**
 * Strip leading block-container prefixes (blockquote `>`, bullet/task and
 * decimal list markers, indentation) so a definition nested inside a real
 * container (introduced after a blank line) is seen by the single
 * forward-reference pass.
 *
 * KNOWN LIMITATION (§10): this pass is line-based and has no block context,
 * so it strips a container marker even when, at the document top level, that
 * marker is really a hard-wrapped prose line (full-djot: a lone marker under
 * prose with no blank line is paragraph text, not a block). A definition
 * jammed directly onto such a line — `1. [r]: /u` or `> [r]: /u` immediately
 * under prose — is therefore still collected, so the prose line resolves the
 * reference even though it renders literally. This over-collection is limited
 * to that pathological no-blank input; real definitions sit after a blank
 * line, where this pass and the block parser agree. Alpha/roman markers are
 * deliberately NOT stripped (a def directly on an `a.`/`i.` line is the same
 * near-impossible input, and skipping the strip avoids the more common false
 * positive of fabricating a def from ordinary prose).
 */
function stripContainerPrefixes(raw) {
    let line = raw;
    let prev;
    do {
        prev = line;
        line = line
            .replace(/^\s*>\s?/, '') // blockquote
            .replace(/^\s*(?:[-*]|\d+[.)])\s+(?:\[[ xX\-_>?]\]\s+)?/, ''); // list/task
    } while (line !== prev);
    return line.replace(/^\s+/, ''); // residual indentation
}
/**
 * One top-level pass over the whole source collects every reference
 * definition, so resolution is order-independent (grammar §6).
 * Blockquote markers are stripped first, so a quoted def (`> [r]: /u`)
 * is found here too — and fence tracking runs on the *stripped* line so
 * a definition shown inside a quoted code block stays a literal sample.
 * Admonition bodies and indented list defs already match the
 * whitespace-tolerant RE_LINK_DEF. Because this single pass is complete,
 * sub-lexers must NOT re-collect (that would overwrite a later
 * document-wide definition with a stale nested one).
 *
 * Implicit heading references (`[Heading Text][]` resolves to a matching
 * top-level heading) are handled in resolveHeadingIds, NOT here. That
 * deferred pass walks the parsed AST and uses the real inlineText, so
 * the implicit-ref key always agrees with the heading slug — no regex
 * pre-pass can mirror the inline parser perfectly.
 *
 * Deliberate limitation: this flat pre-pass is the price of
 * order-independent resolution (§6) without a second structural parse.
 * A definition jammed into a hard-wrapped paragraph with no surrounding
 * blank line (e.g. `Intro\n- [r]: /u`) is still collected here even
 * though parseParagraph keeps that line as prose. Reference definitions
 * are conventionally blank-line-separated; the jammed-in form is
 * pathological and intentionally not special-cased.
 */
function collectLinkDefs(lexer) {
    let fence = null;
    for (let idx = 0; idx < lexer.lines.length; idx++) {
        // Skip leading frontmatter — `lexer.pos` is its end (0 when there is
        // none, including an unclosed opener that is NOT frontmatter), so a
        // `[ref]: ...` inside it is not collected, while content after an
        // unclosed opener still is.
        if (idx < lexer.pos)
            continue;
        const raw = lexer.lines[idx];
        const line = stripContainerPrefixes(raw);
        if (fence) {
            const close = line.match(/^ {0,3}([`~]{3,})\s*$/);
            if (close && close[1][0] === fence.ch && close[1].length >= fence.len)
                fence = null;
            continue; // definitions inside fenced code are literal samples
        }
        const open = RE_FENCE.exec(line);
        if (open) {
            fence = { ch: open[2][0], len: open[2].length };
            continue;
        }
        // An abbreviation def (`*[ABBR]: ...`) is not a link def.
        if (RE_ABBR_DEF.test(line))
            continue;
        // A footnote def (`[^label]: body`) is parsed as a block in
        // parseFootnoteDef; skip here so RE_LINK_DEF can't capture `^label`.
        if (RE_FOOTNOTE_DEF.test(line))
            continue;
        const m = RE_LINK_DEF.exec(line);
        if (m) {
            const def = { href: m[2] };
            const title = m[3] ?? m[4];
            if (title !== undefined)
                def.title = title;
            lexer.linkDefs.set(normalizeRefLabel(m[1]), def);
            continue;
        }
    }
}
function parseBlocks(lexer, baseIndent) {
    const out = [];
    // Leading block-attribute lines (grammar PART 9 §15) accumulate here
    // and attach to the next block. They float across blank lines; a
    // dangling run with no following block is dropped.
    let pending = null;
    while (!lexer.eof()) {
        const line = lexer.peek();
        if (line.trim() === '') {
            // Blank lines do NOT reset pending block attributes (§15 reach).
            lexer.consume();
            continue;
        }
        // Stop at lower indent (caller's responsibility to detect this)
        const indent = leadingWhitespace(line);
        if (indent < baseIndent)
            break;
        const ba = tryCollectBlockAttributes(lexer);
        if (ba) {
            pending = pending ? mergeAttrs(pending, ba) : ba;
            continue;
        }
        const node = parseBlock(lexer);
        if (node) {
            if (pending) {
                // Leading attrs are earlier in source; the block's own trailing
                // attrs win on conflict (id/key last), classes accumulate (§15).
                node.attrs = mergeAttrs(pending, node.attrs ?? {});
            }
            out.push(node);
        }
        // The block absorbs any pending attrs -- including a non-rendering
        // block such as a consumed reference/abbreviation definition (which
        // returns no node). So `{.x}\n[ref]: /u\nText` drops `.x` rather
        // than leaking it onto `Text`, matching djot and carve-php.
        pending = null;
    }
    // A dangling pending run (no following block) is dropped.
    return out;
}
/**
 * If the lexer is positioned on a standalone block-attribute line
 * (`{...}`, possibly spanning multiple indented lines until the closing
 * `}`), consume it and return the parsed attributes. Otherwise consume
 * nothing and return null. A block whose content yields no recognized
 * attribute is not a block-attribute line — it falls through to normal
 * block parsing (literal text). Grammar PART 9 §15.
 */
function tryCollectBlockAttributes(lexer) {
    if (!/^\s*\{/.test(lexer.peek()))
        return null;
    let collected = '';
    let n = 0;
    let closed = false;
    // Multi-line collection stops at the first line containing `}`. A
    // quoted attribute value containing a literal `}` that also spans
    // lines (`{key="a}\nb"}`) is not supported across lines -- a
    // pathological case; single-line quoted values are handled by the
    // greedy `{...}` match below.
    for (;;) {
        const ln = lexer.peek(n);
        if (ln === undefined)
            break;
        if (n > 0 && ln.trim() === '')
            break; // blank line inside an open brace: not a block
        collected += (n === 0 ? '' : '\n') + ln;
        n++;
        if (ln.includes('}')) {
            closed = true;
            break;
        }
    }
    if (!closed)
        return null;
    // The whole run must be exactly `{ … }` with nothing after the close.
    const m = /^\s*\{([\s\S]*)\}\s*$/.exec(collected);
    if (!m)
        return null;
    // The ENTIRE payload must be valid attribute syntax (attributes +
    // whitespace, nothing else). A line like `{.note junk}` or `{#todo#}`
    // has leftover content -> it is NOT a block-attribute line and falls
    // through to literal text (otherwise the junk would be silently
    // dropped and the recognized tokens wrongly hoisted onto the next
    // block).
    if (!isValidAttrPayload(m[1]))
        return null;
    const attrs = parseAttrs(m[1]);
    if (isEmptyAttrs(attrs))
        return null;
    for (let k = 0; k < n; k++)
        lexer.consume();
    return attrs;
}
function parseBlock(lexer) {
    const startLine = lexer.pos;
    const node = parseBlockInner(lexer);
    if (node)
        attachBlockPos(lexer, node, startLine, lexer.pos);
    return node;
}
function parseBlockInner(lexer) {
    const line = lexer.peek();
    // Past the nesting limit, stop opening recursive containers and treat the
    // line as paragraph text. Prevents a call-stack overflow on pathologically
    // nested input (e.g. thousands of `> `); see MAX_NESTING_DEPTH.
    if (lexer.depth >= MAX_NESTING_DEPTH)
        return parseParagraph(lexer);
    // Block-level constructs in priority order
    if (RE_RAW_FENCE.test(line))
        return parseRawBlock(lexer);
    if (RE_FENCE.test(line))
        return parseFence(lexer);
    // Comments (not rendered). Block (`%%%`) before line (`%%`).
    if (RE_COMMENT_BLOCK.test(line))
        return parseCommentBlock(lexer);
    if (RE_COMMENT_LINE.test(line)) {
        const l = lexer.consume();
        return { type: 'comment', block: false, content: l.slice(2).replace(/^\s/, '') };
    }
    if (RE_ADMONITION_OPEN.test(line) && !RE_ADMONITION_CLOSE.test(line))
        return parseAdmonition(lexer);
    // Bare `:::` or attributes-only `::: {…}` opens a generic div (the
    // admonition branch above already claimed the `::: word` form) — but
    // ONLY when a matching closing `:::` exists ahead. A lone, unclosed
    // `:::` is literal text (matches djot + carve-php + the grammar, which
    // requires a closer); without this guard it would swallow the rest of
    // the document into a div.
    if (RE_DIV_OPEN.test(line) && divHasCloser(lexer))
        return parseDiv(lexer);
    if (RE_ABBR_DEF.test(line)) {
        return parseAbbrDef(lexer);
    }
    // Footnote definition: consume the def line + indented continuation
    // and stash the parsed body (tested before RE_LINK_DEF).
    if (RE_FOOTNOTE_DEF.test(line))
        return parseFootnoteDef(lexer);
    // Reference-link definitions were collected in the first pass; the
    // line itself produces no block (consume it so it is not a paragraph).
    if (RE_LINK_DEF.test(line)) {
        lexer.consume();
        return null;
    }
    if (RE_HR.test(line.trim())) {
        lexer.consume();
        return { type: 'thematic-break' };
    }
    if (RE_HEADING.test(line))
        return parseHeading(lexer);
    // Definition list starts on a `:: term` line (two colons, not three).
    if (RE_DEFLIST_TERM.test(line))
        return parseDefinitionList(lexer);
    if (RE_BLOCKQUOTE.test(line))
        return parseBlockQuote(lexer);
    if (RE_TASK.test(line) || RE_UNORDERED.test(line) || RE_ORDERED.test(line))
        return parseList(lexer);
    if (RE_TABLE_ROW.test(line))
        return parseTable(lexer);
    if (isBlockImageLine(line))
        return parseBlockImage(lexer);
    return parseParagraph(lexer);
}
function attachBlockPos(lexer, node, startLineIndex, endLineIndexExclusive) {
    const endLineIndex = Math.max(startLineIndex, endLineIndexExclusive - 1);
    const endLine = lexer.lines[endLineIndex] ?? '';
    node.pos = {
        startLine: startLineIndex + 1,
        endLine: endLineIndex + 1,
        startColumn: 1,
        endColumn: endLine.length + 1,
        startOffset: lexer.lineOffset(startLineIndex),
        endOffset: lexer.lineOffset(endLineIndex) + endLine.length,
    };
}
// Trailing `{…}` attribute block on a (possibly multi-line) heading. Quote-
// and escape-aware so a `}` inside a quoted value does not end it early.
const RE_HEADING_TRAIL_ATTR = /^([\s\S]*?)[ \t]*\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\}$/;
function parseHeading(lexer) {
    const lineIndex = lexer.pos;
    const line = lexer.consume();
    const m = RE_HEADING.exec(line);
    const level = m[1].length;
    // Carve headings are multi-line, like Djot (and like blockquotes): the text
    // spills onto following lines until a blank line. A continuation line may
    // carry the same-or-lower number of `#` (stripped) or none; a higher/other
    // heading marker starts a NEW heading, and a caption (`^ …`) or fenced
    // comment (`%%%`) ends the heading. Per §10 no other block interrupts it.
    let text = line.replace(/^#{1,6}[ \t]+/, '');
    const sameOrLower = new RegExp(`^#{1,${level}}[ \\t]+(.+)$`);
    while (!lexer.eof()) {
        const next = lexer.peek();
        if (next.trim() === '')
            break;
        const cont = sameOrLower.exec(next);
        if (cont) {
            text += '\n' + cont[1];
            lexer.consume();
            continue;
        }
        if (/^#{1,6}([ \t]|$)/.test(next) || RE_CAPTION.test(next) || RE_COMMENT_BLOCK.test(next)) {
            break;
        }
        text += '\n' + next;
        lexer.consume();
    }
    const node = { type: 'heading', level, children: [] };
    // A trailing `{…}` attribute block applies to the whole heading. It is only
    // consumed when it yields >= 1 real attribute; otherwise it stays text.
    const am = RE_HEADING_TRAIL_ATTR.exec(text);
    if (am) {
        const attrs = parseAttrs(am[2]);
        if (!isEmptyAttrs(attrs)) {
            node.attrs = attrs;
            text = am[1].replace(/[ \t]+$/, '');
        }
    }
    // Column where the content starts on the first line (the marker + spaces).
    const textColumn = line.length - line.replace(/^#{1,6}[ \t]+/, '').length + 1;
    node.children = parseInline(text, lexer.abbrDefs, lexer.linkDefs, {
        baseOffset: lexer.lineOffset(lineIndex) + textColumn - 1,
        startLine: lineIndex + 1,
        startColumn: textColumn,
    });
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
// Raw passthrough block: ```raw FORMAT … ``` . Content is verbatim; the
// renderer emits it only when FORMAT matches the output (html).
function parseRawBlock(lexer) {
    const m = RE_RAW_FENCE.exec(lexer.consume());
    const marker = m[1];
    const format = m[2];
    const closeRe = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
    const lines = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (closeRe.test(ln)) {
            lexer.consume();
            break;
        }
        lexer.consume();
        lines.push(ln);
    }
    return { type: 'raw-block', format, content: lines.join('\n') };
}
// Block comment: a `%%%`+ opener, closed by a line of the SAME length
// (more `%` nest). Not rendered.
function parseCommentBlock(lexer) {
    const open = lexer.consume().trim();
    const lines = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (ln.trim() === open) {
            lexer.consume();
            break;
        }
        lexer.consume();
        lines.push(ln);
    }
    return { type: 'comment', block: true, content: lines.join('\n') };
}
// Footnote definition. The def line's trailing text plus following lines
// indented by >= 2 spaces (single blank lines allowed between chunks)
// form the note body, parsed as blocks. First definition for a label
// wins. Emits no block — the body is stashed on lexer.footnoteDefs and
// rendered in the endnotes section.
function parseFootnoteDef(lexer) {
    const m = RE_FOOTNOTE_DEF.exec(lexer.consume());
    const label = m[1].trim();
    const bodyLines = [m[2]];
    let pendingBlanks = 0;
    let contentCol = -1;
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (ln.trim() === '') {
            pendingBlanks++;
            lexer.consume();
            continue;
        }
        const ws = leadingWhitespace(ln);
        if (ws >= 2) {
            // Dedent by the FIRST continuation line's indent (not strip-all),
            // so deeper-indented nested structure inside the note is preserved.
            if (contentCol === -1)
                contentCol = ws;
            for (let k = 0; k < pendingBlanks; k++)
                bodyLines.push('');
            pendingBlanks = 0;
            bodyLines.push(ln.slice(Math.min(contentCol, ws)));
            lexer.consume();
        }
        else {
            break;
        }
    }
    if (!lexer.footnoteDefs.has(label)) {
        const sub = new Lexer(bodyLines.join('\n'));
        sub.abbrDefs = lexer.abbrDefs;
        sub.linkDefs = lexer.linkDefs;
        sub.footnoteDefs = lexer.footnoteDefs;
        sub.nested = true;
        sub.depth = lexer.depth + 1;
        lexer.footnoteDefs.set(label, parseBlocks(sub, 0));
    }
    return null;
}
function parseAdmonition(lexer) {
    const open = lexer.consume();
    const m = RE_ADMONITION_OPEN.exec(open);
    const fence = m[1].length;
    const kind = m[2];
    // A title is recognized ONLY when the tail after the type opens with a
    // double-quoted string (grammar quoted_title; PART 9 §12), optionally
    // followed by an attribute block. The quotes are delimiters and are
    // stripped — not part of the rendered title text. An explicitly empty
    // `""` still counts as a supplied (empty) title. Unquoted trailing
    // text is ignored (not a title).
    const tail = m[3]?.trim() ?? '';
    const quoted = /^"([^"]*)"\s*(?:\{[^}]*\})?$/.exec(tail);
    const titleText = quoted ? quoted[1] : undefined;
    const inner = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        const c = RE_ADMONITION_CLOSE.exec(ln);
        if (c && c[1].length >= fence) {
            lexer.consume();
            break;
        }
        lexer.consume();
        inner.push(ln);
    }
    const subLexer = new Lexer(inner.join('\n'));
    subLexer.abbrDefs = lexer.abbrDefs;
    subLexer.linkDefs = lexer.linkDefs;
    subLexer.footnoteDefs = lexer.footnoteDefs;
    subLexer.nested = true;
    subLexer.depth = lexer.depth + 1;
    const children = parseBlocks(subLexer, 0);
    const node = { type: 'admonition', kind, children };
    // `!== undefined` (not truthiness): an explicitly empty quoted title
    // `""` still emits a (empty) <p class="admonition-title"> per §12.
    if (titleText !== undefined) {
        node.title = parseInline(titleText, lexer.abbrDefs, lexer.linkDefs);
    }
    return node;
}
// Generic div: same body collection as an admonition, but emits a plain
// <div> carrying the opener's attributes (no class added). Like
// admonitions it closes at the first bare `:::` (no length-based nesting).
/**
 * From a `:::` opener at peek(0), is there a matching closing `:::`
 * line ahead? A flat scan (first bare `:::` closes), mirroring parseDiv.
 * Used to reject a lone, unclosed `:::` as a div opener (PART 9 §12 /
 * grammar: a div requires a closer).
 */
function divHasCloser(lexer) {
    // A bare-`:::`+ div opens only when a bare closer of equal-or-greater
    // colon length exists ahead (otherwise a lone `:::` is literal — and a
    // longer fence must be matched by a longer closer).
    const start = lexer.pos + 1;
    if (start >= lexer.divNoCloserFrom)
        return false; // memo: no closer ahead
    const fence = /^(:{3,})/.exec(lexer.peek())[1].length;
    let sawAnyCloser = false;
    for (let i = start; i < lexer.lines.length; i++) {
        const c = RE_ADMONITION_CLOSE.exec(lexer.lines[i]);
        if (c) {
            sawAnyCloser = true;
            if (c[1].length >= fence)
                return true;
        }
    }
    // No closer of length >= fence ahead. If there is NO bare closer at all
    // from here on, cache it (pos only advances) so later openers are O(1).
    if (!sawAnyCloser)
        lexer.divNoCloserFrom = start;
    return false;
}
function parseDiv(lexer) {
    const m = RE_DIV_OPEN.exec(lexer.consume());
    const fence = m[1].length;
    const attrSrc = m[2];
    const inner = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        const c = RE_ADMONITION_CLOSE.exec(ln);
        if (c && c[1].length >= fence) {
            lexer.consume();
            break;
        }
        lexer.consume();
        inner.push(ln);
    }
    const subLexer = new Lexer(inner.join('\n'));
    subLexer.abbrDefs = lexer.abbrDefs;
    subLexer.linkDefs = lexer.linkDefs;
    subLexer.footnoteDefs = lexer.footnoteDefs;
    subLexer.nested = true;
    subLexer.depth = lexer.depth + 1;
    const node = { type: 'div', children: parseBlocks(subLexer, 0) };
    if (attrSrc)
        node.attrs = parseAttrs(attrSrc);
    return node;
}
// Definition list (§4.5). An entry is 1+ `:: term` lines followed by 1+
// `:  definition` lines; a definition continues on lines indented >= 3
// spaces. A `:: term` after a definition starts a new entry; a single
// blank line between entries is allowed, anything else ends the list.
function parseDefinitionList(lexer) {
    const items = [];
    const parseDefBody = (first) => {
        const bodyLines = [first];
        while (!lexer.eof()) {
            const ln = lexer.peek();
            if (ln.trim() !== '' && leadingWhitespace(ln) >= 3) {
                bodyLines.push(ln.replace(/^\s+/, ''));
                lexer.consume();
            }
            else
                break;
        }
        const sub = new Lexer(bodyLines.join('\n'));
        sub.abbrDefs = lexer.abbrDefs;
        sub.linkDefs = lexer.linkDefs;
        sub.footnoteDefs = lexer.footnoteDefs;
        sub.nested = true;
        sub.depth = lexer.depth + 1;
        return parseBlocks(sub, 0);
    };
    while (!lexer.eof() && RE_DEFLIST_TERM.test(lexer.peek())) {
        const terms = [];
        const definitions = [];
        while (!lexer.eof()) {
            const t = RE_DEFLIST_TERM.exec(lexer.peek());
            if (!t)
                break;
            lexer.consume();
            terms.push(parseInline(t[1], lexer.abbrDefs, lexer.linkDefs));
        }
        while (!lexer.eof()) {
            const d = RE_DEFLIST_DEF.exec(lexer.peek());
            if (!d)
                break;
            lexer.consume();
            definitions.push(parseDefBody(d[1]));
        }
        items.push({ terms, definitions });
        // Allow a single blank line before the next entry's `:: term`.
        if (!lexer.eof() && lexer.peek().trim() === '') {
            let look = 1;
            while (lexer.peek(look)?.trim() === '')
                look++;
            const next = lexer.peek(look);
            if (next && RE_DEFLIST_TERM.test(next))
                for (let k = 0; k < look; k++)
                    lexer.consume();
            else
                break;
        }
    }
    return { type: 'definition-list', items };
}
function parseAbbrDef(lexer) {
    const line = lexer.consume();
    const m = RE_ABBR_DEF.exec(line);
    return { type: 'abbreviation-def', abbr: m[1], expansion: m[2] };
}
/**
 * Track verbatim/paragraph state across a blockquote's collected inner lines so a
 * non-`>` lazy line only extends an OPEN paragraph (the djot/CommonMark rule).
 * Inside an open code fence/comment, or after a structural line that leaves no open
 * paragraph (a just-opened div, a closed fence), such a line must terminate the
 * quote rather than be swallowed into the fence/div. Carve has no
 * paragraph-interrupting block mode, so a fence/comment/div opener starts a block
 * only when no paragraph is already open — a fence-looking line mid-paragraph is
 * plain paragraph text.
 */
function trackBlockQuoteLazyState(content, state) {
    if (state.inComment) {
        const c = /^(%{3,})\s*$/.exec(content);
        if (c && c[1].length >= state.commentLen)
            state.inComment = false;
        state.paragraphOpen = false;
        return;
    }
    if (state.inFence) {
        if (state.fenceClose.test(content))
            state.inFence = false;
        state.paragraphOpen = false;
        return;
    }
    if (content.trim() === '') {
        state.paragraphOpen = false;
        return;
    }
    if (!state.paragraphOpen) {
        const fence = RE_FENCE.exec(content);
        if (fence) {
            const marker = fence[2];
            state.inFence = true;
            state.fenceClose = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
            state.paragraphOpen = false;
            return;
        }
        const comment = /^(%{3,})\s*$/.exec(content);
        if (comment) {
            state.inComment = true;
            state.commentLen = comment[1].length;
            state.paragraphOpen = false;
            return;
        }
        if (RE_DIV_OPEN.test(content) || RE_ADMONITION_OPEN.test(content)) {
            // Div / admonition opener (`:::`, `::: {…}`, or `::: type`) is structural;
            // it opens no paragraph itself.
            state.paragraphOpen = false;
            return;
        }
    }
    state.paragraphOpen = true;
}
function parseBlockQuote(lexer) {
    const inner = [];
    const state = {
        inFence: false,
        fenceClose: null,
        inComment: false,
        commentLen: 0,
        paragraphOpen: false,
    };
    while (!lexer.eof()) {
        const ln = lexer.peek();
        const m = RE_BLOCKQUOTE.exec(ln);
        if (m) {
            lexer.consume();
            const content = m[1] ?? '';
            inner.push(content);
            trackBlockQuoteLazyState(content, state);
            continue;
        }
        // Lazy continuation: a non-`>` line folds into the quote ONLY when it
        // continues an open paragraph (CommonMark-style; matches carve-php). A blank
        // line ends the quote. The only non-blank lines that end it are the ones that
        // interrupt a paragraph anywhere — the "invisible" reference/footnote/abbr
        // definitions and comments — plus a caption `^ …`, which attaches to the quote
        // rather than folding in.
        if (ln.trim() === '' ||
            RE_LINK_DEF.test(ln) ||
            RE_FOOTNOTE_DEF.test(ln) ||
            RE_ABBR_DEF.test(ln) ||
            RE_COMMENT_LINE.test(ln) ||
            RE_COMMENT_BLOCK.test(ln) ||
            RE_CAPTION.test(ln)) {
            break;
        }
        // A non-`>` line inside an open fence/comment, or after a block that left no
        // open paragraph, terminates the quote instead of being swallowed.
        if (!state.paragraphOpen)
            break;
        lexer.consume();
        inner.push(ln);
        trackBlockQuoteLazyState(ln, state);
    }
    const subLexer = new Lexer(inner.join('\n'));
    subLexer.abbrDefs = lexer.abbrDefs;
    subLexer.linkDefs = lexer.linkDefs;
    subLexer.footnoteDefs = lexer.footnoteDefs;
    subLexer.nested = true;
    subLexer.depth = lexer.depth + 1;
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
        // §4: a caption attaches only when it immediately follows the block
        // or is separated by at most ONE blank line.
        if (cap && lookahead <= 1) {
            for (let i = 0; i <= lookahead; i++)
                lexer.consume();
            return {
                type: 'figure',
                target: bq,
                caption: parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs),
            };
        }
    }
    return bq;
}
/**
 * True when `line` is a standalone block image: `![…](…)` optionally followed
 * by a trailing attribute block that yields REAL attributes. An empty or
 * whitespace block (`{ }`) or an invalid one (`{=hl=}`) is not consumed — the
 * line falls through to a paragraph and the `{…}` renders literally, matching
 * the inline trailing-attribute rule (and carve-php).
 */
function isBlockImageLine(line) {
    const m = RE_BARE_IMAGE.exec(line);
    return m !== null && (m[5] === undefined || !isEmptyAttrs(parseAttrs(m[5])));
}
function parseBlockImage(lexer) {
    const line = lexer.consume();
    const m = RE_BARE_IMAGE.exec(line);
    const img = { type: 'image', src: m[2], alt: m[1] };
    const title = m[3] ?? m[4];
    if (title)
        img.title = title;
    if (m[5])
        img.attrs = parseAttrs(m[5]);
    // Optional caption
    let lookahead = 0;
    while (!lexer.eof() && lexer.peek(lookahead)?.trim() === '')
        lookahead++;
    const next = lexer.peek(lookahead);
    if (next) {
        const cap = RE_CAPTION.exec(next);
        // §4: a caption attaches only when it immediately follows the block
        // or is separated by at most ONE blank line.
        if (cap && lookahead <= 1) {
            for (let i = 0; i <= lookahead; i++)
                lexer.consume();
            return {
                type: 'figure',
                target: img,
                caption: parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs),
            };
        }
    }
    return img;
}
/** The unordered/task bullet character (`-`, `*`, or `+`) of a line. */
function unorderedMarkerChar(line) {
    return line.replace(/^\s*/, '').charAt(0);
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
function romanToInt(s) {
    const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
    const t = s.toLowerCase();
    let total = 0;
    for (let k = 0; k < t.length; k++) {
        const cur = map[t[k]];
        const nxt = map[t[k + 1]] ?? 0;
        total += cur < nxt ? -cur : cur;
    }
    return total;
}
// Does `marker` belong to dialect `kind`? Used to continue a list (a
// marker outside the dialect ends it, §11).
function olKindMatches(marker, kind) {
    switch (kind) {
        case 'dec':
            return /^[0-9]+$/.test(marker);
        case 'alo':
            return /^[a-z]$/.test(marker);
        case 'aup':
            return /^[A-Z]$/.test(marker);
        case 'rlo':
            return /^[ivxlcdm]+$/.test(marker);
        case 'rup':
            return /^[IVXLCDM]+$/.test(marker);
    }
}
// Classify the FIRST marker, which fixes the list dialect. A single
// ambiguous roman letter (i/v/x/l/c/d/m) is roman when the next sibling
// marker is roman of the same case, or when it is `i`/`I` (the common
// roman start); any other single letter is alphabetic.
function olKindOf(marker, nextMarker) {
    if (/^[0-9]+$/.test(marker))
        return 'dec';
    const upper = marker === marker.toUpperCase();
    const romanChars = /^[ivxlcdm]+$/i.test(marker);
    if (romanChars && marker.length > 1)
        return upper ? 'rup' : 'rlo';
    if (romanChars) {
        // Single ambiguous letter (i/v/x/l/c/d/m): tie-break on the next
        // sibling. `c. d.` is alpha (consecutive letters) while `iv. v.` /
        // `i. ii.` is roman (consecutive roman). A lone `i`/`I` defaults to
        // roman (the canonical roman start); other lone letters are alpha.
        if (nextMarker !== null && (nextMarker === nextMarker.toUpperCase()) === upper) {
            if (/^[ivxlcdm]+$/i.test(nextMarker) &&
                romanToInt(nextMarker) === romanToInt(marker) + 1) {
                return upper ? 'rup' : 'rlo';
            }
            if (/^[a-z]$/i.test(nextMarker) &&
                nextMarker.toLowerCase().charCodeAt(0) === marker.toLowerCase().charCodeAt(0) + 1) {
                return upper ? 'aup' : 'alo';
            }
        }
        if (marker.toLowerCase() === 'i')
            return upper ? 'rup' : 'rlo';
    }
    return upper ? 'aup' : 'alo';
}
function olStartOf(marker, kind) {
    if (kind === 'dec')
        return parseInt(marker, 10);
    if (kind === 'rlo' || kind === 'rup')
        return romanToInt(marker);
    return marker.toLowerCase().charCodeAt(0) - 96; // a=1
}
function olTypeOf(kind) {
    return kind === 'dec'
        ? ''
        : kind === 'alo'
            ? 'a'
            : kind === 'aup'
                ? 'A'
                : kind === 'rlo'
                    ? 'i'
                    : 'I';
}
// A line continues an ordered list of `kind`/`delim` (same dialect + same
// `.`/`)` delimiter).
function orderedContinues(line, kind, delim) {
    const o = RE_ORDERED.exec(line);
    return o !== null && o[3] === delim && olKindMatches(o[2], kind);
}
/**
 * A non-indented line following a list item is lazy continuation (folds into the
 * item's paragraph) UNLESS it starts a block, in which case the list ends - the
 * djot/CommonMark lazy-continuation rule. Mirrors the block dispatch in
 * `parseBlock`, minus the `%%` inline comment (which is paragraph text, not a
 * block) and the paragraph fallthrough.
 */
/**
 * Does this line OPEN a block (vs being plain prose)? Used by the compact-list
 * rule: a blank line inside a list item loosens the list only when the content
 * after it is a plain paragraph; a blank followed by a block opener keeps the
 * item tight. Lexer-free (no `:::` closer lookahead — for the loose decision a
 * `:::`-shaped opener counts as a block regardless).
 */
function lineOpensBlock(line) {
    return (RE_RAW_FENCE.test(line) ||
        RE_FENCE.test(line) ||
        RE_COMMENT_BLOCK.test(line) ||
        RE_ABBR_DEF.test(line) ||
        RE_FOOTNOTE_DEF.test(line) ||
        RE_LINK_DEF.test(line) ||
        RE_HR.test(line.trim()) ||
        RE_HEADING.test(line) ||
        RE_DEFLIST_TERM.test(line) ||
        RE_BLOCKQUOTE.test(line) ||
        RE_TASK.test(line) ||
        RE_UNORDERED.test(line) ||
        RE_ORDERED.test(line) ||
        RE_TABLE_ROW.test(line) ||
        (RE_ADMONITION_OPEN.test(line) && !RE_ADMONITION_CLOSE.test(line)) ||
        RE_DIV_OPEN.test(line));
}
function lazyContinuationEndsList(line, lexer) {
    return (RE_RAW_FENCE.test(line) ||
        RE_FENCE.test(line) ||
        RE_COMMENT_BLOCK.test(line) ||
        (RE_ADMONITION_OPEN.test(line) && !RE_ADMONITION_CLOSE.test(line)) ||
        (RE_DIV_OPEN.test(line) && divHasCloser(lexer)) ||
        RE_ABBR_DEF.test(line) ||
        RE_FOOTNOTE_DEF.test(line) ||
        RE_LINK_DEF.test(line) ||
        RE_HR.test(line.trim()) ||
        RE_HEADING.test(line) ||
        RE_DEFLIST_TERM.test(line) ||
        RE_BLOCKQUOTE.test(line) ||
        RE_TASK.test(line) ||
        RE_UNORDERED.test(line) ||
        RE_ORDERED.test(line) ||
        RE_TABLE_ROW.test(line) ||
        isBlockImageLine(line));
}
function parseList(lexer) {
    const first = lexer.peek();
    const baseIndent = leadingWhitespace(first);
    const isTask = RE_TASK.test(first);
    const isOrdered = !isTask && RE_ORDERED.test(first);
    // A change of unordered marker character (`-` vs `*` vs `+`), or of
    // ordered dialect/delimiter (decimal/alpha/roman, `.` vs `)`), starts a
    // new list (grammar PART 9 §11). The first item fixes the ordered
    // dialect; the second item's marker (if a sibling) tie-breaks an
    // ambiguous single roman letter.
    const firstMarkerChar = isOrdered ? '' : unorderedMarkerChar(first);
    const firstOrdered = isOrdered ? RE_ORDERED.exec(first) : null;
    const orderedDelim = firstOrdered ? firstOrdered[3] : '';
    let orderedKind = 'dec';
    let orderedStart = 1;
    if (firstOrdered) {
        // Tie-break the dialect on the next sibling, looking past blank lines
        // and the first item's own continuation/nested lines (indented deeper
        // than the marker) — `x.` / blank or indented body / `xi.` is still one
        // roman list.
        let k = 1;
        for (; lexer.peek(k) !== undefined; k++) {
            const ln = lexer.peek(k);
            if (ln.trim() !== '' && leadingWhitespace(ln) <= baseIndent)
                break;
        }
        const nextLine = lexer.peek(k);
        const nm = nextLine !== undefined && leadingWhitespace(nextLine) === baseIndent
            ? RE_ORDERED.exec(nextLine)
            : null;
        orderedKind = olKindOf(firstOrdered[2], nm ? nm[2] : null);
        orderedStart = olStartOf(firstOrdered[2], orderedKind);
    }
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
        // §11: a sibling with a different marker character (unordered) or a
        // different delimiter (ordered) is a new list.
        if (!isOrdered && unorderedMarkerChar(line) !== firstMarkerChar)
            break;
        if (isOrdered && !orderedContinues(line, orderedKind, orderedDelim))
            break;
        let content;
        let checked;
        if (isTask) {
            checked = m[2].toLowerCase() === 'x';
            content = m[3];
        }
        else if (isOrdered) {
            content = m[4];
        }
        else {
            content = m[2];
        }
        // Column where item content begins; deeper-indented lines belong to
        // this item (continuation paragraphs or nested lists).
        const contentCol = m[0].length - content.length;
        lexer.consume();
        // First-block item (Carve): `- +` opens an item whose body is the
        // flush-left block that follows, with no indentation. A lone `+` as the
        // sole item content is the continuation marker, not literal text
        // (`- + text` keeps `+ text` as literal content). Lets an item start
        // directly with a table, code block, quote or div at column 0.
        if (content.trim() === '+') {
            const attached = [];
            while (!lexer.eof()) {
                const a = lexer.peek();
                if (a.trim() === '')
                    break;
                const ind = leadingWhitespace(a);
                if (ind < baseIndent)
                    break;
                if (ind === baseIndent) {
                    const am = matchListMarker(a, isTask, isOrdered);
                    const sibling = am &&
                        (isOrdered
                            ? orderedContinues(a, orderedKind, orderedDelim)
                            : unorderedMarkerChar(a) === firstMarkerChar);
                    if (sibling || a.trim() === '+')
                        break;
                }
                attached.push(a.slice(baseIndent));
                lexer.consume();
            }
            const sub = new Lexer(attached.join('\n'));
            sub.abbrDefs = lexer.abbrDefs;
            sub.linkDefs = lexer.linkDefs;
            sub.footnoteDefs = lexer.footnoteDefs;
            sub.nested = true;
            sub.depth = lexer.depth + 1;
            const fbChildren = parseBlocks(sub, 0);
            const fbItem = { type: 'list-item', children: fbChildren };
            if (checked !== undefined)
                fbItem.checked = checked;
            items.push(fbItem);
            continue;
        }
        const nested = [];
        let pendingBlanks = 0;
        while (!lexer.eof()) {
            const l = lexer.peek();
            if (l.trim() === '') {
                pendingBlanks++;
                lexer.consume();
                continue;
            }
            // List-continuation marker (Carve): a lone `+` at the marker column
            // attaches the FOLLOWING flush-left block to this item without indenting
            // it. A bare `+` is never a bullet (a bullet needs `+ ` + content). It
            // injects a blank separator so the block parses on its own; the
            // compact-list rule above then keeps the item tight.
            if (leadingWhitespace(l) === baseIndent && l.trim() === '+') {
                lexer.consume();
                pendingBlanks = 0;
                nested.push('');
                while (!lexer.eof()) {
                    const a = lexer.peek();
                    if (a.trim() === '')
                        break;
                    const ind = leadingWhitespace(a);
                    if (ind < baseIndent)
                        break;
                    if (ind === baseIndent) {
                        const am = matchListMarker(a, isTask, isOrdered);
                        const sibling = am &&
                            (isOrdered
                                ? orderedContinues(a, orderedKind, orderedDelim)
                                : unorderedMarkerChar(a) === firstMarkerChar);
                        if (sibling || a.trim() === '+')
                            break;
                    }
                    nested.push(a.slice(baseIndent));
                    lexer.consume();
                }
                continue;
            }
            if (leadingWhitespace(l) >= contentCol) {
                for (let k = 0; k < pendingBlanks; k++)
                    nested.push('');
                pendingBlanks = 0;
                nested.push(l.slice(contentCol));
                lexer.consume();
            }
            else if (pendingBlanks === 0 && !lazyContinuationEndsList(l, lexer)) {
                // Lazy continuation: a non-indented line with no blank before it that
                // starts no block folds into the item's lead paragraph (djot rule). A
                // block-starting line or a blank line instead ends the list.
                nested.push(l);
                lexer.consume();
            }
            else {
                break;
            }
        }
        // Blank line(s) before the next sibling marker make the list loose.
        // The next marker must be a real sibling of THIS list: same kind and
        // (for unordered) same marker character. A blank line before a
        // different marker (`- a\n\n+ b`) separates two distinct lists
        // (§11), so it must not loosen this one.
        if (pendingBlanks > 0 && !lexer.eof()) {
            const nextLine = lexer.peek();
            if (leadingWhitespace(nextLine) === baseIndent &&
                matchListMarker(nextLine, isTask, isOrdered) &&
                (isOrdered
                    ? orderedContinues(nextLine, orderedKind, orderedDelim)
                    : unorderedMarkerChar(nextLine) === firstMarkerChar)) {
                loose = true;
            }
        }
        // Compact list blocks (Carve): an internal blank line loosens the item only
        // when the content after it is a plain paragraph (a real second paragraph).
        // A blank followed by a block opener (sub-list, quote, fence, div, heading,
        // table) keeps the item tight, so an item can carry a sub-block without the
        // list going loose. Only the tight/loose RENDERING changes; block structure
        // is unchanged. (Canonical djot renders these loose; Carve deviates here.)
        for (let k = 0; k < nested.length; k++) {
            if (nested[k] !== '')
                continue;
            let j = k + 1;
            while (j < nested.length && nested[j] === '')
                j++;
            if (j < nested.length && !lineOpensBlock(nested[j])) {
                loose = true;
                break;
            }
        }
        // Parse the lead text together with its continuation/nested lines as
        // one block sequence. Lazy continuation (an indented line with no
        // blank before it) then merges into the lead paragraph instead of
        // becoming a stray second block.
        const sub = new Lexer([content, ...nested].join('\n'));
        sub.abbrDefs = lexer.abbrDefs;
        sub.linkDefs = lexer.linkDefs;
        sub.footnoteDefs = lexer.footnoteDefs;
        sub.nested = true;
        sub.depth = lexer.depth + 1;
        const children = parseBlocks(sub, 0);
        const item = { type: 'list-item', children };
        if (checked !== undefined)
            item.checked = checked;
        items.push(item);
    }
    const list = { type: 'list', ordered: isOrdered, tight: !loose, items };
    if (isOrdered) {
        if (orderedStart !== 1)
            list.start = orderedStart;
        const t = olTypeOf(orderedKind);
        if (t)
            list.olType = t;
    }
    return list;
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
    // Collect raw cell source first; a `+` continuation row appends its
    // non-empty fragments to the previous row's *source* so an inline
    // construct spanning the line boundary is one logical cell. Inline
    // parsing happens once, after merging.
    const rawRows = [];
    let lastRaw = null;
    while (!lexer.eof() &&
        (RE_TABLE_ROW.test(lexer.peek()) || RE_TABLE_CONT.test(lexer.peek()))) {
        const line = lexer.peek();
        if (RE_TABLE_CONT.test(line)) {
            if (!lastRaw)
                break; // a continuation with no row to extend
            lexer.consume();
            splitTableRow(line).forEach((src, idx) => {
                const frag = src.trim();
                const target = lastRaw[idx];
                // A fragment on a span (`^`/`<`) column is skipped: the spec's
                // "Combined: Rowspan + Multi-line" example always places the `+`
                // rows *before* the `^` row, so they extend the real origin cell
                // (verified). A `+` after the span row is not a spec'd ordering.
                if (!frag || !target || target.span)
                    return;
                target.raw = target.raw ? `${target.raw} ${frag}` : frag;
            });
            continue;
        }
        lexer.consume();
        const raw = splitTableRow(line).map((src) => {
            const { header, span, align, content } = parseCellMarkers(src);
            const c = { header, raw: content };
            if (span)
                c.span = span;
            if (align)
                c.align = align;
            return c;
        });
        rawRows.push(raw);
        lastRaw = raw;
    }
    const rows = rawRows.map((rc) => ({
        type: 'table-row',
        cells: rc.map((c) => {
            const cell = {
                type: 'table-cell',
                header: c.header,
                children: c.span
                    ? []
                    : parseInline(c.raw, lexer.abbrDefs, lexer.linkDefs),
            };
            if (c.span)
                cell.span = c.span;
            if (c.align)
                cell.align = c.align;
            return cell;
        }),
    }));
    const table = { type: 'table', rows };
    // Optional caption ^ ...
    let lookahead = 0;
    while (!lexer.eof() && lexer.peek(lookahead)?.trim() === '')
        lookahead++;
    const next = lexer.peek(lookahead);
    if (next) {
        const cap = RE_CAPTION.exec(next);
        // §4: a caption attaches only when it immediately follows the block
        // or is separated by at most ONE blank line.
        if (cap && lookahead <= 1) {
            for (let i = 0; i <= lookahead; i++)
                lexer.consume();
            table.caption = parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs);
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
    // Skip the leading row marker: `|` (standard) or `+` (continuation)
    if (line[0] === '|' || line[0] === '+')
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
    const startLineIndex = lexer.pos;
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (ln.trim() === '')
            break;
        // Paragraph interruption (grammar PART 9 §10): a paragraph is interrupted
        // only by INVISIBLE constructs — reference definitions (link/footnote/abbr)
        // and comments — in any context, PLUS, inside nested content only, a LIST
        // MARKER (the one Carve deviation: `- a\n  - b` nests a sublist with no
        // blank line; parseList re-parses item content as nested, so the marker
        // breaks the lead paragraph and dispatches the sublist). No OTHER visible
        // block (quote, table, heading, fence, thematic break, admonition/div,
        // image, …) interrupts a paragraph without a blank line, at the top level
        // OR nested (full djot), so hard-wrapped prose never silently becomes a
        // block.
        const isInvisible = RE_LINK_DEF.test(ln) ||
            RE_FOOTNOTE_DEF.test(ln) ||
            RE_ABBR_DEF.test(ln) ||
            RE_COMMENT_LINE.test(ln) ||
            RE_COMMENT_BLOCK.test(ln);
        const isListMarker = RE_TASK.test(ln) || RE_UNORDERED.test(ln) || RE_ORDERED.test(ln);
        if (isInvisible || (lexer.nested && isListMarker))
            break;
        lexer.consume();
        lines.push(ln);
    }
    return {
        type: 'paragraph',
        children: parseInline(lines.join('\n'), lexer.abbrDefs, lexer.linkDefs, {
            baseOffset: lexer.lineOffset(startLineIndex),
            startLine: startLineIndex + 1,
            startColumn: 1,
        }),
    };
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
// Footnote reference `[^label]` (no `]` in the label).
const RE_FOOTNOTE_REF = /^\[\^([^\]]+)\]/;
const RE_EXTENSION = /^:([a-zA-Z][\w-]*)\[([^\]]*)\](?:\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?/;
// Raw inline passthrough tag, follows a verbatim span: `` `…`{=html} ``.
const RE_RAW_INLINE = /^\{=([a-zA-Z][\w-]*)\}/;
// Emoji shortcode `:name:` (after extension, which needs `[`).
const RE_EMOJI = /^:([a-zA-Z0-9][\w+-]*):/;
const RE_AUTOLINK = /^<([a-zA-Z][a-zA-Z0-9+.\-]*:[^>\s]+|[^\s>@]+@[^\s>]+)>/;
const RE_CROSSREF = /^<\/#([^>\s]+)>/;
const RE_INLINE_ATTR = /^\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\}/;
// Tail patterns parsed after a `[…]` (or `![…]`) whose close bracket was
// found by balance (buildBracketMap), so the inner text may hold nested
// brackets the [^\]]* regexes can't span. Link/image titles accept double OR
// single quotes (grammar link_title; an enhancement over djot, which has no
// single-quote titles); the two title groups are separate so the other quote
// may appear inside (`"it's"`, `'say "hi"'`). The {attrs} body allows `}`
// inside a quoted value and an escaped quote inside that value, so the close
// `}` is the first one outside quotes (djot "don't mind braces in quotes").
// RE_SPAN_TAIL's body is `*` so an empty `{}` matches; isValidAttrPayload then
// decides span (valid block, possibly empty) vs literal (invalid content).
const RE_LINK_TAIL = /^\(([^)\s]*)(?:\s+"([^"]*)"|\s+'([^']*)')?\)(?:\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?/;
const RE_REF_TAIL = /^\[([^\]]*)\](?:\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?/;
const RE_SPAN_TAIL = /^\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*)\}/;
/**
 * Map each `[` in `s` to the index of its balancing `]` (innermost pairing,
 * allowing nested `[...]`; a backslash-escaped bracket is skipped, not
 * counted), computed in a single O(n) stack pass. The link/image/span
 * branches look the close `]` up in O(1) rather than re-scanning to end of
 * input for every `[`, which would be O(n^2) on adversarial input like
 * `[[[[...` (with or without a trailing `]`). Unbalanced `[` are absent from
 * the map.
 */
// Resolve the verbatim (code) span opening at `i` (a backtick). The opener is
// the MAXIMAL run of backticks (`openLen`); it closes on a run of EXACTLY that
// length. An opener with no equal-length closer is opaque to the end of the
// string. `end` is the index just past the closing run, or text.length when
// unclosed; `closed` flags which. Shared by scanInline's tokenizer,
// findEmphasisClose, and buildBracketMap so all three agree on what a span hides.
function verbatimSpanEnd(text, i) {
    let openLen = 1;
    while (text[i + openLen] === '`')
        openLen++;
    let k = i + openLen;
    while (k < text.length) {
        if (text[k] === '`') {
            let m = 1;
            while (text[k + m] === '`')
                m++;
            if (m === openLen)
                return { end: k + openLen, closed: true, openLen };
            k += m;
        }
        else {
            k++;
        }
    }
    return { end: text.length, closed: false, openLen };
}
function buildBracketMap(s) {
    const map = {};
    const stack = [];
    for (let j = 0; j < s.length; j++) {
        const ch = s[j];
        if (ch === '\\') {
            j++;
            continue;
        }
        // A `[` or `]` inside a verbatim span is literal text, not a bracket — skip
        // the whole span (to its end when unclosed) so it never enters the map.
        if (ch === '`') {
            j = verbatimSpanEnd(s, j).end - 1;
            continue;
        }
        if (ch === '[') {
            stack.push(j);
        }
        else if (ch === ']') {
            const open = stack.pop();
            if (open !== undefined)
                map[open] = j;
        }
    }
    return map;
}
const RE_CRITIC_INS = /^\{\+([^}]*)\+\}/;
const RE_CRITIC_DEL = /^\{-([^}]*)-\}/;
const RE_CRITIC_SUB = /^\{~([^}]*)~>([^}]*)~\}/;
const RE_CRITIC_CMT = /^\{#([^}]*)#\}/;
// Names can include version-style dots between alnum runs (e.g. `#release-1.0`)
// but a trailing period is treated as sentence punctuation, not part of the name.
const RE_MENTION = /^@([a-zA-Z][\w-]*(?:\.\w+)*)/;
const RE_TAG = /^#([a-zA-Z][\w-]*(?:\.\w+)*)/;
// Fixed multi-character smart-typography tokens, longest first so
// `<->` beats `<-`, `---` beats `--`, `(tm)` beats `(c)`.
const SMART_TOKENS = [
    ['<->', '↔'],
    ['(tm)', '™'],
    ['...', '…'],
    ['->', '→'],
    ['<-', '←'],
    ['=>', '⇒'],
    ['<=', '≤'],
    ['>=', '≥'],
    ['!=', '≠'],
    ['+-', '±'],
    ['(c)', '©'],
    ['(r)', '®'],
];
/**
 * Allocate a run of `n` hyphens (n >= 2) into em/en dashes, matching
 * djot + carve-php: all em when divisible by 3, all en when divisible by
 * 2, otherwise max em-dashes with the remainder as en-dashes (a
 * remainder of 1 trades one em for two en). 2->–, 3->—, 4->––, 5->—–.
 */
function allocateDashes(n) {
    if (n % 3 === 0)
        return '—'.repeat(n / 3);
    if (n % 2 === 0)
        return '–'.repeat(n / 2);
    let em = Math.floor(n / 3);
    let en;
    if (n % 3 === 1) {
        em -= 1;
        en = 2;
    }
    else {
        en = 1;
    }
    return '—'.repeat(em) + '–'.repeat(en);
}
const isAlnum = (ch) => /[A-Za-z0-9]/.test(ch);
const isQuoteOpenContext = (prev) => prev === '' || /[\s([{\-–—/]/.test(prev) || prev === '“' || prev === '‘';
/**
 * Recognize one smart-typography construct at `text[i]`.
 * `prev` is the character immediately before (for contextual quotes).
 * Returns the replacement and consumed length, or null.
 */
function smartToken(text, i, prev) {
    for (const [tok, out] of SMART_TOKENS) {
        if (text.startsWith(tok, i))
            return { out, len: tok.length };
    }
    // A run of 2+ hyphens collapses to em/en dashes (djot allocation). A
    // lone `-` stays literal.
    if (text[i] === '-' && text[i + 1] === '-') {
        let n = 0;
        while (text[i + n] === '-')
            n++;
        return { out: allocateDashes(n), len: n };
    }
    const c = text[i];
    if (c === '"') {
        return { out: isQuoteOpenContext(prev) ? '“' : '”', len: 1 };
    }
    if (c === "'") {
        // Contextual single quote (matches djot): an apostrophe / closing
        // quote `’` when the previous char is alphanumeric (`it's`,
        // `John's`) OR the next char is a digit (decade elision `'70s`, and
        // `'24'` -> `’24’` as djot does); an opening quote `‘` in an open
        // context (`'word'`, `rock 'n' roll`); otherwise `’`.
        const next = text[i + 1] ?? '';
        const apostrophe = isAlnum(prev) || /[0-9]/.test(next) || !isQuoteOpenContext(prev);
        return { out: apostrophe ? '’' : '‘', len: 1 };
    }
    return null;
}
function parseInline(text, abbrDefs, linkDefs = new Map(), source = inlineSource()) {
    const nodes = applyAbbreviations(scanInline(text, source), abbrDefs);
    return applyLinkDefs(nodes, linkDefs);
}
function inlineSource(overrides = {}) {
    return {
        baseOffset: overrides.baseOffset ?? 0,
        startLine: overrides.startLine ?? 1,
        startColumn: overrides.startColumn ?? 1,
    };
}
function scanInline(text, source = inlineSource()) {
    const out = [];
    let i = 0;
    let buf = '';
    let bufStart = 0;
    // Precompute each `[`'s balancing `]` once (O(n)) so the link/image/span
    // branches resolve the close bracket in O(1); see buildBracketMap.
    const bracketClose = text.includes('[') ? buildBracketMap(text) : {};
    const flush = () => {
        if (buf) {
            out.push(withPos({ type: 'text', value: buf }, source, text, bufStart, i));
            buf = '';
        }
    };
    const append = (value) => {
        if (!buf)
            bufStart = i;
        buf += value;
    };
    while (i < text.length) {
        const c = text[i];
        const rest = text.slice(i);
        // Hard line break: a backslash at end of line (before a newline).
        if (c === '\\' && text[i + 1] === '\n') {
            flush();
            out.push(withPos({ type: 'hard-break' }, source, text, i, i + 2));
            i += 2;
            continue;
        }
        // Non-breaking space: a backslash followed by a space (djot).
        if (c === '\\' && text[i + 1] === ' ') {
            append('\u00a0');
            i += 2;
            continue;
        }
        // Escape: a backslash before any ASCII punctuation yields that literal
        // character (djot / grammar `ascii_punctuation` — the full set, including
        // `& : ; ?`).
        if (c === '\\' && i + 1 < text.length) {
            const nxt = text[i + 1];
            if (/[\\`*_{}\[\]()#+\-.!~^/<>@%|=,"'$&:;?]/.test(nxt)) {
                append(nxt);
                i += 2;
                continue;
            }
        }
        // Smart typography (grammar.ebnf §"Smart Typography", PART 9 §8).
        // Runs after the escape check, so `\->` etc. are already absorbed
        // into buf as literals and never reach here. Inside code is handled
        // by the opaque code branch below (continues before this on a
        // backtick). Multi-char tokens are matched longest-first.
        {
            // Quote context: the char in buf, else (buf flushed by a prior
            // inline node like code/emphasis/link) treat it as word-adjacent
            // so a closing quote stays closing; only true start is "".
            const prevForQuote = buf.length
                ? buf[buf.length - 1]
                : out.length
                    ? 'x'
                    : '';
            const st = smartToken(text, i, prevForQuote);
            if (st) {
                append(st.out);
                i += st.len;
                continue;
            }
        }
        // Trailing (inline) line comment: `%%` preceded by whitespace or at the
        // start of the run consumes to the next newline (or end of input). The
        // preceding whitespace is absorbed so the visible text keeps no trailing
        // space; the terminating newline stays and becomes a soft break. `%%`
        // inside a code span never reaches here (code is consumed opaquely), and
        // `\%%` is already handled by the escape branch. (§4.13, grammar
        // inline_comment.)
        if (c === '%' && text[i + 1] === '%' && (i === 0 || /[ \t]/.test(text[i - 1]))) {
            // Absorb the whitespace run immediately before `%%` so the visible text
            // keeps no trailing space. Flush the trimmed buffer with a source span
            // that ends where that whitespace begins, and start the comment node
            // there too, keeping inline source spans contiguous.
            const trimmed = buf.replace(/[ \t]+$/, '');
            const commentStart = i - (buf.length - trimmed.length);
            if (trimmed) {
                out.push(withPos({ type: 'text', value: trimmed }, source, text, bufStart, commentStart));
            }
            buf = '';
            const nl = text.indexOf('\n', i);
            const end = nl === -1 ? text.length : nl;
            const content = text.slice(i + 2, end).replace(/^[ \t]/, '');
            out.push(withPos({ type: 'comment', block: false, content }, source, text, commentStart, end));
            i = end;
            continue;
        }
        // Inline verbatim (code span). The opening run is the MAXIMAL run of
        // backticks; it closes only on a run of EXACTLY the same length (a shorter
        // OR longer run is content). An opener with no equal-length closer still
        // opens a verbatim span that runs to the END of the block — matches djot
        // upstream + carve-php (grammar code_span, "UNCLOSED RUN"). Uses the shared
        // verbatimSpanEnd helper so the tokenizer, findEmphasisClose, and
        // buildBracketMap stay in lockstep on span boundaries.
        if (c === '`') {
            const { end, closed, openLen } = verbatimSpanEnd(text, i);
            flush();
            if (!closed) {
                // Unclosed: verbatim to end of block, with the block's trailing
                // whitespace stripped (no surrounding single-space strip — that applies
                // only to a closed span).
                const value = text.slice(i + openLen).replace(/\s+$/, '');
                out.push(withPos({ type: 'code', value }, source, text, i, text.length));
                i = text.length;
                continue;
            }
            const inner = text.slice(i + openLen, end - openLen).replace(/^ (.*) $/, '$1');
            // A verbatim span tagged `{=format}` is raw inline passthrough.
            const raw = RE_RAW_INLINE.exec(text.slice(end));
            if (raw) {
                const len = end - i + raw[0].length;
                out.push(withPos({ type: 'raw-inline', format: raw[1], content: inner }, source, text, i, i + len));
                i += len;
            }
            else {
                out.push(withPos({ type: 'code', value: inner }, source, text, i, end));
                i = end;
            }
            continue;
        }
        // Math (djot form): inline $`x`, display $$`x`. A bare `$` not
        // followed by a backtick run (e.g. currency `$5`) stays literal.
        if (c === '$') {
            const display = text[i + 1] === '$';
            const dollarLen = display ? 2 : 1;
            if (text[i + dollarLen] === '`') {
                const mm = /^(`+)([\s\S]*?[^`])(\1)(?!`)/.exec(text.slice(i + dollarLen));
                if (mm) {
                    flush();
                    const content = mm[2].replace(/^ (.*) $/, '$1');
                    const len = dollarLen + mm[0].length;
                    out.push(withPos({ type: 'math', display, content }, source, text, i, i + len));
                    i += len;
                    continue;
                }
            }
        }
        // Image ![alt](src) — the alt text allows nested balanced [...], so the
        // close `]` is found by balance, not a [^\]]* regex that would mis-split
        // a nested bracket (e.g. `![a [b] c](/u)`). Alt is raw text, not inline.
        if (c === '!' && text[i + 1] === '[') {
            const closeAbs = bracketClose[i + 1];
            const close = closeAbs === undefined ? -1 : closeAbs - i;
            if (close > 1) {
                const ml = RE_LINK_TAIL.exec(rest.slice(close + 1));
                if (ml) {
                    flush();
                    const img = { type: 'image', src: ml[1], alt: rest.slice(2, close) };
                    const title = ml[2] ?? ml[3];
                    if (title)
                        img.title = title;
                    let len = close + 1 + ml[0].length;
                    if (ml[4]) {
                        const a = parseAttrs(ml[4]);
                        // An empty-attr trailing `{…}` is literal, not consumed.
                        if (isEmptyAttrs(a))
                            len -= ml[4].length + 2;
                        else
                            img.attrs = a;
                    }
                    out.push(withPos(img, source, text, i, i + len));
                    i += len;
                    continue;
                }
            }
        }
        // Link / reference link / footnote / span. The bracket text may contain
        // nested balanced [...] (djot: `[a [b] c](/u)`, `[[x](y)](z)`), so the
        // matching close `]` is found by balance — not a [^\]]* regex that would
        // mis-split at the first inner `]`. The (url) / [ref] / {attrs} tail is
        // then parsed by the same sub-patterns the old fast-path regexes used.
        if (c === '[') {
            const closeAbs = bracketClose[i];
            const close = closeAbs === undefined ? -1 : closeAbs - i;
            if (close > 0) {
                const innerText = rest.slice(1, close);
                const tail = rest.slice(close + 1);
                // Inline link [text](url "title"){attrs}
                const ml = RE_LINK_TAIL.exec(tail);
                if (ml) {
                    flush();
                    const link = {
                        type: 'link',
                        href: ml[1],
                        children: scanInline(innerText, shiftSource(source, text, i + 1)),
                    };
                    const title = ml[2] ?? ml[3];
                    if (title)
                        link.title = title;
                    let len = close + 1 + ml[0].length;
                    if (ml[4]) {
                        const a = parseAttrs(ml[4]);
                        // An empty-attr trailing `{…}` is literal, not consumed.
                        if (isEmptyAttrs(a))
                            len -= ml[4].length + 2;
                        else
                            link.attrs = a;
                    }
                    out.push(withPos(link, source, text, i, i + len));
                    i += len;
                    continue;
                }
                // Reference link [text][ref]{attrs}; collapsed [text][] reuses the
                // text as the label. Text must be non-empty (djot).
                const mref = RE_REF_TAIL.exec(tail);
                if (mref && innerText !== '') {
                    flush();
                    let len = close + 1 + mref[0].length;
                    let attrs;
                    if (mref[2]) {
                        const a = parseAttrs(mref[2]);
                        // An empty-attr trailing `{…}` is literal, not consumed.
                        if (isEmptyAttrs(a))
                            len -= mref[2].length + 2;
                        else
                            attrs = a;
                    }
                    const refLink = {
                        type: 'link',
                        href: '',
                        children: scanInline(innerText, shiftSource(source, text, i + 1)),
                        ref: mref[1] !== '' ? mref[1] : innerText,
                        // rawRef includes any consumed trailing {attrs} so the literal
                        // fallback for an unresolved ref preserves the full source.
                        rawRef: rest.slice(0, len),
                    };
                    if (attrs)
                        refLink.attrs = attrs;
                    out.push(withPos(refLink, source, text, i, i + len));
                    i += len;
                    continue;
                }
            }
            // Footnote reference [^label] — before span, so `[^x]{.c}` stays a
            // footnote ref (the `{.c}` then attaches via the inline-attr pass)
            // rather than becoming a <span> of `^x`. Footnote labels hold no
            // nested brackets, so its own regex stays authoritative.
            const mfn = RE_FOOTNOTE_REF.exec(rest);
            if (mfn) {
                flush();
                out.push(withPos({ type: 'footnote', id: mfn[1].trim() }, source, text, i, i + mfn[0].length));
                i += mfn[0].length;
                continue;
            }
            // Inline span `[text]{attrs}` (PART 9 §14). After links so `[t](u)` /
            // `[t][r]` win; the `{` must directly abut `]`. A bracket followed by a
            // VALID attribute block forms a span -- including an empty one (`[x]{}`,
            // `[x]{ }` -> empty <span>, matching djot). An INVALID block (`{???}`,
            // `{=y=}`) is not an attribute block, so it stays literal.
            if (close > 0) {
                const innerText = rest.slice(1, close);
                const ms = RE_SPAN_TAIL.exec(rest.slice(close + 1));
                if (ms && isValidAttrPayload(ms[1])) {
                    flush();
                    out.push({
                        type: 'span',
                        children: scanInline(innerText, shiftSource(source, text, i + 1)),
                        attrs: parseAttrs(ms[1]),
                        pos: sourcePos(source, text, i, i + close + 1 + ms[0].length),
                    });
                    i += close + 1 + ms[0].length;
                    continue;
                }
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
                    content: scanInline(m[2], shiftSource(source, text, i + m[0].indexOf('[') + 1)),
                };
                if (m[3])
                    ext.attrs = parseAttrs(m[3]);
                out.push(withPos(ext, source, text, i, i + m[0].length));
                i += m[0].length;
                continue;
            }
            // Emoji shortcode `:name:` (after extension, which needs `[`).
            const em = RE_EMOJI.exec(rest);
            if (em) {
                flush();
                out.push(withPos({ type: 'emoji', name: em[1] }, source, text, i, i + em[0].length));
                i += em[0].length;
                continue;
            }
        }
        // Autolink <url>
        if (c === '<') {
            const cr = RE_CROSSREF.exec(rest);
            if (cr) {
                flush();
                const cref = { type: 'crossref', target: cr[1] };
                cref.pos = sourcePos(source, text, i, i + cr[0].length);
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
                let consumed = m[0].length;
                // Optional trailing {attrs} (djot): `<url>{.c}`. An explicit
                // `href` in the block is ignored -- the structural href wins
                // (djot + carve-php), so it never produces a duplicate attribute.
                const am = /^\{([^}\n]+)\}/.exec(text.slice(i + consumed));
                if (am) {
                    const attrs = parseAttrs(am[1]);
                    if (!isEmptyAttrs(attrs)) {
                        // A real attribute block: consume it (so it is not
                        // re-processed). Drop a structural `href` so it never
                        // duplicates the autolink's own href (djot + carve-php).
                        if (attrs.keyValues?.href !== undefined) {
                            delete attrs.keyValues.href;
                            if (attrs.order)
                                attrs.order = attrs.order.filter((s) => s !== 'href');
                        }
                        if (!isEmptyAttrs(attrs))
                            auto.attrs = attrs;
                        consumed += am[0].length;
                    }
                }
                out.push(withPos(auto, source, text, i, i + consumed));
                i += consumed;
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
                    pos: sourcePos(source, text, i, i + sub[0].length),
                });
                i += sub[0].length;
                continue;
            }
            const ins = RE_CRITIC_INS.exec(rest);
            if (ins) {
                flush();
                out.push(withPos({ type: 'critic-insert', children: scanInline(ins[1], shiftSource(source, text, i + 2)) }, source, text, i, i + ins[0].length));
                i += ins[0].length;
                continue;
            }
            const del = RE_CRITIC_DEL.exec(rest);
            if (del) {
                flush();
                out.push(withPos({ type: 'critic-delete', children: scanInline(del[1], shiftSource(source, text, i + 2)) }, source, text, i, i + del[0].length));
                i += del[0].length;
                continue;
            }
            const cmt = RE_CRITIC_CMT.exec(rest);
            if (cmt) {
                flush();
                out.push(withPos({ type: 'critic-comment', text: cmt[1] }, source, text, i, i + cmt[0].length));
                i += cmt[0].length;
                continue;
            }
            // Inline attribute block — attaches to preceding node
            const attr = RE_INLINE_ATTR.exec(rest);
            if (attr && out.length) {
                const prev = out[out.length - 1];
                const parsed = parseAttrs(attr[1]);
                // A `{...}` that yields no real attribute is literal text (PART 9
                // §15), not an empty attribute block to attach. Without this guard a
                // payload like `{=hl=}`, `{ }`, or `{???}` after a non-text node is
                // silently consumed and dropped.
                if (prev.type !== 'text' && !isEmptyAttrs(parsed)) {
                    ;
                    prev.attrs = mergeAttrs(prev.attrs, parsed);
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
                out.push(withPos({ type: 'mention', user: m[1] }, source, text, i, i + m[0].length));
                i += m[0].length;
                continue;
            }
        }
        // Tag
        if (c === '#' && (i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1]))) {
            const m = RE_TAG.exec(rest);
            if (m) {
                flush();
                out.push(withPos({ type: 'tag', name: m[1] }, source, text, i, i + m[0].length));
                i += m[0].length;
                continue;
            }
        }
        // Emphasis-family delimiters
        const em = matchEmphasis(text, i, source);
        if (em) {
            flush();
            out.push(withPos(em.node, source, text, i, em.end));
            i = em.end;
            continue;
        }
        // Soft break (single newline inside paragraph)
        if (c === '\n') {
            flush();
            out.push(withPos({ type: 'soft-break' }, source, text, i, i + 1));
            i++;
            continue;
        }
        append(c);
        i++;
    }
    flush();
    return out;
}
function matchEmphasis(text, i, source) {
    const c = text[i];
    // Bold-italic /*...*/  (priority over /italic/ and *bold*)
    if (c === '/' && text[i + 1] === '*') {
        const close = findClose(text, i + 2, '*/');
        if (close !== -1) {
            const inner = text.slice(i + 2, close);
            return {
                node: { type: 'bold-italic', children: scanInline(inner, shiftSource(source, text, i + 2)) },
                end: close + 2,
            };
        }
    }
    // ,,sub,, (priority over single , — n/a, just match double). A run of 3+
    // commas does not open: the doubling IS the delimiter token, so an adjacent
    // third `,` (before or after the pair) makes it literal, consistent with
    // the single-char same-delimiter adjacency rule (`**` etc.).
    if (c === ',' && text[i + 1] === ',' && text[i - 1] !== ',' && text[i + 2] !== ',') {
        const close = findClose(text, i + 2, ',,');
        if (close !== -1 && close > i + 2) {
            const inner = text.slice(i + 2, close);
            if (inner.trim() && !inner.startsWith(' ') && !inner.endsWith(' ')) {
                return {
                    node: { type: 'sub', children: scanInline(inner, shiftSource(source, text, i + 2)) },
                    end: close + 2,
                };
            }
        }
    }
    // ==highlight== (priority over single =). Likewise a run of 3+ `=` does not
    // open -- `====x====` stays literal, like `**x**`.
    if (c === '=' && text[i + 1] === '=' && text[i - 1] !== '=' && text[i + 2] !== '=') {
        const close = findClose(text, i + 2, '==');
        if (close !== -1 && close > i + 2) {
            const inner = text.slice(i + 2, close);
            if (inner.trim() && !inner.startsWith(' ') && !inner.endsWith(' ')) {
                return {
                    node: { type: 'highlight', children: scanInline(inner, shiftSource(source, text, i + 2)) },
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
            const after = text[i + 1];
            const before = text[i - 1];
            // Opener must be followed by a non-space character.
            if (!after || after === ' ' || after === '\n')
                continue;
            // No same-type nesting (spec §4.2): a bare delimiter adjacent to the
            // same delimiter (before OR after) does not open, so a doubled
            // delimiter is literal text. `**x**`, `~~x~~`, `^^x^^` stay literal,
            // uniformly with `//x//` and `__x__`. Applies to all five types.
            if (after === delim || before === delim)
                continue;
            // Italic/underline additionally can't open after a word char or `/`,
            // keeping paths/identifiers literal (a/b/c, foo_bar, snake_/case/).
            if ((delim === '/' || delim === '_') && before && /[A-Za-z0-9_/]/.test(before))
                continue;
            // Find closer that's not preceded by space
            const close = findEmphasisClose(text, i + 1, delim);
            if (close !== -1) {
                const inner = text.slice(i + 1, close);
                return {
                    node: { type, children: scanInline(inner, shiftSource(source, text, i + 1)) },
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
function withPos(node, source, text, start, end) {
    node.pos = sourcePos(source, text, start, end);
    return node;
}
function sourcePos(source, text, start, end) {
    const startPoint = pointAt(source, text, start);
    const endPoint = pointAt(source, text, end);
    return {
        startLine: startPoint.line,
        endLine: endPoint.line,
        startColumn: startPoint.column,
        endColumn: endPoint.column,
        startOffset: source.baseOffset + start,
        endOffset: source.baseOffset + end,
    };
}
function shiftSource(source, text, by) {
    const point = pointAt(source, text, by);
    return {
        baseOffset: source.baseOffset + by,
        startLine: point.line,
        startColumn: point.column,
    };
}
// Per-document cache of newline offsets for each inline text. pointAt() used to
// rescan `text` from 0 to `offset` on every token, which is O(offset) per call
// and O(n^2) across a token-dense or many-line paragraph. Caching the sorted
// newline indices once per distinct text and binary-searching makes each lookup
// O(log n). Cleared at the start of every parse() so it never outlives a
// document.
const newlineIndexCache = new Map();
function newlineIndices(text) {
    let indices = newlineIndexCache.get(text);
    if (indices === undefined) {
        indices = [];
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '\n')
                indices.push(i);
        }
        newlineIndexCache.set(text, indices);
    }
    return indices;
}
function pointAt(source, text, offset) {
    const indices = newlineIndices(text);
    // Count newlines strictly before `offset` (binary search for the insertion
    // point of `offset` in the sorted indices).
    let lo = 0;
    let hi = indices.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (indices[mid] < offset) {
            lo = mid + 1;
        }
        else {
            hi = mid;
        }
    }
    const newlinesBefore = lo;
    const line = source.startLine + newlinesBefore;
    // Column resets to 1 right after the most recent newline; with none, it
    // continues from the source's starting column.
    const column = newlinesBefore === 0
        ? source.startColumn + offset
        : offset - indices[newlinesBefore - 1];
    return { line, column };
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
        // Skip verbatim (code) spans. An unclosed run is opaque to the end of the
        // block, so no emphasis closer can follow it — the opener cannot close.
        if (ch === '`') {
            const span = verbatimSpanEnd(text, j);
            if (!span.closed)
                return -1;
            j = span.end - 1;
            continue;
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
/**
 * Resolve reference-link placeholders against the collected definitions.
 * A resolved ref becomes a normal Link; an unresolved one falls back to
 * its literal `[text][ref]` text (Djot behavior). Order-independent: the
 * definition may appear anywhere in the document (grammar §6).
 */
function applyLinkDefs(nodes, defs) {
    const out = [];
    for (const node of nodes) {
        const anyChildren = node.children;
        if (Array.isArray(anyChildren)) {
            ;
            node.children = applyLinkDefs(anyChildren, defs);
        }
        if (node.type === 'link' && node.ref !== undefined) {
            const def = defs.get(normalizeRefLabel(node.ref));
            if (def) {
                node.href = def.href;
                if (def.title !== undefined)
                    node.title = def.title;
                delete node.ref;
                delete node.rawRef;
            }
            // If unresolved, KEEP the placeholder so a post-parse pass
            // (resolveImplicitHeadingRefs in heading-ids.ts) can match it
            // against the document's parsed headings, or finalize it to
            // literal text. Falling back here would lose the link node
            // before that pass ever sees it.
            out.push(node);
            continue;
        }
        out.push(node);
    }
    return out;
}
// ============================================================================
// Attribute block parsing — {#id .class key=value key="value with spaces"}
// ============================================================================
/**
 * True when `inner` (the text between an attribute block's braces) is
 * ENTIRELY valid attribute syntax: a sequence of `#id`, `.class`, or
 * `key=value` tokens separated by whitespace/newlines, with nothing
 * left over. Used to decide whether a standalone `{...}` line is a
 * block-attribute line or literal text (PART 9 §15).
 */
function isValidAttrPayload(inner) {
    // The quoted value alternatives are escape-aware (and single-quoted as
    // well as double-quoted) so the same payloads parseAttrs accepts validate
    // as block attributes — otherwise `"a\"b"` strips only to `"a\"` and the
    // rest leaks, falsely rejecting the block.
    const stripped = inner.replace(/(?:#[\w-]+)|(?:\.[\w-]+)|(?:[\w-]+=(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+))|\s+/g, '');
    return stripped === '';
}
/** True when an attribute block parsed to no id, classes, or key=values. */
function isEmptyAttrs(attrs) {
    return (attrs.id === undefined &&
        (attrs.classes === undefined || attrs.classes.length === 0) &&
        (attrs.keyValues === undefined || Object.keys(attrs.keyValues).length === 0));
}
// Backslash before ASCII punctuation yields that character; any other
// backslash is kept literal. Mirrors the inline text-escape rule and the
// carve-php AttributeParser, applied to quoted attribute values.
function unescapeAttrValue(v) {
    return v.replace(/\\(.)/g, (whole, c) => /[\\`*_{}\[\]()#+\-.!~^/<>@%|=,"'$&:;?]/.test(c) ? c : whole);
}
export function parseAttrs(src) {
    const attrs = {};
    const order = [];
    const note = (slot) => {
        if (!order.includes(slot))
            order.push(slot);
    };
    // A key/value's value is double-quoted, single-quoted, or a bare run
    // (grammar `quoted_value = '"' … '"' | "'" … "'"`). Both quote forms
    // strip their delimiters, so `k='{y}'` yields the literal `{y}`. A
    // backslash escapes ASCII punctuation inside a quoted value, so
    // `k="a\"b"` yields the literal `a"b`.
    const re = /(?:#([\w-]+))|(?:\.([\w-]+))|(?:([\w-]+)=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+)))/g;
    let m;
    while ((m = re.exec(src))) {
        if (m[1]) {
            attrs.id = m[1];
            note('#id');
        }
        else if (m[2]) {
            attrs.classes = [...(attrs.classes ?? []), m[2]];
            note('.class');
        }
        else if (m[3]) {
            const val = m[4] !== undefined ? unescapeAttrValue(m[4])
                : m[5] !== undefined ? unescapeAttrValue(m[5])
                    : (m[6] ?? '');
            attrs.keyValues = { ...(attrs.keyValues ?? {}), [m[3]]: val };
            note(m[3]);
        }
    }
    if (order.length)
        attrs.order = order;
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
    // Merge source order: keep `a`'s order, append `b`'s new slots (a slot
    // already present keeps its earlier position; values are last-wins via
    // the merges above). §15 + source-order rendering.
    const order = [...attrOrder(a)];
    for (const slot of attrOrder(b))
        if (!order.includes(slot))
            order.push(slot);
    if (order.length)
        out.order = order;
    return out;
}
/** The attribute slots of `a` in order (its `order`, or a derived default). */
function attrOrder(a) {
    if (a.order)
        return a.order;
    const o = [];
    if (a.classes?.length)
        o.push('.class');
    if (a.id !== undefined)
        o.push('#id');
    if (a.keyValues)
        for (const k of Object.keys(a.keyValues))
            o.push(k);
    return o;
}
//# sourceMappingURL=parse.js.map