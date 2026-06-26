/*
 * Markdown -> Carve converter.
 *
 * Source-to-source transformation (not parsing) that rewrites common
 * Markdown into equivalent Carve. Two things differ from Markdown and from
 * Djot, and both are handled here:
 *
 *   1. Block spacing. Carve requires blank lines around block elements
 *      (headings, fenced code, lists, blockquotes); Markdown does not.
 *   2. Inline delimiters. Carve diverged from Djot/Markdown:
 *        emphasis      asterisk/underscore pairs -> slash pairs  /x/
 *                      ( _x_ is UNDERLINE in Carve, not emphasis )
 *        strong        double-star / double-underscore -> single star *x*
 *        bold-italic   triple-star / triple-underscore -> star+slash
 *        strikethrough double-tilde -> single tilde ~x~
 *        highlight     ==x==       -> =x=     ( Carve highlight is a single `=` )
 *        superscript   ^x^         -> ^x^     ( unchanged )
 *        inline math   $x$         -> $`x`
 *
 *      Carve's highlight/subscript markers are single chars (`=x=`, `,x,`); the
 *      doubled forms `==x==` / `,,x,,` are literal. The `<mark>`/`<sub>`/`<sup>`
 *      HTML tags map to the forced brace forms (`{=x=}` / `{,x,}` / `{^x^}`),
 *      which also render when the tag sits intraword (e.g. `H<sub>2</sub>O`).
 *
 * The `_x_` -> `/x/` rule is the critical one: a naive Markdown->Djot port
 * keeps `_x_`, which Carve renders as underline — a silent mis-render.
 *
 * Delimiters inside inline code and fenced code blocks are never rewritten.
 *
 * Known limitations:
 *  - Markdown indented (4-space) code blocks are not converted. Carve has no
 *    indented code block (like Djot), so the text is treated as a paragraph
 *    and its delimiters are rewritten. Use a fenced ``` block in the source.
 *  - Inline conversion is per line, so a construct that crosses a soft line
 *    break is mishandled: an emphasis/strong span (`*first\nsecond*`) is left
 *    unconverted, and a code span (`` `a\nb` ``) is not protected on its first
 *    line. Keep such spans on a single line before converting.
 *  - Markdown lazy continuation is not preserved — Carve has none. A non-`>`
 *    line after a blockquote, or an unindented line after a list item, stays
 *    a separate paragraph rather than folding into the quote/item. Put `>` on
 *    every quoted line, and indent list-item continuation lines, to keep them.
 *  - Intraword emphasis (`foo*bar*baz`) is not converted: Carve's `/` cannot
 *    open or close next to an alphanumeric, so it has no intraword form.
 *  - Block constructs nested inside a blockquote or list container (a fenced
 *    code block or a reference definition prefixed by `>` / list indentation)
 *    are not recognized as such — only top-level ones are. Their delimiters
 *    may be rewritten. Keep fenced code and reference definitions at the top
 *    level for a faithful migration.
 *  - Image alt text is preserved verbatim, not flattened to plain text as
 *    CommonMark does, so `![*x*](u)` keeps `*x*` in the Carve alt attribute.
 */
/**
 * Build a replacer for a single-char inline marker (`^` super, `,` sub, `=`
 * highlight). Carve's bare markers do not open/close intraword or next to
 * whitespace, so the bare form (`^x^`) is only used when the tag has a
 * non-alphanumeric neighbor on each side and its body is not whitespace-padded.
 * Otherwise the brace form (`{^x^}`) is required — it renders in every position
 * (e.g. `H<sub>2</sub>O`), at the cost of being noisier. Preferring the bare
 * form keeps the common, whitespace-separated case clean on a Markdown→Carve
 * round-trip (corpus 67-superscript-and-subscript).
 */
function markerForm(marker) {
    return (match, body, offset, full) => {
        const before = full[offset - 1] ?? '';
        const after = full[offset + match.length] ?? '';
        const intraword = /[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after);
        const padded = /^\s|\s$/.test(body);
        return intraword || padded ? `{${marker}${body}${marker}}` : `${marker}${body}${marker}`;
    };
}
const HTML_TAG_RULES = [
    // Highlight/super/subscript use Carve's single-char markers, brace-forced
    // only when needed: an HTML tag can sit intraword (e.g. `H<sub>2</sub>O`),
    // where a bare `,2,` / `^2^` / `=2=` is literal in Carve, so `markerForm`
    // emits `{,x,}` / `{^x^}` / `{=x=}` there and the bare form everywhere else.
    [/<mark>([^<]+)<\/mark>/gi, markerForm('=')],
    // `<ins>` has no bare Carve form (insertion is the CriticMarkup `{+x+}`), so
    // it always uses the brace form — unlike the single-char markers below.
    [/<ins>([^<]+)<\/ins>/gi, '{+$1+}'],
    [/<del>([^<]+)<\/del>/gi, '~$1~'],
    [/<s>([^<]+)<\/s>/gi, '~$1~'],
    [/<sup>([^<]+)<\/sup>/gi, markerForm('^')],
    [/<sub>([^<]+)<\/sub>/gi, markerForm(',')],
    [/<strong>([^<]+)<\/strong>/gi, '*$1*'],
    [/<b>([^<]+)<\/b>/gi, '*$1*'],
    [/<em>([^<]+)<\/em>/gi, '/$1/'],
    [/<i>([^<]+)<\/i>/gi, '/$1/'],
];
/**
 * Replace every inline code span in `s` via `repl`, leaving everything else
 * untouched. A run of N backticks closes at the next run of *exactly* N
 * backticks (so a span may embed shorter runs, e.g. `` `a `b` c` ``). An
 * unterminated run is literal and left alone.
 */
function protectCodeSpans(s, repl) {
    const runLen = (idx) => {
        let n = 0;
        while (s[idx + n] === '`')
            n++;
        return n;
    };
    let out = '';
    let i = 0;
    while (i < s.length) {
        if (s[i] !== '`') {
            out += s[i];
            i++;
            continue;
        }
        const len = runLen(i);
        let j = i + len;
        let closed = -1;
        while (j < s.length) {
            // Close only at the start of a run of *exactly* len backticks, so a
            // longer inner run (```) never closes a shorter span (``) on its suffix.
            if (s[j] === '`' && s[j - 1] !== '`' && runLen(j) === len) {
                closed = j;
                break;
            }
            j++;
        }
        if (closed === -1) {
            out += s.slice(i, i + len); // unterminated run: literal
            i += len;
            continue;
        }
        out += repl(s.slice(i, closed + len));
        i = closed + len;
    }
    return out;
}
/** Convert inline Markdown formatting on a single (non-code) line to Carve. */
function convertInline(input) {
    // Protect inline code spans so their delimiters are never rewritten.
    // Placeholders are wrapped in NUL bytes — which cannot occur in the source
    // text — so ordinary text like "P0" is never mistaken for a placeholder.
    const protectedSpans = [];
    const protect = (s) => {
        protectedSpans.push(s);
        return `\x00P${protectedSpans.length - 1}\x00`;
    };
    let line = protectCodeSpans(input, protect);
    // A backslash escape (`\*`, `\_`, `\\`, …) makes the next punctuation char
    // literal in both Markdown and Carve, so protect the pair verbatim.
    line = line.replace(/\\[^A-Za-z0-9\s]/g, protect);
    // <code>…</code> is verbatim: turn it into a Carve code span and protect it
    // before any delimiter rewrite touches its contents.
    line = line.replace(/<code>([^<]+)<\/code>/gi, (_m, inner) => protect(`\`${inner}\``));
    // Normalize a `(dest "title")` part: Carve's link parser closes the
    // destination at the first `)`, so balanced parens in the URL are
    // percent-encoded (Titan_(moon) -> Titan_%28moon%29).
    const encodeDest = (paren) => {
        const inner = paren.slice(1, -1);
        const m = inner.match(/^(\S+)([\s\S]*)$/);
        const url = m ? m[1] : inner;
        const rest = m ? m[2] : '';
        const enc = url.replace(/[()]/g, (c) => (c === '(' ? '%28' : '%29'));
        return `(${enc}${rest})`;
    };
    // Images `![alt](dest)`: Carve renders the alt as raw text, so protect the
    // whole construct (alt and dest alike). The alt may contain one level of
    // nested brackets (`![a [b]](url)`); the dest is paren-normalized.
    line = line.replace(/(!\[(?:[^[\]]|\[[^\]]*\])*\])(\((?:[^()\n]|\([^()\n]*\))*\))/g, (_m, alt, dest) => protect(alt + encodeDest(dest)));
    // Link destinations `](dest "title")`. (Images already handled above.) The
    // delimiters in a URL (e.g. /_v1_/) are never markup, so protect it whole.
    line = line.replace(/(?<=\])(\((?:[^()\n]|\([^()\n]*\))*\))/g, (_m, dest) => protect(encodeDest(dest)));
    // Reference-link use site `[text][label]`: the trailing `[label]` is a
    // literal reference key, not inline markup, so protect it too.
    line = line.replace(/(?<=\])\[[^\]]*\]/g, protect);
    // Autolinks `<scheme:...>` and `<email>`: the URL/address is literal, so a
    // `_` or `*` inside it (e.g. /_v1_/) must not be rewritten as markup.
    line = line.replace(/<[A-Za-z][A-Za-z0-9+.-]*:[^>\s]+>/g, protect);
    line = line.replace(/<[^>\s@]+@[^>\s]+>/g, protect);
    // Bare/GFM autolink URLs in prose (https://example.com/api/_v1_/x): the
    // path is literal, so protect it before the emphasis passes.
    line = line.replace(/\bhttps?:\/\/[^\s<>`]+/g, protect);
    // Reference-link definition `[label]: dest "title"` (optional space after
    // the colon). The whole line is consumed literally by Carve's ref-link
    // parser, so protect it. A footnote definition `[^id]: body` is excluded —
    // its body is normal inline content that must still be converted.
    line = line.replace(/^\s*\[[^^\]][^\]]*\]:\s*\S.*$/, (m) => protect(m));
    // Math, converted and protected before the emphasis passes so a formula
    // body containing * _ ~ (e.g. $*x*$) is not rewritten as markup.
    // $$display$$ -> $$`display`
    line = line.replace(/\$\$([^$]+)\$\$/g, (_m, inner) => protect(`$$\`${inner}\``));
    // $inline$ -> $`inline`; a bare-number body ($5, $3.50) is currency, kept.
    // The `(?!\d)` keeps a currency range like `$5-$10` literal (otherwise the
    // first..second `$` would be paired as math).
    line = line.replace(/\$([^$\s][^$]*[^$\s]|\S)\$(?!\d)/g, (m, inner) => /^[\d.,]+$/.test(inner) ? m : protect(`$\`${inner}\``));
    // Converted strong / bold-italic are stashed behind placeholders so their
    // single `*` / `/` are not re-matched by the emphasis passes below.
    const stash = [];
    const hold = (s) => {
        stash.push(s);
        return `\x00S${stash.length - 1}\x00`;
    };
    // Recursively convert *em* / _em_ nested inside a strong/bold-italic span to
    // /em/ (so a nested `_x_` becomes `/x/`, not Carve underline).
    const convertNestedEm = (inner) => inner
        .replace(/(?<![A-Za-z0-9*])\*(?!\s)([^*]+?)(?<!\s)\*(?![A-Za-z0-9*])/g, '/$1/')
        .replace(/(?<![A-Za-z0-9_])_(?!\s)([^_]+?)(?<!\s)_(?![A-Za-z0-9_])/g, '/$1/');
    // ***bold italic*** / ___bold italic___ -> /*x*/ (Carve's canonical
    // bold-italic). The underscore form needs word boundaries: CommonMark `_`
    // cannot open/close emphasis intraword (foo___bar___baz stays literal).
    line = line.replace(/\*{3}(?!\s)(.+?)(?<!\s)\*{3}/g, (_m, inner) => hold(`/*${convertNestedEm(inner)}*/`));
    line = line.replace(/(?<![A-Za-z0-9])___(?!\s)(.+?)(?<!\s)___(?![A-Za-z0-9])/g, (_m, inner) => hold(`/*${convertNestedEm(inner)}*/`));
    // **strong** -> *strong*
    line = line.replace(/\*\*(?!\s)(.+?)(?<!\s)\*\*/g, (_m, inner) => hold(`*${convertNestedEm(inner)}*`));
    // __strong__ -> *strong* (word-boundary: intraword `_` is literal)
    line = line.replace(/(?<![A-Za-z0-9])__(?!\s)(.+?)(?<!\s)__(?![A-Za-z0-9])/g, (_m, inner) => hold(`*${convertNestedEm(inner)}*`));
    // *emphasis* -> /emphasis/. Carve `/` cannot flank whitespace OR open/close
    // intraword, so `2 * 3` and `foo*bar*baz` are left literal (Markdown
    // intraword emphasis is not expressible in Carve — see module header).
    line = line.replace(/(?<![A-Za-z0-9*])\*(?!\s)([^*]+?)(?<!\s)\*(?![A-Za-z0-9*])/g, '/$1/');
    // _emphasis_ -> /emphasis/ (word-boundary, so snake_case is left alone)
    line = line.replace(/(?<![A-Za-z0-9_])_(?!\s)([^_]+?)(?<!\s)_(?![A-Za-z0-9_])/g, '/$1/');
    // ~~strikethrough~~ -> ~strikethrough~
    line = line.replace(/~~([^~]+)~~/g, '~$1~');
    // ==highlight== -> =highlight=. Carve highlight is a single `=`; a literal
    // `==x==` renders as plain text in Carve (corpus 74-two-char-delimiter-runs),
    // so a Markdown highlight left unchanged would silently mis-render.
    line = line.replace(/==(?!\s)([^=]+?)(?<!\s)==/g, '=$1=');
    // HTML inline tags -> Carve. Run after the emphasis/strong passes: the tag
    // bodies contain no * _ ~ delimiters, so the markup they produce (e.g.
    // <strong>a</strong> -> *a*) is not re-matched and turned into /a/.
    for (const [re, repl] of HTML_TAG_RULES) {
        line = typeof repl === 'string' ? line.replace(re, repl) : line.replace(re, repl);
    }
    // ^superscript^ is identical in Carve — no change. (Highlight ==x== was
    // converted to =x= above; math was converted and protected before the
    // emphasis passes.)
    // Restore stashes and protected spans until stable: a protected/stashed
    // span may itself contain placeholders (e.g. a reference-definition line
    // that wrapped an already-protected URL), so a single pass is not enough.
    let prev;
    do {
        prev = line;
        line = line
            // A stash/protect index that has no stored value means the NUL-wrapped
            // sentinel came from the input itself (not one we emitted), so keep the
            // matched text verbatim rather than splicing the literal string
            // "undefined" into the output.
            .replace(/\x00S(\d+)\x00/g, (m, i) => stash[Number(i)] ?? m)
            .replace(/\x00P(\d+)\x00/g, (m, i) => protectedSpans[Number(i)] ?? m);
    } while (line !== prev);
    return line;
}
/** A GFM table delimiter row, e.g. `| --- | :--: |` (at least one column). */
const RE_TABLE_DELIMITER = /^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?$/;
/**
 * Split a pipe-delimited table row into trimmed cell texts, honoring `\|`
 * escapes and dropping the empty cells produced by a leading/trailing pipe.
 */
function splitTableRow(row) {
    const cells = [];
    let cur = '';
    for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '\\' && i + 1 < row.length) {
            cur += ch + row[++i];
            continue;
        }
        if (ch === '|') {
            cells.push(cur);
            cur = '';
            continue;
        }
        cur += ch;
    }
    cells.push(cur);
    if (cells.length > 1 && cells[0].trim() === '')
        cells.shift();
    if (cells.length > 1 && cells[cells.length - 1].trim() === '')
        cells.pop();
    return cells.map((c) => c.trim());
}
/** Map a GFM delimiter cell to Carve's column-alignment marker (glued to `|=`). */
function alignMarker(cell) {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right)
        return '~';
    if (right)
        return '>';
    if (left)
        return '<';
    return '';
}
/** Convert a Markdown document to Carve. */
export function markdownToCarve(markdown) {
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let inCode = false;
    let fenceChar = '';
    let fenceLen = 0;
    let prevType = 'blank';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // Opening fence — a >=3 run of ` or ~, indented at most 3 spaces (the
        // Markdown rule). Carve accepts a single language token over a real-world
        // charset (c++, c#, asp.net, text/html are valid), so the Markdown info
        // string is normalized to its first such token — keeping `c++`/`text/html`
        // intact and reducing an extended info (```js title="x") to ```js (still a
        // code block). The charset matches RE_FENCE in parse.ts, including `/`.
        const open = !inCode ? line.match(/^(\s{0,3})(`{3,}|~{3,})(.*)$/) : null;
        if (open) {
            if (prevType !== 'blank' && out.length > 0)
                out.push('');
            inCode = true;
            fenceChar = open[2][0];
            fenceLen = open[2].length;
            const info = open[3].match(/[A-Za-z0-9_+#/.-]+/)?.[0] ?? '';
            out.push(open[1] + open[2] + info);
            prevType = 'code_fence';
            continue;
        }
        // Inside a fence — a closer is a run of the same char at least as long as
        // the opener (indented by at most 3 spaces); a shorter inner run is code.
        if (inCode) {
            if (new RegExp(`^\\s{0,3}(${fenceChar}{${fenceLen},})\\s*$`).test(line)) {
                inCode = false;
                fenceChar = '';
                fenceLen = 0;
                out.push(line);
                if (i + 1 < lines.length && lines[i + 1].trim() !== '')
                    out.push('');
                prevType = 'code_fence';
            }
            else {
                out.push(line);
                prevType = 'code';
            }
            continue;
        }
        // GFM table header: a `| ... |` row immediately followed by a delimiter
        // row (`| --- | :--: |`). Carve marks header cells with `|=` (alignment
        // glued as `<`/`>`/`~`) and needs no delimiter row, so rewrite the header
        // and drop the delimiter. Body rows are already valid Carve and fall
        // through as plain text below, so only the header is special-cased here.
        if (trimmed.includes('|')) {
            const next = i + 1 < lines.length ? lines[i + 1].trim() : '';
            if (next.includes('-') && RE_TABLE_DELIMITER.test(next)) {
                const headerCells = splitTableRow(trimmed);
                const aligns = splitTableRow(next).map(alignMarker);
                // GFM requires the delimiter row to have the same column count as the
                // header; a mismatch (e.g. `a | b` over `---`) is not a table, so leave
                // it for the setext/thematic-break handling below.
                if (aligns.length === headerCells.length) {
                    let header = '';
                    for (let c = 0; c < headerCells.length; c++) {
                        header += `|=${aligns[c] ?? ''} ${convertInline(headerCells[c])} `;
                    }
                    header += '|';
                    if (prevType !== 'blank' && out.length > 0)
                        out.push('');
                    out.push(header);
                    i++; // consume the delimiter row
                    prevType = 'text';
                    continue;
                }
            }
        }
        const isBlank = trimmed === '';
        const isHeading = /^#{1,6}\s/.test(trimmed);
        const indent = line.length - line.replace(/^\s+/, '').length;
        const isBlockquote = trimmed.startsWith('>');
        // An ordered marker other than `1` cannot interrupt a paragraph
        // (CommonMark), so after a paragraph it stays prose; bullets and `1.`
        // always start/continue a list. Mid-list, any number continues.
        const ordered = trimmed.match(/^(\d+)[.)]\s/);
        const isList = (/^[-*+]\s/.test(trimmed) || ordered !== null) &&
            !(prevType === 'text' && ordered !== null && Number(ordered[1]) !== 1);
        if (isBlank) {
            out.push(line);
            prevType = 'blank';
            continue;
        }
        // Indented content directly under a list item (a nested sublist, an
        // indented blockquote/heading, or a lazy continuation) belongs to that
        // item. Carve keeps it there by indentation, so pass it through with
        // inline conversion only — no top-level block spacing or dedent.
        if (prevType === 'list' && indent >= 1) {
            out.push(convertInline(line));
            prevType = 'list';
            continue;
        }
        // Setext heading: a paragraph line immediately followed by a line of only
        // `=` (h1) or `-` (h2). Carve has no setext, so rewrite to an ATX heading
        // and consume the underline. Only at the top level (not list/quote/code).
        const underline = i + 1 < lines.length ? lines[i + 1].trim() : '';
        if (!isHeading &&
            !isBlockquote &&
            !isList &&
            (/^=+$/.test(underline) || /^-+$/.test(underline))) {
            if (prevType !== 'blank' && prevType !== 'heading')
                out.push('');
            out.push(convertInline(`${underline[0] === '=' ? '#' : '##'} ${trimmed}`));
            i++; // consume the underline line
            if (i + 1 < lines.length && lines[i + 1].trim() !== '')
                out.push('');
            prevType = 'heading';
            continue;
        }
        if (isHeading && prevType !== 'blank' && prevType !== 'heading')
            out.push('');
        if (isBlockquote && prevType !== 'blank' && prevType !== 'blockquote')
            out.push('');
        // A blockquote ends at the first non-`>` line; Carve needs a blank line
        // between it and the following paragraph to keep them separate blocks.
        if (!isBlockquote && !isHeading && !isList && prevType === 'blockquote')
            out.push('');
        // A top-level list needs a blank line before it. A list line right after
        // another list item is a sibling/nested item — Carve already handles both
        // by indentation, so no blank there (it would wrongly make the list loose).
        const isTopLevelList = isList && prevType !== 'list';
        if (isTopLevelList && prevType !== 'blank')
            out.push('');
        // Carve recognizes `#` headings and `>` blockquotes only at column 1, but
        // Markdown allows 1-3 spaces of indent — dedent so the block survives.
        // Lists are NOT dedented: Carve parses indented lists fine, and dedenting
        // only some items of an indented list would reparent its siblings.
        const dedent = indent >= 1 && indent <= 3 && (isHeading || isBlockquote);
        let body = dedent ? line.slice(indent) : line;
        // Strip an ATX heading's optional closing `#` run (Carve keeps it as text).
        if (isHeading)
            body = body.replace(/[ \t]+#+[ \t]*$/, '');
        // Carve has no `+` bullet (it is the list-continuation marker); normalize a
        // Markdown `+` bullet to `-` so the converted list survives.
        if (isList)
            body = body.replace(/^(\s*)\+(\s)/, '$1-$2');
        out.push(convertInline(body));
        if (isHeading && i + 1 < lines.length) {
            const next = lines[i + 1].trim();
            if (next !== '' && !/^#{1,6}\s/.test(next))
                out.push('');
        }
        if (isHeading)
            prevType = 'heading';
        else if (isList)
            prevType = 'list';
        else if (isBlockquote)
            prevType = 'blockquote';
        else
            prevType = 'text';
    }
    // Collapse 3+ consecutive blank lines to 2.
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
//# sourceMappingURL=markdown-migrate.js.map