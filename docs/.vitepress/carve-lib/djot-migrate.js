/*
 * Djot -> Carve migration warnings.
 *
 * Several inline delimiters mean different things in Djot and Carve, so a
 * Djot document fed to a Carve processor renders *wrong with no error*.
 * This module flags exactly those silent mis-renders so a migration is
 * mechanical and reviewable. It deliberately does NOT warn on constructs
 * that mean the same thing in both languages (e.g. `^sup^`, `$math$`,
 * `{+ins+}`/`{-del-}`), to keep the signal-to-noise high.
 *
 * Detection masks all code (fenced + inline, multi-line, mirroring
 * Carve's RE_FENCE) to spaces, then scans the whole document so a
 * delimiter pair that crosses a soft line break is still caught while
 * one crossing a blank line (paragraph break) is not.
 *
 * Known, deliberate limitation: a candidate pair whose closer sits on a
 * line that Carve would start as a new block (heading/list/quote) with
 * no intervening blank line may still be reported. This is an advisory
 * linter a human reviews; an occasional extra warning is acceptable,
 * whereas a missed real mis-render is not — so the bias is intentional.
 */
// Order matters: more specific patterns (``**``, ``~~``) are tested before
// the single-delimiter ones so a `**x**` is not also reported as `*x*`.
const RULES = [
    // `C(x)` = a content run that may cross soft line breaks (Carve's
    // parseInline parses emphasis across them) but never a blank line,
    // and never the delimiter char `x`.
    {
        id: 'markdown-strong-double-star',
        family: '*',
        pattern: /\*\*(?!\s)((?:(?!\n[ \t]*\n)[^*])+?)(?<!\s)\*\*/gd,
        message: () => 'Djot/Markdown `**strong**` is not Carve bold — Carve bold is a single `*`, so this renders with literal asterisks.',
        suggestion: (m) => `*${m[1]}*`,
        delims: ['*', '*'],
    },
    {
        id: 'markdown-strikethrough-double-tilde',
        family: '~',
        pattern: /~~(?!\s)((?:(?!\n[ \t]*\n)[^~])+?)(?<!\s)~~/gd,
        message: () => 'Markdown `~~strikethrough~~` is not Carve — Carve strikethrough is a single `~`.',
        suggestion: (m) => `~${m[1]}~`,
        delims: ['~', '~'],
    },
    {
        id: 'djot-subscript-tilde',
        family: '~',
        pattern: /~(?!\s)((?:(?!\n[ \t]*\n)[^~])+?)(?<!\s)~/gd,
        message: () => 'Djot subscript `~x~` renders as *strikethrough* in Carve.',
        // Forced brace form: a Djot `~x~` is often intraword (e.g. H~2~O), where a
        // bare `,x,` would be literal in Carve; `{,x,}` renders in every position.
        suggestion: (m) => `{,${m[1]},}`,
        delims: ['{,', ',}'],
    },
    {
        id: 'djot-emphasis-underscore',
        family: '_',
        pattern: /(?<![A-Za-z0-9_])_(?!\s)((?:(?!\n[ \t]*\n)[^_])+?)(?<!\s)_(?![A-Za-z0-9_])/gd,
        message: () => 'Djot emphasis `_x_` renders as *underline* in Carve.',
        suggestion: (m) => `/${m[1]}/`,
        delims: ['/', '/'],
    },
    {
        id: 'djot-highlight-braces',
        family: '{',
        pattern: /\{=(?!\s)((?:(?!\n[ \t]*\n)[\s\S])+?)(?<!\s)=\}/gd,
        message: () => 'Djot highlight `{=x=}` is also Carve highlight (`{=x=}`).',
        // Identity: the braced highlight form is valid Carve as-is and renders in
        // every position, so it is kept rather than reduced to a bare `=x=` (which
        // would be literal intraword).
        suggestion: (m) => `{=${m[1]}=}`,
        delims: ['{=', '=}'],
    },
    // Block-level (line-anchored): a leading `+ content` is a bullet in
    // Djot/Markdown but NOT in Carve — `+` is the list-continuation marker, so
    // the line renders as a paragraph. A lone `+` (no content) is excluded: that
    // IS the Carve continuation marker and is intentional.
    {
        id: 'djot-plus-bullet',
        family: 'plus-bullet',
        pattern: /(?<=^[ \t]*)(\+)(?=[ \t]+\S)/gmd,
        message: () => 'Djot/Markdown `+` bullet is not a Carve bullet (`+` is the list-continuation marker) — this line renders as a paragraph.',
        suggestion: () => '-',
    },
    // NOTE: full Djot reference links `[text][ref]` are NOT flagged — Carve
    // resolves them identically against a `[ref]: url` definition (corpus
    // 34-reference-link), so there is no silent mis-render. Math (`$`x``)
    // and editorial `{+ +}`/`{- -}` are likewise identical and unflagged.
];
const blanks = (s) => s.replace(/[^\n]/g, ' ');
/**
 * Return a copy of `src` with every code character (fenced blocks and
 * inline code spans, including multi-line ones) replaced by spaces, and
 * newlines preserved so line/column positions are unchanged. Delimiter
 * collisions inside code are not real mis-renders, so the scanner simply
 * never sees them.
 */
function maskCode(src) {
    // Stage 1: fenced blocks, line by line.
    const lines = src.split('\n');
    let fence = null;
    const staged = lines.map((line) => {
        if (fence) {
            // parseFence: a closer may be indented by at most 3 spaces.
            const close = line.match(/^ {0,3}([`~]{3,})[ \t]*$/);
            if (close && close[1][0] === fence.ch && close[1].length >= fence.len) {
                fence = null;
            }
            return blanks(line);
        }
        // Mirror Carve's RE_FENCE exactly (src/parse.ts): a fence opener is
        // a >=3 run with at most a single `[A-Za-z0-9_+#.-]` info token. A
        // multiword / attribute info string (```ts title=demo) is NOT a
        // Carve fence — Carve parses it as prose, so we must not mask it.
        const open = line.match(/^(\s*)(`{3,}|~{3,})\s*([a-zA-Z0-9_+#.-]*)\s*$/);
        if (open) {
            fence = { ch: open[2][0], len: open[2].length };
            return blanks(line);
        }
        return line;
    });
    const s = staged.join('\n');
    // Stage 2: inline code spans. A run of N backticks closes at the next
    // run of exactly N backticks (Djot allows newlines inside). An
    // unmatched run is literal and left alone (no over-masking).
    const out = s.split('');
    const runLen = (i) => {
        let n = 0;
        while (s[i + n] === '`')
            n++;
        return n;
    };
    let i = 0;
    while (i < s.length) {
        if (s[i] !== '`') {
            i++;
            continue;
        }
        const len = runLen(i);
        let j = i + len;
        let closed = -1;
        while (j < s.length) {
            if (s[j] === '`' && runLen(j) === len) {
                closed = j;
                break;
            }
            j++;
        }
        if (closed === -1) {
            i += len; // unmatched, literal
            continue;
        }
        for (let k = i; k < closed + len; k++)
            if (out[k] !== '\n')
                out[k] = ' ';
        i = closed + len;
    }
    // Stage 3: inline link / image destination + title. Carve consumes
    // `[text](dest "title")` (and the image form) as a whole; delimiters
    // inside the parenthesized part are never inline markup — notably a
    // `~` in a URL path. The bracket text IS inline-parsed, so it is left
    // visible. Lookbehind on `]` keys this to a real link/image target.
    let masked = out.join('');
    masked = masked.replace(/(?<=\])\([^()\n]*\)/g, (g) => blanks(g));
    return masked;
}
/** Project a ScanHit down to the public warning shape (drop `edits`). */
function stripHit(h) {
    return {
        line: h.line,
        column: h.column,
        rule: h.rule,
        message: h.message,
        suggestion: h.suggestion,
        start: h.start,
        end: h.end,
    };
}
/**
 * Scan Djot/Carve source and return warnings for constructs that silently
 * change meaning under Carve. Empty array means the source is free of the
 * known Djot/Carve delimiter collisions.
 */
export function djotMigrationWarnings(source) {
    return scanHits(source).map(stripHit);
}
/** The full scan, carrying the fix edits used by `applyMigrationFixes`. */
function scanHits(source) {
    const out = [];
    // Code (fenced + inline, multi-line) is masked to spaces so no rule
    // can match through or into it. Positions are preserved 1:1. The scan
    // runs over the whole text (not per line) so delimiter pairs that
    // cross a soft line break are still caught. Normalize line endings
    // first, exactly as parse() does, so results don't depend on CRLF.
    // `norm` keeps the real characters (incl. code) at the same offsets as
    // `masked`, so the captured content for a suggestion is sliced from
    // `norm` — masking only ever blanks the *content*, never the delimiters.
    const norm = source.replace(/\r\n?/g, '\n');
    const masked = maskCode(norm);
    // index -> {line, column} (both 1-based), via newline prefix sums.
    const nlAt = [];
    for (let k = 0; k < masked.length; k++)
        if (masked[k] === '\n')
            nlAt.push(k);
    const posOf = (idx) => {
        let lo = 0;
        let hi = nlAt.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (nlAt[mid] < idx)
                lo = mid + 1;
            else
                hi = mid;
        }
        const lineStart = lo === 0 ? 0 : nlAt[lo - 1] + 1;
        return { line: lo + 1, column: idx - lineStart + 1 };
    };
    // Accept matches in RULES order. Drop a later match only if it
    // overlaps an accepted one of the SAME delimiter family — that is a
    // re-match of the same construct (`~~x~~` must not also report the
    // inner `~x~`). A nested *different* family (`~~_x_~~` -> strike AND
    // emphasis; `**_x_**` -> strong AND emphasis) is two real, distinct
    // mis-renders, so both are kept.
    const taken = [];
    const sameFamilyOverlap = (s, e, fam) => taken.some(([ts, te, tf]) => tf === fam && s < te && ts < e);
    for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        let m;
        while ((m = rule.pattern.exec(masked))) {
            const start = m.index;
            const end = m.index + m[0].length;
            // A backslash-escaped opening delimiter is a literal in both
            // Djot and Carve (e.g. `\_x_`). Only an ODD run of backslashes
            // escapes; `\\_x_` is an escaped backslash + a live `_x_`.
            let bs = 0;
            for (let k = start - 1; k >= 0 && masked[k] === '\\'; k--)
                bs++;
            if (bs % 2 === 1)
                continue;
            if (sameFamilyOverlap(start, end, rule.family))
                continue;
            taken.push([start, end, rule.family]);
            const { line, column } = posOf(start);
            // Build the suggestion from the ORIGINAL captured content, not the
            // code-masked one, so `*a `code` b*` round-trips instead of losing
            // the backticked run to spaces. `m.indices` is present because every
            // pattern carries the `d` flag; group 1 always participates.
            const span = m.indices?.[1];
            const orig = span ? norm.slice(span[0], span[1]) : m[1];
            const origM = m.slice();
            origM[1] = orig;
            // Fix edits. A wrapping rule rewrites only its delimiters (the slices
            // before/after the captured content), leaving content verbatim, so
            // nested fixes compose. A whole-span rule (the `+` bullet) replaces
            // its single match with the suggestion.
            const suggestion = rule.suggestion(origM);
            const edits = rule.delims && span
                ? [
                    { start, end: span[0], text: rule.delims[0] },
                    { start: span[1], end, text: rule.delims[1] },
                ]
                : [{ start, end, text: suggestion }];
            out.push({
                line,
                column,
                rule: rule.id,
                message: rule.message(m),
                suggestion,
                start,
                end,
                edits,
            });
        }
    }
    out.sort((a, b) => a.line - b.line || a.column - b.column);
    return out;
}
/**
 * Apply the auto-fixable Djot/Carve migration collisions to `source`,
 * returning the rewritten text. This is the autocorrect companion to
 * {@link djotMigrationWarnings}.
 *
 * Each fix is expressed as edits to its delimiters only, never its content,
 * so strictly nested collisions compose in one pass: the outer strong
 * delimiters and the inner emphasis delimiters sit at distinct offsets, so
 * `**_x_**` fixes to single-star bold wrapping a slash emphasis. Only
 * *crossing* collisions - partial overlaps where neither span contains the
 * other - are skipped, since that source is genuinely ambiguous. The scan is
 * not re-run on the output, so a fixed `~~x~~` -> `~x~` is never re-flagged
 * as a subscript.
 */
export function applyMigrationFixes(source) {
    const hits = scanHits(source);
    const overlaps = (a, b) => a.start < b.end && b.start < a.end;
    const contains = (a, b) => a.start <= b.start && b.end <= a.end;
    const crosses = (a, b) => overlaps(a, b) && !contains(a, b) && !contains(b, a);
    const applied = [];
    const skipped = [];
    for (const h of hits) {
        if (hits.some((o) => o !== h && crosses(h, o)))
            skipped.push(h);
        else
            applied.push(h);
    }
    // No two applied hits cross, so their delimiter edits are pairwise
    // non-overlapping. Splice from the end so each edit leaves earlier
    // offsets valid.
    const edits = applied.flatMap((h) => h.edits).sort((a, b) => b.start - a.start);
    let output = source.replace(/\r\n?/g, '\n');
    for (const e of edits) {
        output = output.slice(0, e.start) + e.text + output.slice(e.end);
    }
    return { output, applied: applied.map(stripHit), skipped: skipped.map(stripHit) };
}
/** Format warnings as `file:line:col rule — message (use: suggestion)`. */
export function formatMigrationWarnings(warnings, file = '<stdin>') {
    return warnings
        .map((w) => `${file}:${w.line}:${w.column} ${w.rule} — ${w.message} (use: ${w.suggestion})`)
        .join('\n');
}
//# sourceMappingURL=djot-migrate.js.map