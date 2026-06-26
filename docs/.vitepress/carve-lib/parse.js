/*
 * Carve parser — linear-time, block + inline.
 *
 * Block lexer reads line by line; inline parser does a single scan
 * over each block's text content. No backtracking.
 */
import { utf8ByteLength } from './abbr-budget.js';
// Active extension matchers for the current parse() call. A module-level hook
// keeps the ~15 recursive scanInline call sites and every sub-lexer free of an
// extra threaded parameter. Parsing is synchronous; parse() saves/restores the
// previous values in a finally so nested and sequential parses stay isolated.
let activeMatchers = [];
let activeMatcherCtx = null;
const RE_HEADING = /^(#{1,6}) +(.+?)(?:\s+\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?\s*$/;
// Thematic break: a line of 3+ of the same `-`, `*`, or `_`, optionally
// separated by spaces/tabs (`---`, `- - -`, `* * *`); nothing else on the line
// (grammar thematic_break). A run alone on a line can't be emphasis (no
// content). The chars must all match, so a mixed `-*-` is not a break.
const RE_HR = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
// Info string is a single language token, optionally followed by a bracketed
// `[label]` (structured metadata; e.g. ```php [NPM] or ```[NPM]). The charset
// covers real-world tags with punctuation (c++, c#, f#, asp.net, text/html).
// After the language the opener admits, in this fixed order, an optional quoted
// "header" (carried to the `title` attribute on the <pre>; PART 9 §2) and an
// optional bracketed [label] (structured metadata a group extension may use).
// The header/label must be whitespace-separated from the preceding token; a
// glued quote/bracket (```php"x", ```php "x"[y]) or wrong order (```php [l] "h")
// is NOT a fence and falls back to inline parsing. A key="value" pair
// (```js title="x") is likewise not a fence. The first token may sit directly
// against the fence (```php / ``` php / ```[NPM] / ```"notes"). An info string
// of the form `=FORMAT` is a raw passthrough block (RE_RAW_FENCE), matched
// before this; a leading `=` therefore never starts a language token.
// Groups: 3 lang, 4|6 header (quoted, incl. quotes), 5|7|8 label (incl. brackets).
const RE_FENCE = /^(\s*)(`{3,}|~{3,})\s*(?:([a-zA-Z0-9_+#/.-]+)(?:\s+("[^"]*"))?(?:\s+(\[[^\]]*\]))?|("[^"]*")(?:\s+(\[[^\]]*\]))?|(\[[^\]]*\]))?\s*$/;
// Bullets are `-` and `*` only. Unlike Markdown/djot, `+` is not a Carve bullet
// -- it is reserved as the list-continuation marker (PART 9 §17), so a lone `+`
// is unambiguous and a `+ x` line is ordinary paragraph text. A marker is a list
// item only with non-empty content: a content-less marker (`-`, `- `, `-   ` --
// bare or trailing whitespace only) is NOT a list, it is paragraph text.
const RE_UNORDERED = /^([^\S\u00a0]*)[-*] +([\S\u00a0].*)$/;
// Ordered marker: decimal, a single letter (alpha), or a roman-numeral
// run, then `.` or `)`. The dialect is fixed by the FIRST item (see
// olKindOf); letter/roman markers are ambiguous w.r.t. paragraphs (§10).
const RE_ORDERED = /^([^\S\u00a0]*)([0-9]+|[ivxlcdm]+|[IVXLCDM]+|[a-z]|[A-Z])([.)]) +([\S\u00a0].*)$/;
// Task states (matches djot-php): `x`/`X` are checked; ` `, `-`, `_`,
// `>`, `?` are all accepted and render as an unchecked checkbox.
const RE_TASK = /^([^\S\u00a0]*)[-*] +\[([ xX\-_>?])\] +([\S\u00a0].*)$/;
// A list-item attribute block ABUTTING the marker: a bullet (`-`/`*`) or an
// ordered marker directly followed by `{...}` (no space), then the marker's
// required space and content. The brace attaches its attributes to the <li>
// (Carve addition, grammar `item_attributes`). The brace body uses the same
// quote-aware subpattern as the inline span tail (RE_SPAN_TAIL).
const RE_ITEM_ATTR = /^([^\S\u00a0]*)((?:[-*])|(?:[0-9]+|[ivxlcdm]+|[IVXLCDM]+|[a-z]|[A-Z])[.)])\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*)\}( +[\S\u00a0].*)$/;
// Strip a valid abutting `{...}` from a marker line so the bare marker regexes
// match, returning the stripped line plus the parsed attributes. Returns null
// when there is no abutting brace or the brace is not a valid attribute payload
// (then `-{...}` is not a marker and the line stays ordinary text, mirroring the
// inline-span disambiguation, grammar §14).
function extractItemAttr(line) {
    const m = RE_ITEM_ATTR.exec(line);
    if (!m)
        return null;
    if (!isValidAttrPayload(m[3]))
        return null;
    return { stripped: m[1] + m[2] + m[4], attrs: parseAttrs(m[3]) };
}
const TRIM_STRUCTURAL_RE = /^[^\S\u00a0]+|[^\S\u00a0]+$/g;
function trimStructural(text) {
    // Fast path: a line with no literal U+00A0 trims identically to native
    // String.trim() (which would also strip U+00A0, but there is none here), so
    // the hot per-line blank/HR checks stay at native speed; only a line that
    // actually carries a non-breaking space pays for the regex.
    if (!text.includes(' '))
        return text.trim();
    return text.replace(TRIM_STRUCTURAL_RE, '');
}
function isBlankLine(line) {
    // A non-existent line (past EOF) is NOT a blank line: lookahead loops must
    // terminate at EOF, not treat it as an endless run of blank lines.
    return line !== undefined && trimStructural(line) === '';
}
const RE_BLOCKQUOTE = /^>[^\S ]?(.*)$/;
// Fences are a run of 3+ colons (group 1). A longer opener nests: a
// `::::` block contains `:::` blocks, and only a bare closer of equal-or-
// greater length closes it (djot fence-length rule).
// A `:::` opener carries NO inline `{...}` attributes (strict djot): the fence
// line is `colon_fence [space type [space "header"] [space [label]]]` and
// nothing else. Any trailing `{...}` (or other text not matching that shape)
// makes it not a fence, so the line is an ordinary paragraph. Class/id attach
// via a PRECEDING `{...}` block-attribute line.
// The "header" keeps its role (admonition title / summary). The [label] is an
// inert grouping id a group extension (tabs) consumes -- the canonical
// replacement for the tabs `{label="..."}` / heading convention. Both must be
// whitespace-separated from the preceding token (PART 9 §12).
// The type word is a grammar `identifier`: `(letter | '_'), {letter | digit
// | '_' | '-'}`, so it may start with an underscore (matches carve-php /
// carve-rs). Groups: 2 kind, 3 header (quoted), 4 label (bracketed).
const RE_ADMONITION_OPEN = /^(:{3,})\s*([a-zA-Z_][\w-]*)(?:\s+("[^"]*"))?(?:\s+(\[[^\]]*\]))?\s*$/;
const RE_ADMONITION_CLOSE = /^(:{3,})\s*$/;
// Line block: the opener is `::: |` ONLY (a bare pipe type token). The old
// `::: line-block` keyword is no longer special -- it falls through to the
// admonition branch and renders as an ordinary `<div class="line-block">`
// with NO hard-break / stanza / leading-whitespace handling. Output of the
// pipe form is unchanged (`<div class="line-block">` with `<br>` breaks).
// Mirrors carve#119 / carve-php#124.
const RE_LINE_BLOCK_OPEN = /^(:{3,})[ \t]+\|[ \t]*$/;
// Hard-break block: `::: \` (colon fence + a single trailing backslash). Like
// the line block it emits a `<div>`, but with class `hardbreaks`: the body is
// parsed as ordinary blocks and soft breaks become hard breaks ONLY in the
// div's DIRECT paragraph children (nested blocks keep ordinary soft breaks),
// with no leading-whitespace preservation. carve spec #207 / 88-line-blocks;
// matches carve-rs / carve-php (carve-js was the lagging impl).
const RE_HARDBREAKS_OPEN = /^(:{3,})[ \t]+\\[ \t]*$/;
// Generic fenced div: a bare `:::` opener with NO type word (djot's generic
// container). A typed `::: word` routes to parseAdmonition. An inline
// `::: {.class}` is NOT a div (strict djot) -- use a preceding attribute
// line. A bare opener MAY carry an inert `[label]` (a typeless tab member,
// `::: [First]`) which a group extension consumes. As the FIRST token after
// the fence the label may sit directly against it (`:::[First]`), exactly as a
// code fence allows ```[NPM]; a label after a TYPE word needs a space and is
// handled by RE_ADMONITION_OPEN. Shares the `:::` closer.
// Groups: 2 label (bracketed).
const RE_DIV_OPEN = /^(:{3,})\s*(\[[^\]]*\])?\s*$/;
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
// A leading `@` label is reserved for citation defs (`[@key]: entry`, #90),
// handled by the citations extension — never a link destination.
// Per grammar.ebnf:738,741,755 the destination ends at the first whitespace;
// a following quoted run is the title. Anything else after the destination is
// ignored (not a valid title), so the definition still registers with the bare
// token as its destination -- it is NOT rejected. carve-rs matches this.
// The title groups allow a backslash-escaped quote inside (`"a\"b"`) so the run
// does not truncate at the first inner quote; the captured value is then run
// through unescapeAttrValue at consumption, matching the inline title path.
const RE_LINK_DEF = /^[^\S ]*\[(?!@)([^\]]+)\]:[^\S ]+(\S+)(?:\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?.*$/;
// Footnote definition `[^label]: body`. Tested before RE_LINK_DEF, which
// would otherwise capture `^label` as a link reference label.
const RE_FOOTNOTE_DEF = /^\[\^([^\]]+)\]:\s+(.+)$/;
const RE_CAPTION = /^\^\s+(.+)$/;
const RE_TABLE_ROW = /^\|/;
// A complete standard table row opens AND closes with `|` (grammar
// standard_row). A stray leading `|` with no closing `|` (`| a`) is ordinary
// paragraph text, not a table -- so a table opener / interrupter must have the
// trailing pipe, not just a leading one. A row may carry an attribute block
// GLUED to its closing pipe (`| a |{.x}` -> <tr class="x">); rowAttrsFromLine
// validates and strips it, so the gate allows an optional trailing `{...}`.
const isTableRow = (line) => RE_TABLE_ROW.test(line) &&
    (/\|[ \t]*$/.test(line) || rowAttrsFromLine(line).attrs !== undefined) &&
    splitTableRow(rowAttrsFromLine(line).body).some((cell) => cell.length > 0);
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
// Raw passthrough block: ```=FORMAT … ``` (§4.15, djot raw-block syntax). The
// info string is `=FORMAT` (a leading `=` immediately followed by the format
// name), so this never collides with RE_FENCE (whose language charset excludes
// `=`). The `=` is the block parallel of the inline raw `{=format}` attribute.
// FORMAT must follow `=` with no intervening space (```= html is not raw).
const RE_RAW_FENCE = /^(`{3,}|~{3,})\s*=([a-zA-Z][\w-]*)\s*$/;
// Comments (§4.13): a `%%%`+ line opens/closes a block comment (matched
// by length); a `%%` line is a line comment. Neither is rendered.
const RE_COMMENT_BLOCK = /^%{3,}\s*$/;
const RE_COMMENT_LINE = /^%%/;
// A bare fence-closer line (` ``` ` / `~~~`, no info), used only by the
// paragraph-interruption closer lookahead's negative cache (§10).
const RE_FENCE_CLOSER = /^\s{0,3}(`{3,}|~{3,})\s*$/;
// Maximum block-container nesting depth, applied UNIFORMLY to blockquote, list,
// fenced-div / admonition (and footnote) nesting. Each level recurses
// parseBlocks -> parseBlock -> parseContainer -> parseBlocks, so unbounded
// nesting (e.g. `> ` repeated thousands of times, a deeply indented list, or a
// stack of varied-length `:::` fences) would overflow the call stack. Every
// container sub-lexer carries `depth = parent.depth + 1` and re-enters
// parseBlockInner, where this single gate degrades the opener to literal
// paragraph text past the cap - so all container kinds flatten the same way
// rather than crashing. The same constant also bounds the inline recursion
// (see scanInline). Far above any real document; only adversarial input reaches
// it. Exported so callers/tests can assert the exact, shared cap.
export const MAX_NESTING_DEPTH = 200;
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
    // blockquote / admonition bodies). Informational only: under the §10
    // Markdown-like rule a visible block interrupts a paragraph at EVERY level
    // (top and nested) — startsInterruptingBlock no longer branches on this —
    // but sub-lexers still set it to mark their context.
    nested = false;
    // Negative cache for divHasCloser: the smallest line index from which
    // NO bare colon-fence closer of ANY length exists onward. Once a scan
    // proves that, every later bare opener (pos only advances) is O(1),
    // keeping pathological "many unclosed `:::`" input linear.
    divNoCloserFrom = Infinity;
    // Negative cache for divHasCloser keyed by fence length: fenceLen → smallest
    // line index from which no bare closer of >= that length exists onward. Keeps
    // "many `:::: word` openers + one too-short closer" input linear instead of
    // O(n²) (the any-length cache above never trips when a too-short closer is
    // present). pos only advances, so the stored start is a monotone frontier.
    divNoCloserOfLenFrom = new Map();
    // Negative cache for lineBlockHasCloser, mirroring divHasCloser for the
    // `::: |` opener. Without it, many unclosed line-block openers rescan to EOF.
    lineBlockNoCloserFrom = Infinity;
    lineBlockNoCloserOfLenFrom = new Map();
    // Negative cache for fenceHasCloser (paragraph-interruption closer
    // lookahead): the smallest line index from which NO bare fence-closer
    // line exists onward. Once proven, every later fence opener (pos only
    // advances) short-circuits, keeping "many unclosed fences" input linear.
    noFenceCloserFrom = Infinity;
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
    // Strip a single leading UTF-8 BOM (U+FEFF) at the DOCUMENT start so `﻿# T`
    // is a heading, not literal text. Only here in the root entry -- nested
    // sub-lexers (blockquote/admonition/extension bodies) keep a leading BOM
    // literal (`> ﻿# T` stays a quoted paragraph), matching carve-php / carve-rs.
    if (source.charCodeAt(0) === 0xfeff)
        source = source.slice(1);
    // Replace any NUL (U+0000) with the U+FFFD replacement character so a control
    // byte never reaches output (decided cross-impl behavior; WHATWG-style).
    if (source.includes('\0'))
        source = source.replace(/\0/g, '�');
    const lexer = new Lexer(source, opts);
    // Consume leading frontmatter first so `lexer.pos` marks the end of the
    // metadata region; the def passes and parseBlocks all start from there.
    lexer.consumeFrontmatter();
    // First pass: collect abbreviation and reference-link definitions so
    // they can be resolved regardless of document order (grammar §6).
    collectAbbrDefs(lexer);
    collectLinkDefs(lexer);
    const prevMatchers = activeMatchers;
    const prevCtx = activeMatcherCtx;
    activeMatchers = (opts.extensions ?? []).filter((e) => e.matchInline || e.matchBlock);
    activeMatcherCtx = activeMatchers.length ? makeMatcherCtx(lexer, opts) : null;
    try {
        const children = parseBlocks(lexer, 0);
        const doc = { type: 'document', children };
        // Record the source byte length so renderers can size the
        // abbreviation-expansion budget (DoS guard); see render-html/markdown/ansi.
        doc.srcByteLength = utf8ByteLength(source);
        if (lexer.frontmatter)
            doc.frontmatter = lexer.frontmatter;
        if (lexer.footnoteDefs.size)
            doc.footnoteDefs = Object.fromEntries(lexer.footnoteDefs);
        return doc;
    }
    finally {
        activeMatchers = prevMatchers;
        activeMatcherCtx = prevCtx;
    }
}
// The MatcherContext handed to an extension's matchers, bound to a specific
// lexer's definition tables. Recursive parsing resolves that lexer's defs so
// extension-parsed content behaves like core nested content, not an isolated
// snippet.
function makeMatcherCtx(lexer, opts) {
    return {
        parseInlines: (t) => parseInline(t, lexer.abbrDefs, lexer.linkDefs),
        parseBlocks: (s) => parseBlockSource(s, opts, lexer),
        linkDefs: lexer.linkDefs,
        abbrDefs: lexer.abbrDefs,
    };
}
// Recursively parse a block source for an extension's ctx.parseBlocks. Reuses
// the current activeMatchers (so nested content sees the same extensions)
// without re-entering parse() — which would reset the matcher context. The
// document's link/abbr defs are seeded first so references defined elsewhere
// resolve inside the snippet (snippet-local defs override on top), and the
// root footnote map is SHARED by reference — exactly as core nested containers
// (blockquotes/lists) do — so a footnote def inside extension-owned content
// reaches the document. While parsing, the matcher context is rebound to the
// sub-lexer so a nested matcher reading ctx.linkDefs/abbrDefs sees the
// snippet-local definitions.
function parseBlockSource(source, opts, root) {
    const sub = new Lexer(source, opts);
    // Propagate nesting depth so MAX_NESTING_DEPTH still bounds extension-owned
    // recursion (a self-recursive container matcher would otherwise stack-overflow).
    sub.depth = root.depth + 1;
    sub.nested = true;
    for (const [k, v] of root.linkDefs)
        sub.linkDefs.set(k, v);
    for (const [k, v] of root.abbrDefs)
        sub.abbrDefs.set(k, v);
    sub.footnoteDefs = root.footnoteDefs;
    collectAbbrDefs(sub);
    collectLinkDefs(sub);
    if (!activeMatchers.length)
        return parseBlocks(sub, 0);
    const prevCtx = activeMatcherCtx;
    activeMatcherCtx = makeMatcherCtx(sub, opts);
    try {
        return parseBlocks(sub, 0);
    }
    finally {
        activeMatcherCtx = prevCtx;
    }
}
// Offer the active block matchers the line at the lexer cursor, in registration
// order. On a match, advance the lexer by linesConsumed and return the node.
// Core block constructs are dispatched first (see parseBlockInner), so an
// extension only sees lines core declined.
function tryBlockMatchers(lexer) {
    const ctx = activeMatcherCtx;
    if (!ctx)
        return null;
    for (const ext of activeMatchers) {
        if (!ext.matchBlock)
            continue;
        const res = ext.matchBlock(lexer.lines, lexer.pos, ctx);
        if (res && res.linesConsumed > 0) {
            for (let k = 0; k < res.linesConsumed && !lexer.eof(); k++)
                lexer.consume();
            return res.node;
        }
    }
    return null;
}
// Offer the active inline matchers the position `pos` in `text`, in
// registration order. Returns the first match whose end advances past pos.
function tryInlineMatchers(text, pos) {
    const ctx = activeMatcherCtx;
    if (!ctx)
        return null;
    for (const ext of activeMatchers) {
        if (!ext.matchInline)
            continue;
        const res = ext.matchInline(text, pos, ctx);
        if (res && res.end > pos && res.end <= text.length)
            return res;
    }
    return null;
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
            .replace(/^[^\S\u00a0]*>[^\S\u00a0]?/, '') // blockquote (NBSP is content)
            .replace(/^[^\S\u00a0]*(?:[-*]|\d+[.)])[^\S\u00a0]+(?:\[[ xX\-_>?]\][^\S\u00a0]+)?/, ''); // list/task (NBSP is content)
    } while (line !== prev);
    return line.replace(/^[^\S\u00a0]+/, ''); // residual indentation (keep a content NBSP)
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
                def.title = unescapeAttrValue(title);
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
        if (isBlankLine(line)) {
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
            // A code fence's opener "header" becomes the `title` attribute on the
            // <pre>. Resolved here (after the pending merge) so a preceding
            // {title=...} line wins, and so the title lives on the node attrs --
            // rendered by every code-block path, including inside a code-group or a
            // caption figure (where parseFence returns a Figure wrapping the block).
            const cb = node.type === 'code-block'
                ? node
                : node.type === 'figure' && node.target.type === 'code-block'
                    ? node.target
                    : undefined;
            // An explicit {title=} wins: for a captioned block it merged onto the
            // wrapping Figure (node.attrs), otherwise onto the block itself.
            if (cb?.header !== undefined &&
                node.attrs?.keyValues?.title === undefined &&
                cb.attrs?.keyValues?.title === undefined) {
                cb.attrs = {
                    ...(cb.attrs ?? {}),
                    keyValues: { ...(cb.attrs?.keyValues ?? {}), title: cb.header },
                };
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
/**
 * Non-consuming check: is the lexer positioned on a standalone block-attribute
 * line? Mirrors tryCollectBlockAttributes' recognition without consuming, so
 * startsInterruptingBlock can break an open paragraph on a trailing `{...}`
 * line (which then floats forward via parseBlocks).
 */
function peekBlockAttributes(lexer) {
    if (!/^\s*\{/.test(lexer.peek()))
        return false;
    let collected = '';
    let n = 0;
    let closed = false;
    for (;;) {
        const ln = lexer.peek(n);
        if (ln === undefined)
            break;
        if (n > 0 && isBlankLine(ln))
            break;
        collected += (n === 0 ? '' : '\n') + ln;
        n++;
        if (ln.includes('}')) {
            closed = true;
            break;
        }
    }
    if (!closed)
        return false;
    return parseBlockAttributeRun(collected) !== null;
}
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
        if (n > 0 && isBlankLine(ln))
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
    const attrs = parseBlockAttributeRun(collected);
    if (!attrs)
        return null;
    for (let k = 0; k < n; k++)
        lexer.consume();
    return attrs;
}
function parseBlockAttributeRun(src) {
    let i = 0;
    let out = null;
    let sawBlock = false;
    while (i < src.length) {
        while (i < src.length && /\s/.test(src[i]))
            i++;
        if (i >= src.length)
            break;
        if (src[i] !== '{')
            return null;
        const start = ++i;
        let quote = null;
        let closed = false;
        for (; i < src.length; i++) {
            const ch = src[i];
            if (quote) {
                if (ch === '\\') {
                    i++;
                    continue;
                }
                if (ch === quote)
                    quote = null;
                continue;
            }
            if (ch === '"' || ch === "'") {
                quote = ch;
                continue;
            }
            if (ch === '}') {
                closed = true;
                break;
            }
        }
        if (!closed)
            return null;
        const inner = src.slice(start, i);
        // The ENTIRE payload must be valid attribute syntax (attributes +
        // whitespace, nothing else). A line like `{#todo#}` has leftover content
        // and stays literal. Empty `{}` is not a block-attribute line.
        if (!isValidAttrPayload(inner))
            return null;
        const attrs = parseAttrs(inner);
        if (isEmptyAttrs(attrs))
            return null;
        out = out ? mergeAttrs(out, attrs) : attrs;
        sawBlock = true;
        i++;
    }
    return sawBlock ? out : null;
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
    if (RE_LINE_BLOCK_OPEN.test(line) && lineBlockHasCloser(lexer))
        return parseLineBlock(lexer);
    if (RE_HARDBREAKS_OPEN.test(line) && hardBreaksHasCloser(lexer))
        return parseHardBreaksBlock(lexer);
    // A typed `::: word` admonition, like a bare `:::` div, opens ONLY when a
    // matching closer exists ahead (PART 9 §12 / grammar: `admonition = open …
    // close`). Without this guard an unterminated `::: note` swallows the rest
    // of the document into an aside.
    if (RE_ADMONITION_OPEN.test(line) &&
        !RE_ADMONITION_CLOSE.test(line) &&
        divHasCloser(lexer))
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
    if (RE_HR.test(trimStructural(line))) {
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
    if (RE_TASK.test(line) ||
        RE_UNORDERED.test(line) ||
        RE_ORDERED.test(line) ||
        extractItemAttr(line) !== null)
        return parseList(lexer);
    if (isTableRow(line))
        return parseTable(lexer);
    if (isBlockImageLine(line))
        return parseBlockImage(lexer);
    // Extension block matchers run after every core construct, before the
    // paragraph fallback: extensions add syntax, they never hijack core.
    if (activeMatchers.length) {
        const matched = tryBlockMatchers(lexer);
        if (matched)
            return matched;
    }
    // A line that is nothing but a display-math span (`$$`…``) standalone on its
    // block is a candidate EQUATION; when a caption follows it is numbered like a
    // figure/table/listing (#87). Diverted here, before the paragraph fallback,
    // because parseParagraph would otherwise fold the caption line into the math
    // paragraph.
    if (line.trimStart().startsWith('$$`')) {
        const eq = parseEquationBlock(lexer);
        if (eq)
            return eq;
    }
    return parseParagraph(lexer);
}
// Parse a standalone display-math line, optionally wrapping it in a figure when
// a caption follows (a numbered equation). Returns null when the line is not
// solely display math, or when non-blank prose follows with no blank line (so
// the line belongs to a normal multi-line paragraph instead).
function parseEquationBlock(lexer) {
    // Mirror parseParagraph's leading-whitespace strip + base-position folding so
    // an indented standalone equation is still recognized and the math span keeps
    // its true source offset.
    const lineIndex = lexer.pos;
    const raw = lexer.peek();
    const firstLead = raw.match(/^[ \t]+/)?.[0].length ?? 0;
    const inline = parseInline(raw.replace(/^[ \t]+/, ''), lexer.abbrDefs, lexer.linkDefs, {
        baseOffset: lexer.lineOffset(lineIndex) + firstLead,
        startLine: lineIndex + 1,
        startColumn: 1 + firstLead,
    });
    if (inline.length !== 1)
        return null;
    const only = inline[0];
    if (only.type !== 'math' || !only.display)
        return null;
    // First non-blank line after the math line, and how many blanks precede it.
    let la = 1;
    while (isBlankLine(lexer.peek(la)))
        la++;
    const after = lexer.peek(la);
    const blanks = la - 1;
    const cap = after !== undefined ? RE_CAPTION.exec(after) : null;
    const para = { type: 'paragraph', children: inline };
    // §4: a caption attaches across at most one blank line.
    if (cap && blanks <= 1) {
        for (let i = 0; i <= la; i++)
            lexer.consume();
        return {
            type: 'figure',
            target: para,
            caption: parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs, undefined, true),
        };
    }
    // Non-blank, non-caption text immediately follows: let parseParagraph fold
    // the math and that text into one paragraph (preserve existing behavior).
    if (after !== undefined && blanks === 0)
        return null;
    // Standalone display math with no caption: a plain single-math paragraph.
    lexer.consume();
    return para;
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
function parseHeading(lexer) {
    const lineIndex = lexer.pos;
    const line = lexer.consume();
    const m = RE_HEADING.exec(line);
    const level = m[1].length;
    // Carve headings are multi-line: the text spills onto following lines until a
    // blank line. A continuation line may carry the same number of `#` (stripped)
    // or none; a heading marker with a different count (more OR fewer) starts a
    // NEW heading, and a caption (`^ …`) or fenced comment (`%%%`) ends the
    // heading. A block-opener (list/quote/table/fence/div/thematic break) ALSO
    // ends it and starts that block, exactly as it interrupts a paragraph (§10)
    // -- only plain text folds.
    let text = line.replace(/^#{1,6} +/, '');
    const sameLevel = new RegExp(`^#{${level}} +(.+)$`);
    while (!lexer.eof()) {
        const next = lexer.peek();
        if (isBlankLine(next))
            break;
        const cont = sameLevel.exec(next);
        if (cont) {
            text += '\n' + cont[1];
            lexer.consume();
            continue;
        }
        if (/^#{1,6}( |$)/.test(next) || RE_CAPTION.test(next) || RE_COMMENT_BLOCK.test(next)) {
            break;
        }
        // A block-opener ends the heading and starts that block (§10), so only
        // plain text continuation lines fold into the heading. A list marker also
        // ends the heading (it folds only into a paragraph, not a heading).
        if (endsHeadingOrQuote(lexer))
            break;
        text += '\n' + next;
        lexer.consume();
    }
    const node = { type: 'heading', level, children: [] };
    // djot-strict: a heading takes its attributes on the PRECEDING block-
    // attribute line (§15), not as a trailing `{…}` on its own line. A `{…}`
    // at the end of the heading text is therefore ordinary inline content.
    // Column where the content starts on the first line (the marker + spaces).
    const textColumn = line.length - line.replace(/^#{1,6} +/, '').length + 1;
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
    // Header is the quoted group (with or without a language); label is the
    // bracketed group from whichever alternative matched. Strip the delimiters.
    const headerRaw = m[4] ?? m[6];
    const labelRaw = m[5] ?? m[7] ?? m[8];
    const header = headerRaw ? headerRaw.slice(1, -1) : undefined;
    const label = labelRaw ? labelRaw.slice(1, -1) : undefined;
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
    if (header !== undefined)
        cb.header = header;
    if (label !== undefined)
        cb.label = label;
    // Optional caption (`^ …`): a captioned code block is a numbered LISTING,
    // wrapped in a figure exactly like a captioned image/blockquote/table.
    let lookahead = 0;
    while (!lexer.eof() && isBlankLine(lexer.peek(lookahead)))
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
                target: cb,
                caption: parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs, undefined, true),
            };
        }
    }
    return cb;
}
// Raw passthrough block: ```=FORMAT … ``` . Content is verbatim; the
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
    // A comment fence delimiter is STRUCTURAL, not content: match the opener and
    // closer with native trim (treating any whitespace, incl. U+00A0, as
    // insignificant) so a stray non-breaking space cannot desync the closer and
    // swallow the rest of the document.
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
        if (isBlankLine(ln)) {
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
    // The opener carries an optional quoted title only (grammar
    // quoted_title; PART 9 §12). The quotes delimit the title and are
    // stripped (not part of the rendered text); an explicitly empty `""`
    // still counts as a supplied (empty) title. No inline attributes -- the
    // opener regex already rejected any trailing `{...}`.
    const titleText = m[3] !== undefined ? m[3].slice(1, -1) : undefined;
    // Optional inert grouping `[label]` (PART 9 §12): a group extension (tabs)
    // uses it as the tab name; core does not render it.
    const label = m[4] !== undefined ? m[4].slice(1, -1) : undefined;
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
    if (label !== undefined) {
        node.label = label;
    }
    // No inline opener attributes (strict djot): a preceding block-attribute
    // line is the only way to attribute an admonition, and parseBlocks
    // applies it to the returned node.
    return node;
}
function lineBlockHasCloser(lexer) {
    const start = lexer.pos + 1;
    if (start >= lexer.lineBlockNoCloserFrom)
        return false;
    const fence = RE_LINE_BLOCK_OPEN.exec(lexer.peek())[1].length;
    if (start >= (lexer.lineBlockNoCloserOfLenFrom.get(fence) ?? Infinity))
        return false;
    let sawAnyCloser = false;
    for (let i = start; i < lexer.lines.length; i++) {
        const c = RE_ADMONITION_CLOSE.exec(lexer.lines[i]);
        if (c) {
            sawAnyCloser = true;
            if (c[1].length >= fence)
                return true;
        }
    }
    const prev = lexer.lineBlockNoCloserOfLenFrom.get(fence) ?? Infinity;
    if (start < prev)
        lexer.lineBlockNoCloserOfLenFrom.set(fence, start);
    if (!sawAnyCloser)
        lexer.lineBlockNoCloserFrom = start;
    return false;
}
function parseLineBlock(lexer) {
    const open = lexer.consume();
    const m = RE_LINE_BLOCK_OPEN.exec(open);
    const fence = m[1].length;
    const stanzas = [];
    let stanza = [];
    while (!lexer.eof()) {
        const ln = lexer.peek();
        const c = RE_ADMONITION_CLOSE.exec(ln);
        if (c && c[1].length >= fence) {
            lexer.consume();
            break;
        }
        lexer.consume();
        if (isBlankLine(ln)) {
            if (stanza.length) {
                stanzas.push(stanza);
                stanza = [];
            }
            continue;
        }
        stanza.push(expandLineBlockLeadingWhitespace(ln));
    }
    if (stanza.length)
        stanzas.push(stanza);
    const children = stanzas.map((lines) => ({
        type: 'paragraph',
        children: parseInline(lines.join('\n'), lexer.abbrDefs, lexer.linkDefs).map((node) => node.type === 'soft-break' ? { type: 'hard-break' } : node),
    }));
    // No inline opener attributes (strict djot); a preceding block-attribute
    // line merges onto this div in parseBlocks.
    const node = {
        type: 'div',
        attrs: { classes: ['line-block'], order: ['.class'] },
        children,
    };
    return node;
}
function expandLineBlockLeadingWhitespace(line) {
    let i = 0;
    let columns = 0;
    while (i < line.length) {
        const ch = line[i];
        if (ch === ' ')
            columns++;
        else if (ch === '\t')
            columns += 4 - (columns % 4);
        else
            break;
        i++;
    }
    // Use the internal non-breaking-space placeholder (U+E000) - the same
    // private-use sentinel as an escaped space - so the indent never collides
    // with a literal U+00A0 in the author's text and is converted per renderer
    // (HTML &nbsp;, Markdown U+00A0, plain/ANSI an ordinary space).
    return '\ue000'.repeat(columns) + line.slice(i);
}
// Whether a `::: \` hard-break opener at peek(0) has a matching bare `:::`
// closer of equal-or-greater colon length ahead. The closer is the same bare
// `:::` the line block uses, so this reuses the line-block negative caches.
function hardBreaksHasCloser(lexer) {
    const start = lexer.pos + 1;
    if (start >= lexer.lineBlockNoCloserFrom)
        return false;
    const fence = RE_HARDBREAKS_OPEN.exec(lexer.peek())[1].length;
    if (start >= (lexer.lineBlockNoCloserOfLenFrom.get(fence) ?? Infinity))
        return false;
    let sawAnyCloser = false;
    for (let i = start; i < lexer.lines.length; i++) {
        const c = RE_ADMONITION_CLOSE.exec(lexer.lines[i]);
        if (c) {
            sawAnyCloser = true;
            if (c[1].length >= fence)
                return true;
        }
    }
    const prev = lexer.lineBlockNoCloserOfLenFrom.get(fence) ?? Infinity;
    if (start < prev)
        lexer.lineBlockNoCloserOfLenFrom.set(fence, start);
    if (!sawAnyCloser)
        lexer.lineBlockNoCloserFrom = start;
    return false;
}
// `::: \` hard-break block. Unlike the line block, the body is parsed as
// ordinary blocks (so nested admonitions / lists work); soft breaks are then
// promoted to hard breaks ONLY in the div's DIRECT paragraph children, and
// there is no leading-whitespace preservation. Emits `<div class="hardbreaks">`.
function parseHardBreaksBlock(lexer) {
    const m = RE_HARDBREAKS_OPEN.exec(lexer.consume());
    const fence = m[1].length;
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
    for (const child of children) {
        if (child.type === 'paragraph') {
            child.children = child.children.map((node) => node.type === 'soft-break' ? { type: 'hard-break' } : node);
        }
    }
    return {
        type: 'div',
        attrs: { classes: ['hardbreaks'], order: ['.class'] },
        children,
    };
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
    // A bare-`:::`+ div (or typed `::: word` admonition) opens only when a bare
    // closer of equal-or-greater colon length exists ahead (otherwise the opener
    // is literal — and a longer fence must be matched by a longer closer).
    const start = lexer.pos + 1;
    if (start >= lexer.divNoCloserFrom)
        return false; // memo: no closer at all ahead
    const fence = /^(:{3,})/.exec(lexer.peek())[1].length;
    // memo: no closer of >= this fence length from here on. Without this, input
    // like thousands of `:::: word` openers followed by a single too-short `:::`
    // rescans to EOF for every opener (the "no closer at all" cache never trips
    // because a closer *is* seen, just too short) → O(n²).
    if (start >= (lexer.divNoCloserOfLenFrom.get(fence) ?? Infinity))
        return false;
    let sawAnyCloser = false;
    for (let i = start; i < lexer.lines.length; i++) {
        const c = RE_ADMONITION_CLOSE.exec(lexer.lines[i]);
        if (c) {
            sawAnyCloser = true;
            if (c[1].length >= fence)
                return true;
        }
    }
    // No closer of length >= fence ahead. Cache it per fence length (pos only
    // advances, so the smallest such start is a monotone frontier); also cache
    // the stronger "no bare closer at all" when that holds.
    const prev = lexer.divNoCloserOfLenFrom.get(fence) ?? Infinity;
    if (start < prev)
        lexer.divNoCloserOfLenFrom.set(fence, start);
    if (!sawAnyCloser)
        lexer.divNoCloserFrom = start;
    return false;
}
function parseDiv(lexer) {
    const m = RE_DIV_OPEN.exec(lexer.consume());
    const fence = m[1].length;
    // Optional inert grouping `[label]` on a typeless div (`::: [First]`).
    const label = m[2] !== undefined ? m[2].slice(1, -1) : undefined;
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
    // No inline opener attributes (strict djot): a bare `:::` carries none;
    // a preceding block-attribute line attaches them in parseBlocks.
    const node = { type: 'div', children: parseBlocks(subLexer, 0) };
    if (label !== undefined) {
        node.label = label;
    }
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
            if (!isBlankLine(ln) && leadingWhitespace(ln) >= 3) {
                // Strip the structural indentation but keep a content U+00A0.
                bodyLines.push(ln.replace(/^[^\S\u00a0]+/, ''));
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
        if (!lexer.eof() && isBlankLine(lexer.peek())) {
            let look = 1;
            while (isBlankLine(lexer.peek(look)))
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
    if (isBlankLine(content)) {
        state.paragraphOpen = false;
        return;
    }
    // A heading, table row, or thematic break is an UNCONDITIONAL paragraph
    // interrupter (no matching-closer dependency), so it leaves no open trailing
    // paragraph even directly after quoted prose. A following lazy list marker
    // then ENDS the quote (it has no paragraph to fold into) -- exactly as
    // `# h\n- item` is a heading plus a sibling list at the top level, and as
    // `> a\n> # h\n- item` is a quote (para + heading) plus a sibling list.
    // Mirrors trackItemLazyState.
    if (RE_HEADING.test(content) || isTableRow(content) || RE_HR.test(trimStructural(content))) {
        state.paragraphOpen = false;
        return;
    }
    // The remaining structural openers (fence/comment/div) only start a block
    // when NO paragraph is already open: Carve has no paragraph-interrupting
    // block mode, so a fence/comment-looking line WHILE a quoted paragraph is
    // open is plain paragraph text (e.g. a mid-paragraph ``` is an inline
    // verbatim run, not a code block).
    if (!state.paragraphOpen) {
        const fence = RE_FENCE.exec(content);
        if (fence) {
            const marker = fence[2];
            state.inFence = true;
            state.fenceClose = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
            state.paragraphOpen = false;
            return;
        }
        const raw = RE_RAW_FENCE.exec(content);
        if (raw) {
            const marker = raw[1];
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
        if (RE_DIV_OPEN.test(content) ||
            RE_ADMONITION_OPEN.test(content) ||
            RE_LINE_BLOCK_OPEN.test(content) ||
            RE_HARDBREAKS_OPEN.test(content)) {
            // Div / admonition / line-block opener (`:::`, `::: type`, or `::: |`)
            // is structural; it opens no paragraph itself.
            state.paragraphOpen = false;
            return;
        }
    }
    // Everything else (plain prose, a folded list-marker line, div body text, or
    // a fence/comment-looking line while a paragraph is open) leaves an open
    // paragraph that a following list marker or plain text folds into.
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
        // Continuation marker (Carve, PART 9 §17): a lone `+` at column 0 after a
        // quoted line attaches the FOLLOWING flush-left block to the quote -- the
        // un-prefixed analogue of the list-item form, so a real block (list, fenced
        // code, table, ...) can join the quote without repeating `>`. Collect the
        // block's lines (up to a blank line, a `>` line, or a further `+`) and
        // splice them into the quote body behind a blank-line separator, so they
        // parse as their own block instead of folding into the quoted paragraph.
        if (/^\+[ \t]*$/.test(ln)) {
            lexer.consume();
            const attached = [];
            while (!lexer.eof()) {
                const next = lexer.peek();
                if (isBlankLine(next) || RE_BLOCKQUOTE.test(next) || /^\+[ \t]*$/.test(next)) {
                    break;
                }
                lexer.consume();
                attached.push(next);
            }
            if (attached.length > 0) {
                // `inner` always holds the quote's first content line, so a leading
                // blank separates the attached block from it.
                inner.push('');
                for (const attachedLine of attached)
                    inner.push(attachedLine);
                inner.push('');
                // The attached block closed any open paragraph: a following unmarked
                // line no longer lazily continues the quote.
                state.paragraphOpen = false;
            }
            continue;
        }
        // Lazy continuation: a non-`>` line folds into the quote ONLY when it is
        // plain text continuing an open paragraph (CommonMark-style; matches
        // carve-php). A blank line ends the quote. A block-opener that INTERRUPTS a
        // paragraph (§10) ends the quote too and starts that block OUTSIDE it --
        // this covers visible blocks (heading/quote/table/fence/div/thematic) and
        // the "invisible" reference/footnote/abbr definitions and comments. A bare
        // list marker is NOT a paragraph interrupter, so it FOLDS into the quoted
        // paragraph as literal text instead of ending the quote -- but ONLY when an
        // open paragraph precedes it (the `paragraphOpen` guard below). When the
        // last quoted block is a heading/table/fence/thematic break/div (no open
        // paragraph), a list marker has nothing to fold into and ENDS the quote,
        // mirroring the top level: `text\n- item` folds, `# h\n- item` is a heading
        // plus a sibling list. A caption `^ …` attaches to the quote.
        if (isBlankLine(ln) ||
            RE_CAPTION.test(ln) ||
            colonFenceShapeEndsLazyContinuation(ln) ||
            startsInterruptingBlock(lexer)) {
            break;
        }
        // A non-`>` line inside an open fence/comment, or after a block that left no
        // open paragraph (heading/table/fence/thematic/div), terminates the quote
        // instead of being swallowed. This is also what ends the quote on a lazy
        // list marker when no open paragraph precedes it.
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
    while (!lexer.eof() && isBlankLine(lexer.peek(lookahead)))
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
                caption: parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs, undefined, true),
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
    if (title !== undefined)
        img.title = title;
    if (m[5])
        img.attrs = parseAttrs(m[5]);
    // Optional caption
    let lookahead = 0;
    while (!lexer.eof() && isBlankLine(lexer.peek(lookahead)))
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
                caption: parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs, undefined, true),
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
        RE_HR.test(trimStructural(line)) ||
        RE_HEADING.test(line) ||
        RE_DEFLIST_TERM.test(line) ||
        RE_BLOCKQUOTE.test(line) ||
        RE_TASK.test(line) ||
        RE_UNORDERED.test(line) ||
        RE_ORDERED.test(line) ||
        extractItemAttr(line) !== null ||
        isTableRow(line) ||
        (RE_ADMONITION_OPEN.test(line) && !RE_ADMONITION_CLOSE.test(line)) ||
        RE_DIV_OPEN.test(line) ||
        RE_LINE_BLOCK_OPEN.test(line) ||
        RE_HARDBREAKS_OPEN.test(line));
}
function lazyContinuationEndsList(line) {
    return (RE_RAW_FENCE.test(line) ||
        RE_FENCE.test(line) ||
        RE_COMMENT_BLOCK.test(line) ||
        // A flush-left colon-fence shaped line ends list lazy continuation
        // regardless of outer-stream closer lookahead. If the line belongs to the
        // item, it must be indented and parsed by the item sub-lexer; otherwise a
        // later flush-left `:::` can be incorrectly pulled in as the item's closer.
        (RE_ADMONITION_OPEN.test(line) && !RE_ADMONITION_CLOSE.test(line)) ||
        RE_DIV_OPEN.test(line) ||
        RE_LINE_BLOCK_OPEN.test(line) ||
        RE_HARDBREAKS_OPEN.test(line) ||
        RE_ABBR_DEF.test(line) ||
        RE_FOOTNOTE_DEF.test(line) ||
        RE_LINK_DEF.test(line) ||
        RE_HR.test(trimStructural(line)) ||
        RE_HEADING.test(line) ||
        RE_DEFLIST_TERM.test(line) ||
        RE_BLOCKQUOTE.test(line) ||
        RE_TASK.test(line) ||
        RE_UNORDERED.test(line) ||
        RE_ORDERED.test(line) ||
        extractItemAttr(line) !== null ||
        isTableRow(line) ||
        isBlockImageLine(line));
}
function colonFenceShapeEndsLazyContinuation(line) {
    return ((RE_ADMONITION_OPEN.test(line) && !RE_ADMONITION_CLOSE.test(line)) ||
        RE_DIV_OPEN.test(line) ||
        RE_LINE_BLOCK_OPEN.test(line) ||
        RE_HARDBREAKS_OPEN.test(line));
}
/**
 * Track verbatim/paragraph state across a list item's collected inner lines so a
 * dedented non-blank line only lazily continues an OPEN paragraph (the
 * djot/CommonMark family-D rule, matching carve-php). Each line is passed in its
 * content-column-dedented form so the block-opener regexes key off column 0.
 *
 * Mirrors `trackBlockQuoteLazyState`, but a blockquote line (`>`) keeps the
 * fold open: the trailing quote paragraph absorbs the dedented line in the
 * quote's own lazy continuation. After a code fence or a table (no open
 * trailing paragraph) the dedented line must END the item instead.
 */
function trackItemLazyState(content, state) {
    if (state.inComment) {
        const c = /^(%{3,})\s*$/.exec(content);
        if (c && c[1].length >= state.commentLen)
            state.inComment = false;
        state.lazyFoldable = false;
        return;
    }
    if (state.inFence) {
        if (state.fenceClose.test(content))
            state.inFence = false;
        state.lazyFoldable = false;
        return;
    }
    if (isBlankLine(content)) {
        state.lazyFoldable = false;
        return;
    }
    // A code fence or raw fence opens a verbatim block with no open paragraph.
    const fence = RE_FENCE.exec(content);
    if (fence) {
        const marker = fence[2];
        state.inFence = true;
        state.fenceClose = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
        state.lazyFoldable = false;
        return;
    }
    const raw = RE_RAW_FENCE.exec(content);
    if (raw) {
        const marker = raw[1];
        state.inFence = true;
        state.fenceClose = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
        state.lazyFoldable = false;
        return;
    }
    const comment = /^(%{3,})\s*$/.exec(content);
    if (comment) {
        state.inComment = true;
        state.commentLen = comment[1].length;
        state.lazyFoldable = false;
        return;
    }
    // A table row, heading, or thematic break leaves no open trailing paragraph.
    if (isTableRow(content) || RE_HEADING.test(content) || RE_HR.test(trimStructural(content))) {
        state.lazyFoldable = false;
        return;
    }
    // A blockquote line keeps the fold open: the quote's trailing paragraph
    // absorbs the dedented line via the quote's own lazy continuation.
    if (RE_BLOCKQUOTE.test(content)) {
        state.lazyFoldable = true;
        return;
    }
    // A div / admonition / line-block OPENER is structural; it opens no paragraph
    // itself, but plain text on a later line inside it does (handled by the
    // fall-through below once the opener line has been seen).
    if (RE_DIV_OPEN.test(content) ||
        (RE_ADMONITION_OPEN.test(content) && !RE_ADMONITION_CLOSE.test(content)) ||
        RE_LINE_BLOCK_OPEN.test(content) ||
        RE_HARDBREAKS_OPEN.test(content)) {
        state.lazyFoldable = false;
        return;
    }
    // Everything else (plain prose, list-marker content, div body text) leaves an
    // open paragraph the dedented line can continue.
    state.lazyFoldable = true;
}
function parseList(lexer) {
    const first = lexer.peek();
    const baseIndent = indentColumns(first);
    // Classify on the marker after stripping any abutting `{...}` attribute block.
    const firstAttr = extractItemAttr(first);
    const firstStripped = firstAttr ? firstAttr.stripped : first;
    const isTask = RE_TASK.test(firstStripped);
    const isOrdered = !isTask && RE_ORDERED.test(firstStripped);
    // A change of unordered marker character (`-` vs `*` vs `+`), or of
    // ordered dialect/delimiter (decimal/alpha/roman, `.` vs `)`), starts a
    // new list (grammar PART 9 §11). The first item fixes the ordered
    // dialect; the second item's marker (if a sibling) tie-breaks an
    // ambiguous single roman letter.
    const firstMarkerChar = isOrdered ? '' : unorderedMarkerChar(firstStripped);
    const firstOrdered = isOrdered ? RE_ORDERED.exec(firstStripped) : null;
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
            if (!isBlankLine(ln) && indentColumns(ln) <= baseIndent)
                break;
        }
        const nextLine = lexer.peek(k);
        const nextStripped = nextLine !== undefined
            ? (extractItemAttr(nextLine)?.stripped ?? nextLine)
            : undefined;
        const nm = nextStripped !== undefined && indentColumns(nextLine) === baseIndent
            ? RE_ORDERED.exec(nextStripped)
            : null;
        orderedKind = olKindOf(firstOrdered[2], nm ? nm[2] : null);
        orderedStart = olStartOf(firstOrdered[2], orderedKind);
    }
    const items = [];
    let loose = false;
    while (!lexer.eof()) {
        const line = lexer.peek();
        if (isBlankLine(line)) {
            // Blank lines between siblings are handled by the per-item collector
            // below; a stray leading blank just ends the list.
            break;
        }
        if (indentColumns(line) !== baseIndent)
            break;
        // Strip an abutting `{...}` attribute block off the marker so the bare
        // marker regexes match; remember its attributes to attach to the <li>.
        const la = extractItemAttr(line);
        const mline = la ? la.stripped : line;
        const m = matchListMarker(mline, isTask, isOrdered);
        if (!m)
            break;
        // §11: a sibling with a different marker character (unordered) or a
        // different delimiter (ordered) is a new list.
        if (!isOrdered && unorderedMarkerChar(mline) !== firstMarkerChar)
            break;
        if (isOrdered && !orderedContinues(mline, orderedKind, orderedDelim))
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
        const itemAttrs = la ? la.attrs : undefined;
        // item (continuation paragraphs or nested lists). Visual content column:
        // baseIndent (tab-aware columns) plus the marker width in characters. The
        // marker (`- `, `1. `) and any abutting `{...}` attr block contain no tabs,
        // so their column width equals their character count; the leading
        // whitespace may be a tab, so it is measured in columns (baseIndent) rather
        // than characters. The marker/attr width is taken from the ORIGINAL line so
        // an abutting `{...}` block widens it correctly. For a TASK item the
        // checkbox is content, not marker, so the content column is the bullet
        // width (`- `/`* ` = 2) plus any abutting attr width -- not the full
        // `- [x] ` width (matching the spec's task attribute/continuation
        // convention `- [x] x` / `  {.c}`).
        const contentCol = isTask
            ? baseIndent + 2 + (la ? line.length - mline.length : 0)
            : baseIndent + (line.length - leadingWhitespace(line) - content.length);
        lexer.consume();
        // First-block item (Carve): `- +` opens an item whose body is the
        // flush-left block that follows, with no indentation. A lone `+` as the
        // sole item content is the continuation marker, not literal text
        // (`- + text` keeps `+ text` as literal content). Lets an item start
        // directly with a table, code block, quote or div at column 0.
        if (trimStructural(content) === '+') {
            const attached = [];
            while (!lexer.eof()) {
                const a = lexer.peek();
                if (isBlankLine(a))
                    break;
                const ind = indentColumns(a);
                if (ind < baseIndent)
                    break;
                if (ind === baseIndent) {
                    const am = matchListMarker(a, isTask, isOrdered);
                    const sibling = am &&
                        (isOrdered
                            ? orderedContinues(a, orderedKind, orderedDelim)
                            : unorderedMarkerChar(a) === firstMarkerChar);
                    // A base-column line that is ANY list marker (a different
                    // kind/dialect, e.g. an ordered `1.` after this unordered first-block
                    // item, or an abutting-attribute bullet `-{.x}`) starts a SIBLING
                    // list (§11), not item content -- stop attaching so it parses as a
                    // separate top-level list (Bug C, first-block `- +` path).
                    const anyMarker = RE_ORDERED.test(a) ||
                        RE_UNORDERED.test(a) ||
                        RE_TASK.test(a) ||
                        extractItemAttr(a) !== null;
                    if (sibling || anyMarker || trimStructural(a) === '+')
                        break;
                }
                attached.push(sliceColumns(a, baseIndent));
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
            if (itemAttrs)
                fbItem.attrs = itemAttrs;
            items.push(fbItem);
            continue;
        }
        const nested = [];
        // Index in `nested` where an indented ORDERED sub-list begins. Ordered
        // markers do not interrupt a paragraph (§10), so if the sub-list is joined
        // with the lead text it folds into the lead paragraph instead of nesting
        // (`1. a` / `   1. b` -> `<li>a\n1. b</li>`). Splitting it into its own block
        // stream lets it nest. Unordered/task sub-lists interrupt and already nest
        // via the join, and lazy continuation / block-attribute lines must stay on
        // the join, so only an indented ordered marker triggers the split.
        let firstBlockIdx = -1;
        let pendingBlanks = 0;
        // Indices in `nested` that hold a `+`-injected blank separator. These keep
        // the attached block parsing standalone but never loosen the list (Bug B).
        const plusSeparators = new Set();
        // Track whether the item's collected content currently ends in an open
        // paragraph (family-D lazy continuation). The lead text opens one.
        const lazyState = {
            inFence: false,
            fenceClose: null,
            inComment: false,
            commentLen: 0,
            lazyFoldable: !isBlankLine(content),
        };
        while (!lexer.eof()) {
            const l = lexer.peek();
            if (isBlankLine(l)) {
                pendingBlanks++;
                lexer.consume();
                continue;
            }
            // List-continuation marker (Carve): a lone `+` at the marker column
            // attaches the FOLLOWING flush-left block to this item without indenting
            // it. A bare `+` is never a bullet (a bullet needs `+ ` + content). It
            // injects a blank separator so the block parses on its own; the
            // compact-list rule above then keeps the item tight.
            if (indentColumns(l) === baseIndent && trimStructural(l) === '+') {
                lexer.consume();
                pendingBlanks = 0;
                // Mark this blank as a `+`-injected separator: it lets the attached
                // block parse on its own but must NOT loosen the list (Bug B). A real
                // internal blank before a plain paragraph still loosens; a `+` one
                // never does, matching carve-php.
                plusSeparators.add(nested.length);
                nested.push('');
                trackItemLazyState('', lazyState);
                while (!lexer.eof()) {
                    const a = lexer.peek();
                    if (isBlankLine(a))
                        break;
                    const ind = indentColumns(a);
                    if (ind < baseIndent)
                        break;
                    if (ind === baseIndent) {
                        const am = matchListMarker(a, isTask, isOrdered);
                        const sibling = am &&
                            (isOrdered
                                ? orderedContinues(a, orderedKind, orderedDelim)
                                : unorderedMarkerChar(a) === firstMarkerChar);
                        // A base-column line that is ANY list marker (even a different
                        // kind/dialect, e.g. an ordered `1.` after this unordered item, or
                        // an abutting-attribute bullet `-{.x}`) starts a SIBLING list
                        // (§11), not item content -- stop attaching so it parses as a
                        // separate top-level list (Bug C).
                        const anyMarker = RE_ORDERED.test(a) ||
                            RE_UNORDERED.test(a) ||
                            RE_TASK.test(a) ||
                            extractItemAttr(a) !== null;
                        if (sibling || anyMarker || trimStructural(a) === '+')
                            break;
                    }
                    const attached = sliceColumns(a, baseIndent);
                    nested.push(attached);
                    trackItemLazyState(attached, lazyState);
                    lexer.consume();
                }
                continue;
            }
            // A block opener (block quote, heading, fence, div, table) indented past
            // the base but BELOW the content column still interrupts the item's lead
            // paragraph and nests as a child block (matching carve-php) -- only ordered
            // MARKERS fold below the content column, since they do not interrupt. The
            // opener regexes key off column 0, so test the line dedented to column 0,
            // and exclude list markers (their fold/nest is handled in the else-branch).
            const lw = indentColumns(l);
            let belowColBlockOpener = false;
            if (lw > baseIndent && lw < contentCol) {
                const d0 = sliceColumns(l, lw);
                // A block opener indented past the base but below the content column
                // interrupts the item's lead paragraph and nests (matching carve-php).
                // Restricted to NON-container openers (block quote, heading, thematic
                // break, table, defs): these need no closing fence, so the single line
                // dedented to column 0 is enough. Fenced/`:::` containers are excluded --
                // their verbatim/closer-sensitive bodies are only handled cleanly AT the
                // content column; below it they keep the existing behavior. List markers
                // are excluded too (their fold/nest is decided in the else-branch).
                belowColBlockOpener =
                    !RE_ORDERED.test(d0) &&
                        !RE_UNORDERED.test(d0) &&
                        !RE_TASK.test(d0) &&
                        // An abutting-attr bullet (`-{.x} item`) is a list marker too, so it
                        // folds below the content column like a plain bullet (it does not
                        // interrupt). Excluded here so it is not treated as a nesting opener.
                        extractItemAttr(d0) === null &&
                        !RE_FENCE.test(d0) &&
                        !RE_RAW_FENCE.test(d0) &&
                        !RE_DIV_OPEN.test(d0) &&
                        !RE_ADMONITION_OPEN.test(d0) &&
                        lineOpensBlock(d0);
            }
            if (lw >= contentCol || belowColBlockOpener) {
                for (let k = 0; k < pendingBlanks; k++) {
                    nested.push('');
                    trackItemLazyState('', lazyState);
                }
                pendingBlanks = 0;
                // A sub-list marker (ordered, unordered, or task) at or past the content
                // column starts the item's block stream. A sub-list MARKER line is
                // dedented residual-aware so tab+space-aligned siblings keep the same
                // visual column (the recursive parse re-derives the child base from it).
                // Every other line -- lead text, and block openers (quotes, headings)
                // before OR after a sub-list -- uses whole-tab dedent so it reaches
                // column 0 and parses / interrupts; carry the residual only on markers.
                const isMarker = RE_ORDERED.test(l) ||
                    RE_UNORDERED.test(l) ||
                    RE_TASK.test(l) ||
                    // An abutting-attr bullet (`-{.x} item`) is a marker too. It no longer
                    // reaches here via §10 interruption (bullets do not interrupt), so the
                    // sub-list nesting path must recognize it directly to keep nesting.
                    extractItemAttr(l) !== null;
                if (firstBlockIdx === -1 && isMarker) {
                    firstBlockIdx = nested.length;
                }
                const keepResidual = firstBlockIdx !== -1 && isMarker;
                const dedented = sliceColumns(l, contentCol, keepResidual);
                nested.push(dedented);
                trackItemLazyState(dedented, lazyState);
                lexer.consume();
            }
            else if (pendingBlanks === 0 &&
                // A dedented (below content-column) plain line only lazily continues an
                // OPEN paragraph (family-D rule). After a code fence or table -- which
                // leave no open paragraph -- the line ends the item and becomes a
                // top-level block instead. A blockquote/div trailing paragraph keeps the
                // fold open (lazyFoldable stays true). The indented-marker special case
                // below still folds regardless, matching the symmetric §10 behavior.
                // An UNTERMINATED fence (inFence still open) is NOT a code block -- it is
                // an inline-verbatim run that is part of the paragraph, so a dedented
                // line folds into it (matching the §10 closer-lookahead rule).
                (((lazyState.lazyFoldable || lazyState.inFence) &&
                    !lazyContinuationEndsList(l)) ||
                    // A list marker indented past the base column but BELOW the content
                    // column folds into the lead text rather than ending the list. Under
                    // symmetric §10 no list marker interrupts a paragraph, so on the
                    // recursive reparse it stays folded: `1. a`/`  1. b`, `- a`/` - b`,
                    // and the abutting-attr form `- a`/` -{.x} b` all fold. (At or past
                    // the content column the marker nests; at the base column it can start
                    // a sibling list, §11 -- so only a below-content indented one folds.)
                    (indentColumns(l) > baseIndent &&
                        (RE_TASK.test(l) ||
                            RE_UNORDERED.test(l) ||
                            RE_ORDERED.test(l) ||
                            extractItemAttr(l) !== null)))) {
                // Lazy continuation: a line with no blank before it that starts no block
                // (or is the indented ordered marker above) folds into the item's lead
                // paragraph (djot rule). A block-starting line or a blank ends the list.
                nested.push(l);
                trackItemLazyState(l, lazyState);
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
            const nextStripped = extractItemAttr(nextLine)?.stripped ?? nextLine;
            if (indentColumns(nextLine) === baseIndent &&
                matchListMarker(nextStripped, isTask, isOrdered) &&
                (isOrdered
                    ? orderedContinues(nextStripped, orderedKind, orderedDelim)
                    : unorderedMarkerChar(nextStripped) === firstMarkerChar)) {
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
            // A `+`-injected separator never loosens, even when the block it attaches
            // is a plain paragraph -- it keeps the item tight like a `+`-attached
            // quote/code/table (Bug B, corpus 83-list-continuation-marker family).
            if (plusSeparators.has(k))
                continue;
            let j = k + 1;
            while (j < nested.length && nested[j] === '')
                j++;
            if (j < nested.length && !lineOpensBlock(nested[j])) {
                loose = true;
                break;
            }
        }
        // When the item's content BEGINS, on the marker line, with another list
        // marker (`- - A`, `* - A`, `1. - A`, ...), the lead is itself a sub-list,
        // not a paragraph. Carve then parses the lead together with every following
        // dedented line as ONE block stream so the marker-line sub-list behaves
        // exactly like a sub-list opened on a *following* line: following
        // same-indent markers MERGE into it as siblings, and post-blank indented
        // blocks are ABSORBED into its items. This MATCHES reference djot.js
        // (@djot/djot 0.3.2) and CommonMark, which both treat a marker-line
        // sub-list as a normal nested list. It corrects Carve's prior line-scoping
        // (which split the sub-list from following items and leaked later indented
        // blocks to the parent row) -- a bug inherited from djot-php, whose
        // marker-line handling deviates from reference djot (see
        // php-collective/djot-php). The single combined stream reuses the normal
        // nested-list/absorption logic -- no separate path. The lead/block split
        // below stays for the indented-ordered sub-list case (an ordered marker
        // that does NOT interrupt the lead paragraph), where the lead really is a
        // paragraph.
        const leadIsMarker = RE_UNORDERED.test(content) ||
            RE_ORDERED.test(content) ||
            RE_TASK.test(content) ||
            // An abutting-attribute bullet/ordered marker (`-{.x} A`, `1.{.x} A`) is a
            // list marker too, exactly as the sub-list nesting path above recognizes
            // it -- keep this detection in step so the attributed marker-line case
            // merges/absorbs like the plain one.
            extractItemAttr(content) !== null;
        // When the lead is a colon-fence opener (`::: word` admonition or a bare
        // `:::` div) whose matching closer line sits among the collected nested
        // lines, the body in between -- including a nested LIST -- belongs to the
        // container. The `firstBlockIdx` split (which exists to let an indented
        // ordered sub-list nest instead of folding) would otherwise sever the
        // opener from its body, leaving `::: word` literal and the closer as
        // trailing text. Keep the whole stream together so the admonition/div
        // opener captures its nested-list body and finds its closer (matching
        // carve-rs / the grammar `admonition = open, {block}, close`). The closer
        // must be one of the collected (item-content-column) lines: a closer at
        // column 0 dedents out of the item and is not in `nested`, so this guard
        // does not fire and the opener correctly stays literal.
        const leadOpensColonFence = (RE_ADMONITION_OPEN.test(content) && !RE_ADMONITION_CLOSE.test(content)) ||
            RE_DIV_OPEN.test(content);
        const colonFenceLen = leadOpensColonFence ? /^(:{3,})/.exec(content)[1].length : 0;
        const colonFenceHasBodyCloser = leadOpensColonFence &&
            nested.some((ln) => {
                const c = RE_ADMONITION_CLOSE.exec(ln);
                return c !== null && c[1].length >= colonFenceLen;
            });
        // Parse the lead text together with its continuation/nested lines as one
        // block sequence (lazy continuation merges into the lead paragraph). An
        // indented ordered sub-list, however, is parsed as its own block stream so
        // it nests instead of folding into the lead paragraph.
        const keepStreamWhole = firstBlockIdx === -1 || leadIsMarker || colonFenceHasBodyCloser;
        const leadLines = keepStreamWhole ? nested : nested.slice(0, firstBlockIdx);
        const blockLines = keepStreamWhole ? [] : nested.slice(firstBlockIdx);
        const mkSub = (text) => {
            const s = new Lexer(text);
            s.abbrDefs = lexer.abbrDefs;
            s.linkDefs = lexer.linkDefs;
            s.footnoteDefs = lexer.footnoteDefs;
            s.nested = true;
            s.depth = lexer.depth + 1;
            return s;
        };
        const children = parseBlocks(mkSub([content, ...leadLines].join('\n')), 0);
        if (blockLines.length > 0) {
            children.push(...parseBlocks(mkSub(blockLines.join('\n')), 0));
        }
        const item = { type: 'list-item', children };
        if (checked !== undefined)
            item.checked = checked;
        if (itemAttrs)
            item.attrs = itemAttrs;
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
    // A `{...}` attribute block GLUED to the opening pipe (index 0, no space)
    // supplies the cell's attributes; the rest, after optional whitespace, is the
    // cell content. A SPACE before the brace (`| {.x}`) is ordinary content, not
    // attributes. A cell that carries an attribute block is never a bare span
    // marker, so its content is literal even if it is just `<`/`^`. An invalid
    // attribute payload leaves the `{` as ordinary content.
    if (src[0] === '{') {
        // Reuse the quote-aware inline-attribute matcher so a quoted `}` inside a
        // value (`{key="{y}"}`) is handled, not truncated at the first brace. The
        // WHOLE payload must then be valid attribute syntax (same as inline / block
        // attribute blocks); a partially-invalid payload like `{.x 1bad}` is not an
        // attribute block, so the `{` stays ordinary content.
        const m = RE_INLINE_ATTR.exec(src);
        if (m && isValidAttrPayload(m[1])) {
            const attrs = parseAttrs(m[1]);
            if (!isEmptyAttrs(attrs)) {
                return { header: false, attrs, content: trimStructural(src.slice(m[0].length)) };
            }
        }
    }
    // A lone `<` is a colspan marker even when it is glued to the pipes (`|<|`).
    // It may fail to merge later (for example in column 0), but it must still
    // render as an empty structural marker cell rather than an empty left-aligned
    // cell. Non-lone prefixes such as `|< text|` remain per-cell alignment.
    if (trimStructural(src) === '<')
        return { header: false, span: 'colspan', content: '' };
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
        const content = trimStructural(src.slice(i));
        return align ? { header, align, content } : { header, content };
    }
    // No tight prefix: a lone `^`/`<` (always spaced) is a span marker;
    // otherwise the whole trimmed text is content.
    const trimmed = trimStructural(src);
    if (trimmed === '^')
        return { header: false, span: 'rowspan', content: '' };
    return { header: false, content: trimmed };
}
const isGfmDelimiterCell = (c) => !c.span && !c.attrs && /^:?-+:?$/.test(trimStructural(c.raw));
const isGfmDelimiterRow = (row) => row.length > 0 && row.every(isGfmDelimiterCell);
// A row attribute block is a valid `{...}` attribute block GLUED to the row's
// closing `|` and running to end of line -- the row-level twin of a cell's
// opening-pipe attribute block. It sets the `<tr>` attributes. The whole
// payload must be valid attribute syntax (same gate as cell / inline / block
// attributes); otherwise the `{` is ordinary content and there is no row attr.
function rowAttrsFromLine(line) {
    const stripped = line.replace(/[ \t]+$/, '');
    const lastPipe = stripped.lastIndexOf('|');
    if (lastPipe < 0 || stripped[lastPipe + 1] !== '{')
        return { body: line };
    const after = stripped.slice(lastPipe + 1);
    const m = RE_INLINE_ATTR.exec(after);
    if (m && m[0].length === after.length && isValidAttrPayload(m[1])) {
        const attrs = parseAttrs(m[1]);
        if (!isEmptyAttrs(attrs))
            return { attrs, body: stripped.slice(0, lastPipe + 1) };
    }
    return { body: line };
}
function parseTable(lexer) {
    // Collect raw cell source first; a `+` continuation row appends its
    // non-empty fragments to the previous row's *source* so an inline
    // construct spanning the line boundary is one logical cell. Inline
    // parsing happens once, after merging.
    const rawRows = [];
    const rowAttrsList = [];
    let lastRaw = null;
    while (!lexer.eof() &&
        (isTableRow(lexer.peek()) || RE_TABLE_CONT.test(lexer.peek()))) {
        const line = lexer.peek();
        if (RE_TABLE_CONT.test(line)) {
            if (!lastRaw)
                break; // a continuation with no row to extend
            if (rawRows.length === 2 &&
                rawRows[1] === lastRaw &&
                isGfmDelimiterRow(lastRaw) &&
                !isGfmDelimiterRow(rawRows[0]))
                break;
            lexer.consume();
            splitTableRow(line).forEach((src, idx) => {
                const frag = trimStructural(src);
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
        const { attrs: rowAttrs, body: rowBody } = rowAttrsFromLine(line);
        const raw = splitTableRow(rowBody).map((src) => {
            const { header, span, align, attrs, content } = parseCellMarkers(src);
            const c = { header, raw: content };
            if (span)
                c.span = span;
            if (align)
                c.align = align;
            if (attrs)
                c.attrs = attrs;
            return c;
        });
        rawRows.push(raw);
        rowAttrsList.push(rowAttrs);
        lastRaw = raw;
    }
    // GFM-style header separator: when the SECOND row is a delimiter row -- every
    // cell a run of dashes with optional alignment colons (`---`, `:--`, `--:`,
    // `:-:`) -- the first row becomes the header (rendered in <thead>) and the
    // colons set per-column alignment for the whole column. The delimiter row is
    // dropped. This is in addition to Carve's tight per-cell markers `|=`/`|<`; a
    // delimiter row anywhere else is an ordinary data row.
    // A cell carrying author attributes (`|{.x} ---`) is content, not a plain
    // structural delimiter, so it never makes its row a GFM header separator.
    if (rawRows.length >= 2 &&
        isGfmDelimiterRow(rawRows[1]) &&
        !isGfmDelimiterRow(rawRows[0])) {
        const aligns = rawRows[1].map((c) => {
            const t = trimStructural(c.raw);
            const left = t.startsWith(':');
            const right = t.endsWith(':');
            return left && right ? 'center' : right ? 'right' : left ? 'left' : undefined;
        });
        rawRows.splice(1, 1);
        rowAttrsList.splice(1, 1);
        for (const c of rawRows[0])
            c.header = true;
        for (const rc of rawRows) {
            rc.forEach((c, i) => {
                const a = aligns[i];
                if (a && !c.align)
                    c.align = a;
            });
        }
    }
    const rows = rawRows.map((rc, idx) => {
        const row = {
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
                if (c.attrs)
                    cell.attrs = c.attrs;
                return cell;
            }),
        };
        const ra = rowAttrsList[idx];
        if (ra)
            row.attrs = ra;
        return row;
    });
    const table = { type: 'table', rows };
    // Optional caption ^ ...
    let lookahead = 0;
    while (!lexer.eof() && isBlankLine(lexer.peek(lookahead)))
        lookahead++;
    const next = lexer.peek(lookahead);
    if (next) {
        const cap = RE_CAPTION.exec(next);
        // §4: a caption attaches only when it immediately follows the block
        // or is separated by at most ONE blank line.
        if (cap && lookahead <= 1) {
            for (let i = 0; i <= lookahead; i++)
                lexer.consume();
            table.caption = parseInline(cap[1], lexer.abbrDefs, lexer.linkDefs, undefined, true);
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
    if (trimStructural(buf) !== '')
        cells.push(buf);
    return cells;
}
/**
 * From a fence opener (` ``` ` / `~~~` / raw) at peek(0), is there a matching
 * closing fence ahead? Used by startsInterruptingBlock so an UNTERMINATED
 * fence does NOT interrupt a paragraph (§10 CLOSER LOOKAHEAD): a stray ``` in
 * prose stays paragraph text instead of swallowing the rest of the block. The
 * negative cache (noFenceCloserFrom) keeps "many unclosed fences" input linear.
 */
function fenceHasCloser(lexer, marker) {
    const start = lexer.pos + 1;
    if (start >= lexer.noFenceCloserFrom)
        return false; // memo: no closer ahead
    const closeRe = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
    let sawAnyCloser = false;
    for (let i = start; i < lexer.lines.length; i++) {
        const l = lexer.lines[i];
        if (closeRe.test(l))
            return true;
        if (RE_FENCE_CLOSER.test(l))
            sawAnyCloser = true;
    }
    // No closer for this marker ahead. If there is NO bare fence-closer line at
    // all from here on, cache it (pos only advances) so later openers are O(1).
    if (!sawAnyCloser)
        lexer.noFenceCloserFrom = start;
    return false;
}
/**
 * Does the line at peek(0) begin a block that INTERRUPTS an open paragraph
 * (grammar PART 9 §10, Markdown-like)? Mirrors parseBlock's detection battery
 * with the §10 carve-outs: a bare image does NOT interrupt; an ordered marker
 * interrupts only as `1.`/`1)`; a fence/`:::` interrupts only with a closer
 * ahead; a `|` line interrupts only when it is a valid table row.
 */
function startsInterruptingBlock(lexer) {
    const ln = lexer.peek();
    if (ln === undefined)
        return false;
    // Dispatch on the first non-whitespace character, so a line costs one or two
    // regex tests instead of the whole battery — this is the per-line cost on
    // dense interrupt text. Each regex keeps its own anchor, so leading-whitespace
    // handling is unchanged: a `^`-anchored pattern (heading, quote, table, `:::`,
    // raw fence, defs, comments) still fails on an indented line, and the
    // `^\s*`-anchored ones (fence, list, link-def) still match it. The boolean
    // result is identical to testing every pattern in order.
    let i = 0;
    while (i < ln.length && (ln.charCodeAt(i) === 32 || ln.charCodeAt(i) === 9))
        i++;
    switch (ln[i]) {
        case '#':
            return RE_HEADING.test(ln);
        case '>':
            return RE_BLOCKQUOTE.test(ln);
        case '|':
            // A valid `|…|` row (a stray leading `|` in prose is not a row).
            return isTableRow(ln);
        case '`':
        case '~':
            // Raw passthrough / fenced code: interrupt only with a matching closer.
            if (RE_RAW_FENCE.test(ln))
                return fenceHasCloser(lexer, RE_RAW_FENCE.exec(ln)[1]);
            if (RE_FENCE.test(ln))
                return fenceHasCloser(lexer, RE_FENCE.exec(ln)[2]);
            return false;
        case '-':
            // thematic break only. A bullet/task does NOT interrupt a paragraph
            // (symmetric with ordered markers; a list needs a blank line, §10).
            return RE_HR.test(trimStructural(ln));
        case '+':
            // `+` is the list-continuation marker, never an interrupter.
            return false;
        case '*':
            // abbreviation definition (invisible) or thematic break. A bullet/task
            // does NOT interrupt (symmetric, §10).
            return RE_ABBR_DEF.test(ln) || RE_HR.test(trimStructural(ln));
        case '_':
            return RE_HR.test(trimStructural(ln));
        case ':':
            // An admonition/div/line-block that has a `:::` closer ahead (the `::: |`
            // line-block shares the bare `:::` closer). A definition-list term (`::`)
            // is NOT in the §10 interrupter set (like an ordered list), so it does
            // not interrupt a paragraph or heading -- it folds as lazy text.
            if ((RE_ADMONITION_OPEN.test(ln) && !RE_ADMONITION_CLOSE.test(ln)) ||
                RE_DIV_OPEN.test(ln) ||
                RE_LINE_BLOCK_OPEN.test(ln) ||
                RE_HARDBREAKS_OPEN.test(ln))
                return divHasCloser(lexer);
            return false;
        case '[':
            // link or footnote reference definition (invisible)
            return RE_LINK_DEF.test(ln) || RE_FOOTNOTE_DEF.test(ln);
        case '%':
            // line or block comment (invisible)
            return RE_COMMENT_LINE.test(ln) || RE_COMMENT_BLOCK.test(ln);
        case '{':
            // A standalone block-attribute line (invisible): it floats forward to
            // the next block (or is dropped when none follows, §15), so it must
            // interrupt the paragraph rather than fold in as literal text.
            return peekBlockAttributes(lexer);
        default:
            // An ordered-list marker does NOT interrupt a paragraph (it needs a blank
            // line, matching Djot): allowing it would require the CommonMark `1.`-only
            // heuristic to keep `2.`, `1985.`, `a.`, `i.` as prose, which Carve avoids.
            // A bare image is inline, not a block, so it does not interrupt either.
            return false;
    }
}
// Whether the peeked line ENDS an open heading or blockquote (and starts a
// sibling block). A list marker (bullet, task, ordered, or abutting-attr) ends
// them and starts a sibling list -- unlike paragraph interruption, where a list
// marker FOLDS in (symmetric §10): a list folds into a PARAGRAPH but ends a
// heading/quote, matching djot. Every paragraph-interrupter ends them too.
function endsHeadingOrQuote(lexer) {
    const ln = lexer.peek();
    if (ln !== undefined &&
        (RE_UNORDERED.test(ln) ||
            RE_TASK.test(ln) ||
            RE_ORDERED.test(ln) ||
            extractItemAttr(ln) !== null)) {
        return true;
    }
    return startsInterruptingBlock(lexer);
}
function parseParagraph(lexer) {
    const lines = [];
    const startLineIndex = lexer.pos;
    while (!lexer.eof()) {
        const ln = lexer.peek();
        if (isBlankLine(ln))
            break;
        // Paragraph interruption (grammar PART 9 §10): a VISIBLE block (heading,
        // list, quote, table, fence, thematic break, admonition/div) interrupts
        // an open paragraph with no blank line before it, at the top level AND
        // nested — the Markdown-like rule. Invisible constructs (reference
        // definitions, comments) interrupt too. A bare image does not interrupt,
        // an ordered marker interrupts only as `1.`/`1)`, and a fence/`:::` only
        // when it has a matching closer ahead. See startsInterruptingBlock.
        //
        // Only a paragraph that already holds a line can be interrupted: the FIRST
        // line is always consumed. In normal dispatch the first line reaching
        // parseParagraph is never a block opener (parseBlockInner would have
        // claimed it), so this does not change interruption. It DOES guarantee
        // progress on the MAX_NESTING_DEPTH degradation path, where a marker line
        // (e.g. a `>` past the depth cap) is routed here to become literal text —
        // without this guard startsInterruptingBlock would break before consuming,
        // looping forever on the same line.
        if (lines.length > 0 && startsInterruptingBlock(lexer))
            break;
        lexer.consume();
        lines.push(ln);
    }
    // Every paragraph line has its leading whitespace stripped (djot /
    // CommonMark): `a\n   b` renders as `a\nb`, and a leading-indented first
    // line (` c`, or a fresh paragraph after a list closes) renders as `c` —
    // Carve has no indented code blocks, so indentation never survives into a
    // paragraph. The first line's stripped width is folded into the inline
    // base position so source offsets/columns stay accurate.
    const firstLead = lines[0].match(/^[ \t]+/)?.[0].length ?? 0;
    // Strip the trailing whitespace at the very END of the paragraph (the final
    // line's trailing spaces/tabs, with nothing after them). CommonMark / djot /
    // carve-php all drop a paragraph's final spaces before inline parsing, so
    // `abc ` is `<p>abc</p>` and a bare `# ` (not a heading) is `<p>#</p>`.
    // The `$` anchor (no `m` flag) matches only the very end of the joined text,
    // so interior trailing whitespace before a soft break (`a  \nb`, which carve
    // keeps verbatim since two trailing spaces are NOT a hard break here) is left
    // intact, and a backslash hard break is never affected.
    const text = lines.map((ln) => ln.replace(/^[ \t]+/, '')).join('\n').replace(/[ \t]+$/, '');
    return {
        type: 'paragraph',
        children: parseInline(text, lexer.abbrDefs, lexer.linkDefs, {
            baseOffset: lexer.lineOffset(startLineIndex) + firstLead,
            startLine: startLineIndex + 1,
            startColumn: 1 + firstLead,
        }),
    };
}
function leadingWhitespace(line) {
    let n = 0;
    while (n < line.length && (line[n] === ' ' || line[n] === '\t'))
        n++;
    return n;
}
// Visual column of the leading whitespace, expanding tabs to the next
// CommonMark tab stop (a multiple of 4). This is the column model used for list
// nesting comparisons: a space advances one column, a tab advances to the next
// tab stop. For space-only indentation it equals leadingWhitespace().
function indentColumns(line) {
    let col = 0;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === ' ')
            col++;
        else if (line[i] === '\t')
            col += 4 - (col % 4);
        else
            break;
    }
    return col;
}
// Dedent counterpart of indentColumns(): drop leading whitespace up to `cols`
// columns. By default a tab straddling the boundary is consumed whole, so a
// block opener (quote, heading) dedents flush to column 0 and parses -- Carve
// has no indent-sensitive block where a leftover column would change meaning.
// With keepResidual (used only for sub-list marker lines), the unconsumed
// columns of a straddling tab are re-emitted as spaces so tab+space-aligned
// sibling markers keep the same visual column and the recursive parse re-derives
// the child base from it. For space-only indentation this equals line.slice(cols).
function sliceColumns(line, cols, keepResidual = false) {
    let col = 0;
    let i = 0;
    while (i < line.length && col < cols) {
        if (line[i] === ' ') {
            col++;
            i++;
        }
        else if (line[i] === '\t') {
            col += 4 - (col % 4);
            i++;
        }
        else {
            break;
        }
    }
    // When dedenting a sub-list block stream, a tab straddling the boundary leaves
    // residual columns; reinsert them as spaces so tab+space-aligned sibling
    // markers stay at the same visual column and the recursive parse re-derives
    // correctly. Lead content uses whole-tab consumption (keepResidual=false) so a
    // block opener reaches column 0. (Space-only indentation has no residual.)
    if (keepResidual && col > cols)
        return ' '.repeat(col - cols) + line.slice(i);
    return line.slice(i);
}
// ============================================================================
// Inline parsing
// ============================================================================
// Footnote reference `[^label]` (no `]` in the label).
const RE_FOOTNOTE_REF = /^\[\^([^\]]+)\]/;
// extension_name = identifier = (letter|'_'){letter|digit|'_'|'-'}
// (grammar.ebnf:968-969,1122) -- a lone `_` is a valid extension name.
const RE_EXTENSION = /^:([a-zA-Z_][\w-]*)\[([^\]]*)\](?:\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?/;
// Raw inline passthrough tag, follows a verbatim span: `` `…`{=html} ``.
const RE_RAW_INLINE = /^\{=([a-zA-Z][\w-]*)\}/;
// Emoji shortcode `:name:` (after extension, which needs `[`).
const RE_EMOJI = /^:([a-zA-Z0-9][\w+-]*):/;
// Autolink (grammar.ebnf:775,776,791,792,1139). Two alternatives:
//   url_autolink   = scheme ':' {url_char}+   -- url_char excludes `<`/`>` plus
//                    `"` `\` `` ` `` `{` `}` `|` `^`, so a body holding any of
//                    those makes the construct invalid (whole-literal).
//   email_autolink = {email_char}+ '@' {email_char}+ '.' {letter}+ -- the
//                    `.TLD` is MANDATORY and email_char excludes `:`/`@`, so
//                    `<a@b>` (no TLD) and `<x@y:z>` are not autolinks.
const RE_AUTOLINK = /^<([a-zA-Z][a-zA-Z0-9+.\-]*:[^>\s<"\\`{}|^]+|[A-Za-z0-9._+\-]+@[A-Za-z0-9._+\-]+\.[A-Za-z]+)>/;
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
// Destination is non-empty (grammar `link_destination = {...}+`), so `[a]()`
// is NOT a link -- it stays literal (matches carve-php / carve-rs).
const RE_LINK_TAIL = /^\(([^)\s]+)(?:\s+"((?:[^"\\]|\\.)*)"|\s+'((?:[^'\\]|\\.)*)')?\)(?:\{((?:[^}"'\n]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+)\})?/;
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
// Content runs to the delimiter-specific closer (`+}` / `-}`), so a nested
// span of a DIFFERENT type whose `}` would otherwise abort an `[^}]*` class is
// kept inside and recursed into: `{+a {-b-} c+}` -> ins(a, del(b), c). Matches
// carve-php / carve-rs.
const RE_CRITIC_INS = /^\{\+((?:[^+]|\+(?!\}))*)\+\}/;
const RE_CRITIC_DEL = /^\{-((?:[^-]|-(?!\}))*)-\}/;
const RE_CRITIC_SUB = /^\{~([^}]*)~>([^}]*)~\}/;
const RE_CRITIC_CMT = /^\{#([^}]*)#\}/;
// Forced intraword emphasis (§22): a brace pair around a bare delimiter forces
// a span with no word-boundary condition. Group 1 is the delimiter; the
// backreference closes it before `}`, non-greedy so the nearest `delim}` wins.
// Matched AFTER RE_CRITIC_SUB, so `{~…~>…~}` is substitution and a bare
// `{~…~}` (no `~>`) is forced strikethrough. The `=` form requires a trailing
// `=` before `}`, so the raw-inline `{=format}` attribute (no trailing `=`,
// e.g. `{=html}`) does not match here.
const RE_FORCED_EMPHASIS = /^\{([/*_^,~=])([\s\S]+?)\1\}/;
const FORCED_TYPE = {
    '/': 'italic',
    '*': 'strong',
    _: 'underline',
    '^': 'super',
    ',': 'sub',
    '~': 'strike',
    '=': 'highlight',
};
// Names can include version-style dots between alnum runs (e.g. `#release-1.0`)
// but a trailing period is treated as sentence punctuation, not part of the name.
// Mention / tag name = name_word ('.' name_word)*, name_word = (letter | digit
// | '_' | '-')+ (grammar PART 9 §7). Interior dots only (a trailing dot stays
// punctuation — the non-greedy dotted-segment match leaves it); each segment
// allows digits, `_` and `-` in any position. Matches carve-php / carve-rs.
const RE_MENTION = /^@([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)/;
const RE_TAG = /^#([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)/;
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
// Adjudicated smart-quote opening context (matches carve-rs on these inputs):
// a straight quote curls OPENING when preceded by start-of-content, Unicode
// whitespace (incl. NBSP, handled below via the U+E000 placeholder), or one of
// the operator/opening-punctuation chars `( [ { = : - /`. Sentence punctuation
// (`. , ; ! ?`), letters, digits and closing brackets stay CLOSING. The en/em
// dash also opens (a quote right after a `--` dash run opens), as does a quote
// directly after an opening curly quote (nested-quote context).
const isQuoteOpenContext = (prev) => prev === '' ||
    // `=` opens a quote so an attribute-like `key="value"` / `="x"` gets an
    // opening curly quote; `:` opens too (`:"q"` -> `:“q”`), matching carve-rs.
    /[\s([{\-–—/=:]/.test(prev) ||
    prev === '“' ||
    prev === '‘' ||
    // U+E000 is the internal non-breaking-space placeholder (escaped `\ ` /
    // line-block indent); a nbsp is whitespace, so a quote after it opens.
    prev === '';
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
function parseInline(text, abbrDefs, linkDefs = new Map(), source = inlineSource(), captionContext = false) {
    const nodes = applyAbbreviations(scanInline(text, source, false, captionContext), abbrDefs);
    return applyLinkDefs(nodes, linkDefs);
}
function inlineSource(overrides = {}) {
    return {
        baseOffset: overrides.baseOffset ?? 0,
        startLine: overrides.startLine ?? 1,
        startColumn: overrides.startColumn ?? 1,
    };
}
// Inline recursion depth, bounding the same nesting the block side caps with
// MAX_NESTING_DEPTH. scanInline recurses one frame per nested link / span /
// emphasis / critic level; without a cap a deeply nested run (e.g.
// `[[[[…x]]]]`) overflows the call stack and throws RangeError. JS is
// single-threaded, so a module-level counter with try/finally is sufficient
// (and far less invasive than threading a depth arg through every recursive
// call site). Over the cap the run stays literal text instead of recursing.
let inlineDepth = 0;
function scanInline(text, source = inlineSource(), inFootnote = false, captionContext = false) {
    if (inlineDepth >= MAX_NESTING_DEPTH) {
        return [withPos({ type: 'text', value: text }, source, text, 0, text.length)];
    }
    inlineDepth++;
    try {
        return scanInlineInner(text, source, inFootnote, captionContext);
    }
    finally {
        inlineDepth--;
    }
}
function scanInlineInner(text, source, inFootnote, captionContext) {
    const out = [];
    let i = 0;
    let buf = '';
    let bufStart = 0;
    // Caption number placeholder: only the first bare `#` in a caption becomes one.
    let captionNumberEmitted = false;
    // Last char appended to buf. Tracked explicitly because reading
    // `buf[buf.length - 1]` each char indexes a growing ConsString, which V8 must
    // flatten/traverse -- O(n^2) over a quote-dense run (and a catastrophic cliff
    // once the rope gets deep). A scalar keeps the smart-quote context check O(1).
    let bufLast = '';
    const emphasisNoClose = new Map();
    // Precompute each `[`'s balancing `]` once (O(n)) so the link/image/span
    // branches resolve the close bracket in O(1); see buildBracketMap.
    const bracketClose = text.includes('[') ? buildBracketMap(text) : {};
    const flush = () => {
        if (buf) {
            out.push(withPos({ type: 'text', value: buf }, source, text, bufStart, i));
            buf = '';
            bufLast = '';
        }
    };
    const append = (value) => {
        if (!buf)
            bufStart = i;
        buf += value;
        if (value)
            bufLast = value[value.length - 1];
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
        // Non-breaking space: a backslash followed by a space (djot). Emit the
        // internal placeholder (U+E000) rather than a literal U+00A0 so it is
        // converted per renderer (HTML &nbsp;, Markdown U+00A0, plain/ANSI a
        // space) and never confused with an author's literal non-breaking space.
        if (c === '\\' && text[i + 1] === ' ') {
            append('\ue000');
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
                ? bufLast
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
            const tick = i + dollarLen;
            if (text[tick] === '`') {
                const { end, closed, openLen } = verbatimSpanEnd(text, tick);
                const innerEnd = end - openLen;
                if (closed && text[end] !== '`' && innerEnd > tick + openLen && text[innerEnd - 1] !== '`') {
                    flush();
                    const content = text.slice(tick + openLen, innerEnd).replace(/^ (.*) $/, '$1');
                    const len = end - i;
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
                    if (title !== undefined)
                        img.title = unescapeAttrValue(title);
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
        // Inline footnote `^[content]` (pandoc-style; design §2-§5). The caret must
        // immediately precede `[`, must not itself follow a `^` (`^^[` is suppressed
        // by same-delimiter adjacency), and must not be inside footnote content
        // (no notes inside notes, §3.1). The matching `]` is the balanced close from
        // bracketClose (escape/code-span aware). Empty or whitespace-only content is
        // literal. Ranked above superscript. Content is inline-only, parsed with
        // footnote recognition disabled.
        if (!inFootnote && c === '^' && text[i + 1] === '[' && text[i - 1] !== '^') {
            const close = bracketClose[i + 1];
            if (close !== undefined && trimStructural(text.slice(i + 2, close)) !== '') {
                flush();
                const inner = text.slice(i + 2, close);
                const children = scanInline(inner, shiftSource(source, text, i + 2), true);
                out.push(withPos({ type: 'footnote', inline: children }, source, text, i, close + 1));
                i = close + 1;
                continue;
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
                // Footnote reference [^label] -- before reference links so adjacent
                // refs like `[^a][^a]` are two notes, not one unresolved `[text][ref]`.
                // Inside footnote content a `[^x]` is literal, not a reference
                // (no notes inside notes, design §3.1).
                const mfn = inFootnote ? null : RE_FOOTNOTE_REF.exec(rest);
                if (mfn) {
                    flush();
                    out.push(withPos({ type: 'footnote', id: mfn[1].trim() }, source, text, i, i + mfn[0].length));
                    i += mfn[0].length;
                    continue;
                }
                // Inline link [text](url "title"){attrs}
                const ml = RE_LINK_TAIL.exec(tail);
                if (ml) {
                    flush();
                    const link = {
                        type: 'link',
                        href: ml[1],
                        children: scanInline(innerText, shiftSource(source, text, i + 1), inFootnote),
                    };
                    const title = ml[2] ?? ml[3];
                    if (title !== undefined)
                        link.title = unescapeAttrValue(title);
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
                        children: scanInline(innerText, shiftSource(source, text, i + 1), inFootnote),
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
            // Footnote reference [^label] -- before span, so `[^x]{.c}` stays a
            // footnote ref (the `{.c}` then attaches via the inline-attr pass)
            // rather than becoming a <span> of `^x`. Footnote labels hold no
            // nested brackets, so its own regex stays authoritative.
            const mfn = inFootnote ? null : RE_FOOTNOTE_REF.exec(rest);
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
                        children: scanInline(innerText, shiftSource(source, text, i + 1), inFootnote),
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
                    content: scanInline(m[2], shiftSource(source, text, i + m[0].indexOf('[') + 1), inFootnote),
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
                out.push(withPos({ type: 'critic-insert', children: scanInline(ins[1], shiftSource(source, text, i + 2), inFootnote) }, source, text, i, i + ins[0].length));
                i += ins[0].length;
                continue;
            }
            const del = RE_CRITIC_DEL.exec(rest);
            if (del) {
                flush();
                out.push(withPos({ type: 'critic-delete', children: scanInline(del[1], shiftSource(source, text, i + 2), inFootnote) }, source, text, i, i + del[0].length));
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
            // Forced intraword emphasis `{X…X}` (§22) — emits the same node as the
            // bare delimiter, but with no word-boundary condition.
            const forced = RE_FORCED_EMPHASIS.exec(rest);
            if (forced) {
                flush();
                out.push(withPos({ type: FORCED_TYPE[forced[1]], children: scanInline(forced[2], shiftSource(source, text, i + 2), inFootnote) }, source, text, i, i + forced[0].length));
                i += forced[0].length;
                continue;
            }
            // Inline attribute block — attaches to preceding node. It must be GLUED:
            // a non-empty `buf` means unflushed text (e.g. a space) sits between the
            // preceding node and the `{`, so the block is NOT attached -- it stays
            // literal text (`<url> {.x}` keeps `{.x}`). Matches carve-php / carve-rs.
            const attr = !buf ? RE_INLINE_ATTR.exec(rest) : null;
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
            // Bare `#` (not a tag) in a caption = number placeholder, first only.
            // `\#` never reaches here (the escape branch consumes it as literal).
            if (captionContext && !captionNumberEmitted) {
                flush();
                out.push(withPos({ type: 'caption-number' }, source, text, i, i + 1));
                captionNumberEmitted = true;
                i += 1;
                continue;
            }
        }
        // Emphasis-family delimiters
        const em = matchEmphasis(text, i, source, inFootnote, emphasisNoClose);
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
        // Extension inline matchers run only here, where every core construct has
        // declined position i: extensions add syntax, they never hijack core.
        if (activeMatchers.length) {
            const xm = tryInlineMatchers(text, i);
            if (xm) {
                flush();
                out.push(withPos(xm.node, source, text, i, xm.end));
                i = xm.end;
                continue;
            }
        }
        append(c);
        i++;
    }
    flush();
    return out;
}
function matchEmphasis(text, i, source, inFootnote = false, noClose = new Map()) {
    const c = text[i];
    // Bold-italic /*...*/  (priority over /italic/ and *bold*)
    if (c === '/' && text[i + 1] === '*') {
        const close = findClose(text, i + 2, '*/');
        if (close !== -1) {
            const inner = text.slice(i + 2, close);
            return {
                node: { type: 'bold-italic', children: scanInline(inner, shiftSource(source, text, i + 2), inFootnote) },
                end: close + 2,
            };
        }
    }
    // Single-char delimiters. Highlight `=` and subscript `,` are single-char
    // like the rest; a doubled `==`/`,,` is therefore literal by same-delimiter
    // adjacency (handled below), exactly like `**x**`.
    const pairs = [
        ['/', 'italic'],
        ['*', 'strong'],
        ['_', 'underline'],
        ['~', 'strike'],
        ['^', 'super'],
        ['=', 'highlight'],
        [',', 'sub'],
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
            // delimiter is literal text. `**x**`, `~~x~~`, `^^x^^`, `==x==`, `,,x,,`
            // stay literal, uniformly with `//x//` and `__x__`. Applies to all seven.
            if (after === delim || before === delim)
                continue;
            // Word-boundary opener (spec §9): every bare delimiter can't open after
            // an alphanumeric or `_`, keeping paths/identifiers/numbers literal
            // (a/b/c, foo*bar*baz, snake_case, x = 5, key=value, 1,2,3). Use the
            // forced `{X…X}` family for deliberate intraword emphasis.
            if (before && /[A-Za-z0-9_]/.test(before))
                continue;
            // Italic/underline additionally can't open after `/` (path protection,
            // e.g. snake_/case/).
            if ((delim === '/' || delim === '_') && before === '/')
                continue;
            // Find closer that's not preceded by space
            const close = cachedFindEmphasisClose(text, i + 1, delim, noClose);
            if (close !== -1) {
                const inner = text.slice(i + 1, close);
                return {
                    node: { type, children: scanInline(inner, shiftSource(source, text, i + 1), inFootnote) },
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
function cachedFindEmphasisClose(text, from, delim, noClose) {
    const firstNoClose = noClose.get(delim);
    if (firstNoClose !== undefined && from >= firstNoClose)
        return -1;
    const close = findEmphasisClose(text, from, delim);
    if (close === -1)
        noClose.set(delim, Math.min(firstNoClose ?? from, from));
    return close;
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
            // Word-boundary closer (spec §9): no bare delimiter closes when followed
            // by an alphanumeric. Applies to every delimiter, not just / and _.
            if (next && /[A-Za-z0-9]/.test(next))
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
            // Inline-footnote content lives in `.inline` (design §3); recurse there too.
            const anyInline = node.inline;
            if (Array.isArray(anyInline)) {
                ;
                node.inline = applyAbbreviations(anyInline, defs);
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
        // Inline-footnote content lives in `.inline` (design §3); recurse there too.
        const anyInline = node.inline;
        if (Array.isArray(anyInline)) {
            ;
            node.inline = applyLinkDefs(anyInline, defs);
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
    // An attribute name (id, class, key) is a grammar identifier:
    // `(letter | '_'), {letter | digit | '_' | '-'}` -- it may NOT start with a
    // digit. A digit-first name (`.123`, `#1`, `2=v`) makes the whole block an
    // invalid attribute block, so it stays literal (§14) -- stricter than djot.
    // The bareword (boolean-attribute) alternative comes after key=value so a
    // `key=value` is consumed whole, and before `\s+`. It makes `{disabled}` and
    // `{.c disabled}` valid blocks (boolean attrs) rather than literal text.
    const stripped = inner.replace(/(?:#[a-zA-Z_][\w-]*)|(?:\.[a-zA-Z_][\w-]*)|(?:[a-zA-Z_][\w-]*=(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+))|(?:[a-zA-Z_][\w-]*)|\s+/g, '');
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
    // An attribute name is a grammar identifier (letter or `_` first, then
    // letters / digits / `_` / `-`); a digit-first token is not a valid
    // attribute and is skipped here (the payload is rejected as invalid
    // upstream by isValidAttrPayload, so the block stays literal).
    // The bareword alternative (m[7]) is LAST so `key=value` matches as a
    // key/value, not as a bareword `key` with a leftover `=value`. A bareword is
    // a value-less (boolean) attribute -> rendered `name=""` (djot-php form).
    const re = /(?:#([a-zA-Z_][\w-]*))|(?:\.([a-zA-Z_][\w-]*))|(?:([a-zA-Z_][\w-]*)=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+)))|(?:([a-zA-Z_][\w-]*))/g;
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
            if (m[3] === 'id') {
                // `id=j` is the SAME attribute as `#j`: it sets the id slot, last-wins
                // (§15), instead of emitting a second `id="…"` (invalid HTML). Matches
                // carve-php; `{#i id=j}` -> `id="j"`.
                attrs.id = val;
                note('#id');
            }
            else {
                attrs.keyValues = { ...(attrs.keyValues ?? {}), [m[3]]: val };
                note(m[3]);
            }
        }
        else if (m[7]) {
            if (m[7] === 'id') {
                // A bare boolean `id` also feeds the id slot (value ''), last-wins and
                // single -- `{id id=j}` -> `id="j"`, `{id}` -> `id=""` -- so `id` never
                // enters keyValues and no duplicate `id` attribute can be produced.
                attrs.id = '';
                note('#id');
            }
            else {
                // Boolean attribute: a bare word with no value.
                attrs.keyValues = { ...(attrs.keyValues ?? {}), [m[7]]: '' };
                note(m[7]);
            }
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
    // `!== undefined`, not truthiness: an explicit `id=""` in a later block wins
    // over an earlier `#old` (last-wins §15), e.g. `[x]{#old}{id=""}` -> `id=""`.
    if (b.id !== undefined)
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