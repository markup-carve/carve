/*
 * Lint for silent-failure problems in Carve documents.
 *
 * djotMigrationWarnings (djot-migrate.ts) catches *source-level* delimiter
 * collisions. This module catches markup that parses without error but
 * renders as the wrong thing, so nothing throws:
 *
 *   - references that degrade to literal text at resolve() time: broken
 *     `</#id>` cross-references, unresolved `[text][ref]` links, missing
 *     footnotes, and duplicate heading ids;
 *   - footnote definitions that are duplicate or never referenced;
 *   - a trailing `{…}` on a heading, which is literal text under
 *     heading-strict, not an attribute block;
 *   - a ```raw FORMAT fence (the Carve raw block is ```=FORMAT; the wrong
 *     form fails to open and desyncs the rest of the document's fences);
 *   - a line that begins with a block marker (`:::`, `{#`, `{.`) yet parsed
 *     as a paragraph because the block never opened.
 *
 * The id/crossref checks mirror resolveHeadingIds so they agree with what the
 * resolver actually does - they do not re-run resolve (which would discard the
 * very nodes we want to flag by turning a broken crossref or unresolved ref
 * into a Text node). The remaining checks read the source line at each node's
 * position and skip verbatim regions (code/raw blocks) the parser already
 * accounts for.
 */
import { parse } from './parse.js';
import { slugify, inlineText, headingIdSlugOpts, } from './heading-ids.js';
import { normalizeRefLabel } from './parse.js';
function locate(node) {
    const p = node.pos;
    return {
        line: p?.startLine ?? 1,
        column: p?.startColumn ?? 1,
        start: p?.startOffset ?? 0,
        end: p?.endOffset ?? p?.startOffset ?? 0,
    };
}
function walkDocument(doc, visitNode) {
    const visit = (value) => {
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item);
            return;
        }
        if (!value || typeof value !== 'object')
            return;
        const node = value;
        visitNode(node);
        for (const key of Object.keys(node)) {
            if (key !== 'pos' && key !== 'attrs')
                visit(node[key]);
        }
    };
    visit(doc.children);
    if (doc.footnoteDefs)
        visit(Object.values(doc.footnoteDefs));
}
function normalizeHeadingRefLabel(label) {
    return normalizeRefLabel(label).toLowerCase();
}
/** Every `crossref` node anywhere under the document, with its raw target. */
function collectCrossrefs(doc) {
    const found = [];
    walkDocument(doc, (node) => {
        if (node.type === 'crossref' && typeof node.target === 'string') {
            found.push({ target: node.target, node: node });
        }
    });
    return found;
}
function collectUnresolvedRefLinks(doc) {
    const found = [];
    walkDocument(doc, (node) => {
        if (node.type !== 'link' || typeof node.ref !== 'string')
            return;
        found.push({
            ref: node.ref,
            rawRef: typeof node.rawRef === 'string' ? node.rawRef : `[${node.ref}]`,
            node: node,
        });
    });
    return found;
}
function collectFootnoteRefs(doc) {
    const found = [];
    walkDocument(doc, (node) => {
        if (node.type === 'footnote' && typeof node.id === 'string') {
            found.push({ id: node.id, node: node });
        }
    });
    return found;
}
function captionHasNumber(value) {
    return (Array.isArray(value) &&
        value.some((node) => node &&
            typeof node === 'object' &&
            node.type === 'caption-number'));
}
/**
 * Lint a Carve document for silent-failure problems: duplicate heading ids,
 * `</#id>` cross-references with no target, unresolved reference links,
 * missing/duplicate/unused footnotes, trailing heading attribute blocks,
 * legacy `raw FORMAT` fences, and block markers that leaked as paragraph text.
 *
 * `asciiHeadingIds` must match the value passed to `resolve()`, since it
 * changes how heading slugs (and therefore the valid id set) are computed.
 */
export function lintCarve(source, opts = {}) {
    const doc = parse(source, { positions: true });
    const slugOpts = headingIdSlugOpts(opts);
    // Cross-references resolve case-insensitively, so the broken-crossref check
    // folds case the same way resolveHeadingIds does.
    const foldId = (s) => Array.from(s, (c) => c.toLowerCase()).join('');
    const out = [];
    // Build the final heading-id set exactly as resolveHeadingIds does
    // (explicit ids win; colliding slugs get a `-2`, `-3`, … suffix), and warn
    // on every collision along the way.
    const used = new Set();
    const headingRefs = new Map();
    // Mirror resolveHeadingIds: a heading inside a list/blockquote/div/etc. also
    // gets an id and is a valid crossref target, so the lint index must walk the
    // same containers in document order. A blockquote ancestor suppresses the
    // implicit `[label][]` reference target (matching the resolver / carve-php).
    const indexHeadings = (blocks, inBlockquote) => {
        for (const block of blocks) {
            switch (block.type) {
                case 'heading': {
                    const heading = block;
                    const explicit = heading.attrs?.id;
                    let id;
                    if (explicit !== undefined) {
                        id = explicit;
                        if (used.has(explicit)) {
                            out.push({
                                ...locate(heading),
                                rule: 'duplicate-heading-id',
                                message: `Duplicate heading id "${explicit}": the repeated HTML id is invalid, and cross-references to it resolve to the first occurrence.`,
                            });
                        }
                        used.add(explicit);
                    }
                    else {
                        const base = slugify(inlineText(heading.children), slugOpts);
                        if (used.has(base)) {
                            let n = 2;
                            while (used.has(`${base}-${n}`))
                                n++;
                            id = `${base}-${n}`;
                            out.push({
                                ...locate(heading),
                                rule: 'duplicate-heading-id',
                                message: `Heading slug "${base}" collides with an earlier heading; its auto id becomes "${id}", and ambiguous references to "${base}" resolve to the first occurrence.`,
                            });
                            used.add(id);
                        }
                        else {
                            id = base;
                            used.add(base);
                        }
                    }
                    if (!inBlockquote) {
                        const key = normalizeHeadingRefLabel(inlineText(heading.children));
                        if (key && !headingRefs.has(key))
                            headingRefs.set(key, id);
                    }
                    break;
                }
                case 'blockquote':
                    indexHeadings(block.children, true);
                    break;
                case 'admonition':
                case 'div':
                    indexHeadings(block.children, inBlockquote);
                    break;
                case 'list':
                    for (const it of block.items)
                        indexHeadings(it.children, inBlockquote);
                    break;
                case 'definition-list':
                    for (const it of block.items)
                        for (const d of it.definitions)
                            indexHeadings(d, inBlockquote);
                    break;
                case 'figure':
                    if (block.target.type === 'blockquote')
                        indexHeadings(block.target.children, true);
                    break;
                default:
                    break;
            }
        }
    };
    indexHeadings(doc.children, false);
    // Captioned tables/figures with a `#` caption-number placeholder and an id
    // are also valid cross-reference targets after resolve() numbers captions.
    walkDocument(doc, (node) => {
        const attrs = node.attrs;
        if (attrs?.id === undefined)
            return;
        if (node.type === 'table' && captionHasNumber(node.caption))
            used.add(attrs.id);
        if (node.type === 'figure' && captionHasNumber(node.caption))
            used.add(attrs.id);
    });
    // `used` now holds every valid id. A crossref to anything else degrades to
    // literal text in resolveHeadingIds.
    const usedFolded = new Set([...used].map(foldId));
    for (const { target, node } of collectCrossrefs(doc)) {
        if (used.has(target) || usedFolded.has(foldId(target)))
            continue;
        out.push({
            ...locate(node),
            rule: 'broken-crossref',
            message: `Cross-reference </#${target}> has no matching heading id; it renders as the literal text "</#${target}>".`,
        });
    }
    // Reference links that survived parse() have no explicit link definition.
    // resolve() may still turn them into implicit heading links; anything else
    // renders as its literal source text.
    for (const { ref, rawRef, node } of collectUnresolvedRefLinks(doc)) {
        if (headingRefs.has(normalizeHeadingRefLabel(ref)))
            continue;
        out.push({
            ...locate(node),
            rule: 'unresolved-reference-link',
            message: `Reference link ${rawRef} has no matching link definition or heading; it renders as literal text.`,
        });
    }
    const footnoteRefs = collectFootnoteRefs(doc);
    const footnoteDefs = doc.footnoteDefs ?? {};
    const referencedFootnotes = new Set();
    for (const { id, node } of footnoteRefs) {
        referencedFootnotes.add(id);
        if (footnoteDefs[id])
            continue;
        out.push({
            ...locate(node),
            rule: 'unresolved-footnote',
            message: `Footnote reference [^${id}] has no matching definition; it renders as literal text.`,
        });
    }
    collectSilentFailures(source, doc, out);
    collectFootnoteDefinitionWarnings(source, doc, referencedFootnotes, out);
    out.sort((a, b) => a.start - b.start || a.line - b.line || a.column - b.column);
    return out;
}
/** A trailing `{.class}` / `{#id}` attribute block at the end of a line. The
 *  leading `(^|\s)` keeps a valid inline span like `[t]{.c}` (brace abuts `]`,
 *  no space) from matching. */
const TRAILING_HEADING_ATTR = /(^|\s)(\{\s*[.#][^{}]*\})\s*$/;
/** A fenced block whose info string is the legacy `raw FORMAT` form. */
const LEGACY_RAW_FENCE = /^(\s*)(`{3,}|~{3,})\s*raw\s+(\S+)/;
/** A line that opens like a block construct (`:::`, `{#`, `{.`). */
const LEAKED_BLOCK_MARKER = /^(\s*)(:{3,}|\{[.#])/;
/** A footnote definition line. Mirrors parse.ts. */
const FOOTNOTE_DEF = /^\[\^([^\]]+)\]:\s+(.+)$/;
/**
 * Source-line checks for constructs that parsed into the wrong node. Each is
 * anchored to a parsed node so verbatim regions (code/raw blocks) are skipped
 * automatically: only real headings/paragraphs are inspected, and the
 * raw-fence scan ignores lines inside a code/raw block.
 */
function collectSilentFailures(source, doc, out) {
    const lines = source.split('\n');
    const lineStart = [];
    for (let off = 0, i = 0; i < lines.length; i++) {
        lineStart[i] = off;
        off += lines[i].length + 1;
    }
    const push = (lineNo, col, len, rule, message) => {
        const start = (lineStart[lineNo - 1] ?? 0) + (col - 1);
        out.push({ line: lineNo, column: col, rule, message, start, end: start + len });
    };
    const verbatim = [];
    const headings = [];
    const paragraphs = [];
    const walk = (value) => {
        if (Array.isArray(value)) {
            for (const item of value)
                walk(item);
            return;
        }
        if (!value || typeof value !== 'object')
            return;
        const node = value;
        const pos = node.pos;
        const endLine = pos?.endLine;
        if (node.type === 'heading')
            headings.push(node);
        else if (node.type === 'paragraph')
            paragraphs.push(node);
        else if ((node.type === 'code-block' || node.type === 'raw-block') && pos) {
            verbatim.push([pos.startLine, endLine ?? pos.startLine]);
        }
        else if (node.type === 'figure' && pos) {
            // A captioned code/raw block is a figure wrapping a *position-less*
            // code-block target, so the block itself never reaches the branch above.
            // Use the figure's range so the fence scan still skips its verbatim body.
            const target = node.target?.type;
            if (target === 'code-block' || target === 'raw-block') {
                verbatim.push([pos.startLine, endLine ?? pos.startLine]);
            }
        }
        for (const key of Object.keys(node)) {
            if (key !== 'pos' && key !== 'attrs')
                walk(node[key]);
        }
    };
    walk(doc.children);
    // 1. Trailing attribute block on a heading: literal text, not attributes.
    for (const h of headings) {
        const ln = h.pos?.endLine ?? h.pos?.startLine;
        if (!ln)
            continue;
        const line = lines[ln - 1] ?? '';
        // Guard against position drift: only flag if this really is a heading line.
        if (!/^\s*#{1,6}\s/.test(line))
            continue;
        const m = TRAILING_HEADING_ATTR.exec(line);
        if (!m)
            continue;
        const col = m.index + m[1].length + 1;
        push(ln, col, m[2].length, 'heading-trailing-attribute', `Trailing "${m[2]}" on a heading is literal text in Carve, not an attribute block. ` +
            `Move it to a "${m[2]}" line directly above the heading.`);
    }
    // 2. Legacy `raw FORMAT` fence: never opens, and desyncs later fences.
    const inVerbatim = (ln) => verbatim.some(([s, e]) => ln >= s && ln <= e);
    for (let i = 0; i < lines.length; i++) {
        if (inVerbatim(i + 1))
            continue;
        const m = LEGACY_RAW_FENCE.exec(lines[i]);
        if (!m)
            continue;
        push(i + 1, m[1].length + 1, lines[i].length - m[1].length, 'raw-block-syntax', `"${m[2]}raw ${m[3]}" is not a Carve raw block; it fails to open and desyncs the ` +
            `document's fences. Use "${m[2]}=${m[3]}" to pass content through to ${m[3]}.`);
    }
    // 3. A paragraph whose first inline text opens like a block construct: the
    //    block never opened, so the marker leaked as plain text. Gating on the
    //    text content (not the source line) avoids a false positive when a valid
    //    container's child paragraph reports its parent's start line.
    for (const p of paragraphs) {
        const first = p.children?.[0];
        if (first?.type !== 'text' || typeof first.value !== 'string')
            continue;
        const m = LEAKED_BLOCK_MARKER.exec(first.value);
        if (!m)
            continue;
        const loc = locate(first);
        const what = m[2].startsWith(':')
            ? `an admonition/div fence ("${m[2]}")`
            : `a block-attribute line ("${m[2]}…")`;
        out.push({
            line: loc.line,
            column: loc.column,
            rule: 'block-marker-as-text',
            message: `This line begins like ${what} but parsed as plain text - the block did not open. ` +
                `Check this line's syntax and any unterminated fence above it.`,
            start: loc.start,
            end: loc.start + m[2].length,
        });
    }
}
function collectFootnoteDefinitionWarnings(source, doc, referenced, out) {
    const lines = source.split('\n');
    const lineStart = [];
    for (let off = 0, i = 0; i < lines.length; i++) {
        lineStart[i] = off;
        off += lines[i].length + 1;
    }
    const verbatim = [];
    walkDocument(doc, (node) => {
        const pos = node.pos;
        const endLine = pos?.endLine;
        if ((node.type === 'code-block' || node.type === 'raw-block') && pos) {
            verbatim.push([pos.startLine, endLine ?? pos.startLine]);
        }
        else if (node.type === 'figure' && pos) {
            const target = node.target?.type;
            if (target === 'code-block' || target === 'raw-block') {
                verbatim.push([pos.startLine, endLine ?? pos.startLine]);
            }
        }
    });
    const inVerbatim = (ln) => verbatim.some(([s, e]) => ln >= s && ln <= e);
    const firstSites = new Map();
    for (let i = 0; i < lines.length; i++) {
        if (inVerbatim(i + 1))
            continue;
        const line = lines[i];
        const m = FOOTNOTE_DEF.exec(line);
        if (!m)
            continue;
        const label = m[1].trim();
        const col = line.indexOf('[^') + 1;
        const start = (lineStart[i] ?? 0) + (col - 1);
        const site = { line: i + 1, col, start, end: start + m[0].length };
        if (firstSites.has(label)) {
            out.push({
                line: site.line,
                column: site.col,
                rule: 'duplicate-footnote-definition',
                message: `Duplicate footnote definition [^${label}] is ignored; the first definition for a label wins.`,
                start: site.start,
                end: site.end,
            });
        }
        else {
            firstSites.set(label, site);
        }
    }
    for (const label of Object.keys(doc.footnoteDefs ?? {})) {
        if (referenced.has(label))
            continue;
        const site = firstSites.get(label);
        out.push({
            line: site?.line ?? 1,
            column: site?.col ?? 1,
            rule: 'unused-footnote-definition',
            message: `Footnote definition [^${label}] is never referenced, so it is omitted from the rendered document.`,
            start: site?.start ?? 0,
            end: site?.end ?? 0,
        });
    }
}
/** Format lint warnings as `file:line:col rule — message`. */
export function formatLintWarnings(warnings, file = '<stdin>') {
    return warnings
        .map((w) => `${file}:${w.line}:${w.column} ${w.rule} — ${w.message}`)
        .join('\n');
}
//# sourceMappingURL=lint.js.map