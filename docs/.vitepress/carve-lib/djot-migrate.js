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
        pattern: /\*\*(?!\s)((?:(?!\n[ \t]*\n)[^*])+?)(?<!\s)\*\*/g,
        message: () => 'Djot/Markdown `**strong**` is not Carve bold — Carve bold is a single `*`, so this renders with literal asterisks.',
        suggestion: (m) => `*${m[1]}*`,
    },
    {
        id: 'markdown-strikethrough-double-tilde',
        family: '~',
        pattern: /~~(?!\s)((?:(?!\n[ \t]*\n)[^~])+?)(?<!\s)~~/g,
        message: () => 'Markdown `~~strikethrough~~` is not Carve — Carve strikethrough is a single `~`.',
        suggestion: (m) => `~${m[1]}~`,
    },
    {
        id: 'djot-subscript-tilde',
        family: '~',
        pattern: /~(?!\s)((?:(?!\n[ \t]*\n)[^~])+?)(?<!\s)~/g,
        message: () => 'Djot subscript `~x~` renders as *strikethrough* in Carve.',
        suggestion: (m) => `,,${m[1]},,`,
    },
    {
        id: 'djot-emphasis-underscore',
        family: '_',
        pattern: /(?<![A-Za-z0-9_])_(?!\s)((?:(?!\n[ \t]*\n)[^_])+?)(?<!\s)_(?![A-Za-z0-9_])/g,
        message: () => 'Djot emphasis `_x_` renders as *underline* in Carve.',
        suggestion: (m) => `/${m[1]}/`,
    },
    {
        id: 'djot-highlight-braces',
        family: '{',
        pattern: /\{=(?!\s)((?:(?!\n[ \t]*\n)[\s\S])+?)(?<!\s)=\}/g,
        message: () => 'Djot highlight `{=x=}` is written `==x==` in Carve.',
        suggestion: (m) => `==${m[1]}==`,
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
        // a >=3 run with at most a single `[A-Za-z0-9_-]` info token. A
        // multiword / attribute info string (```ts title=demo) is NOT a
        // Carve fence — Carve parses it as prose, so we must not mask it.
        const open = line.match(/^(\s*)(`{3,}|~{3,})\s*([a-zA-Z0-9_-]*)\s*$/);
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
/**
 * Scan Djot/Carve source and return warnings for constructs that silently
 * change meaning under Carve. Empty array means the source is free of the
 * known Djot/Carve delimiter collisions.
 */
export function djotMigrationWarnings(source) {
    const out = [];
    // Code (fenced + inline, multi-line) is masked to spaces so no rule
    // can match through or into it. Positions are preserved 1:1. The scan
    // runs over the whole text (not per line) so delimiter pairs that
    // cross a soft line break are still caught. Normalize line endings
    // first, exactly as parse() does, so results don't depend on CRLF.
    const masked = maskCode(source.replace(/\r\n?/g, '\n'));
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
            out.push({
                line,
                column,
                rule: rule.id,
                message: rule.message(m),
                suggestion: rule.suggestion(m),
            });
        }
    }
    out.sort((a, b) => a.line - b.line || a.column - b.column);
    return out;
}
/** Format warnings as `file:line:col rule — message (use: suggestion)`. */
export function formatMigrationWarnings(warnings, file = '<stdin>') {
    return warnings
        .map((w) => `${file}:${w.line}:${w.column} ${w.rule} — ${w.message} (use: ${w.suggestion})`)
        .join('\n');
}
//# sourceMappingURL=djot-migrate.js.map