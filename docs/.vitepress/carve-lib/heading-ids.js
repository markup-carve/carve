/*
 * Heading identifier generation + cross-reference resolution.
 *
 * Behavior is fixed by markup-carve/carve PR #1 ("Automatic Identifiers")
 * plus the ASCII-safety transliteration step ported from djot-php #183
 * (so a heading id survives being shared as a URL fragment through
 * auto-linkers, which routinely truncate or mis-encode non-ASCII).
 * slugify is pure and context-free; dedup lives in resolveHeadingIds.
 */
import { normalizeRefLabel } from './parse.js';
import { TRANSLIT_MAP } from './translit-map.js';
/**
 * Implicit heading references match a heading's visible TEXT, which is a
 * fuzzier lookup than an explicit `[label]: url` reference (kept
 * case-sensitive in normalizeRefLabel). `[getting started][]` should still
 * resolve `# Getting Started`, so heading-text matching folds case here.
 */
function normalizeHeadingRefLabel(label) {
    return normalizeRefLabel(label).toLowerCase();
}
/**
 * Apply the baked Unicode->ASCII map (Latin / IPA / combining marks /
 * Cyrillic / Latin-Extended-Additional / punctuation / super- and
 * sub-script / currency / letterlike, byte-identical with djot-php's
 * deterministic fallback). Greek is *deliberately excluded* — its ICU
 * transliteration is context-sensitive (`αυ`->`au` but `υ`->`y`) so it
 * can't be baked as a context-free map; Greek headings, like CJK and
 * Arabic, pass through unchanged. The downstream regex keeps them as
 * letters; an author can attach an explicit `{#id}` for a share-safe
 * slug if needed.
 */
function transliterate(s) {
    let out = '';
    for (const ch of s)
        out += TRANSLIT_MAP[ch] ?? ch;
    return out;
}
/**
 * Reverse smart-typography substitutions to their ASCII source before a slug is
 * computed, so an id never depends on presentational typography. Without this,
 * `# That's all` (parsed with smart quotes) would keep the curly `’` in its id;
 * `# Step 1 -> 2` would keep `→`. The map is the inverse of the parser's
 * SMART_TOKENS plus smart quotes and dashes. Applied before slugRun, so the
 * recovered ASCII punctuation then collapses to hyphens like any other.
 */
const SMART_TO_ASCII = {
    '↔': '<->', '™': '(tm)', '…': '...', '→': '->', '←': '<-', '⇒': '=>',
    '≤': '<=', '≥': '>=', '≠': '!=', '±': '+-', '©': '(c)', '®': '(r)',
    '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"',
};
function deTypography(s) {
    let out = '';
    for (const ch of s)
        out += SMART_TO_ASCII[ch] ?? ch;
    return out;
}
/**
 * Trojan-Source hardening for generated ids. Two pre-slug transforms make an id
 * deterministic and free of dangerous/invisible Unicode (CVE-2021-42574 class):
 *
 *  - NFC normalization, so a precomposed `é` (U+00E9) and a decomposed
 *    `e`+U+0301 produce the SAME id.
 *  - Stripping bidi-override / isolate controls (U+202A..U+202E, U+2066..U+2069)
 *    and zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF, U+00AD)
 *    so none of these can ever appear inside an `id="..."`.
 *
 * Applied before the slug run so the remaining text slugs as usual.
 */
const ID_STRIP_RE = /[\u202A-\u202E\u2066-\u2069\u200B\u200C\u200D\u2060\uFEFF\u00AD]/gu;
function sanitizeIdSource(s) {
    return s.normalize('NFC').replace(ID_STRIP_RE, '');
}
/**
 * jgm/djot#393 slug step: replace each maximal run of non-alphanumeric ASCII with a
 * single '-' and trim. Non-ASCII characters and letter case are preserved.
 */
function slugRun(s) {
    return s.replace(/[^0-9A-Za-z\u{80}-\u{10FFFF}]+/gu, '-').replace(/^-+|-+$/gu, '');
}
/**
 * Strict variant of slugRun: collapses every run of non-ASCII-alphanumeric -
 * INCLUDING any non-ASCII code point - to a single '-', then trims. Used by the
 * strict ASCII heading-id mode for residue that transliterate() cannot map
 * (Greek, CJK, Arabic, emoji): such code points become separators instead of
 * surviving verbatim, so the slug is guaranteed to match `[0-9A-Za-z-]`.
 */
function slugRunAscii(s) {
    return s.replace(/[^0-9A-Za-z]+/gu, '-').replace(/^-+|-+$/gu, '');
}
/**
 * Translate the public `asciiHeadingIds` / `lowercaseHeadingIds` options into
 * the `slugify` flags. Shared by `resolve()` and `lintCarve` so the lint id set
 * matches the resolver exactly.
 */
export function headingIdSlugOpts(opts) {
    const v = opts.asciiHeadingIds;
    return {
        lowercase: opts.lowercaseHeadingIds ?? false,
        asciiFold: v === true || v === 'fold' || v === 'strict',
        asciiStrict: v === 'strict',
    };
}
/**
 * The automatic-identifier rule. Pure, context-free, no dedup.
 *
 * Default is CASE-PRESERVING with no Unicode normalization or case folding:
 * the jgm/djot#393 run-replacement over the raw code points, keeping non-ASCII
 * verbatim (e.g. a German heading keeps its umlaut). Zero-dependency and
 * byte-identical across implementations, matching djot's "no Unicode tables"
 * identifier model. Cross-reference resolution is case-insensitive (see
 * resolveHeadingIds), so `</#getting-started>` still resolves to the
 * case-preserved `Getting-Started` id. Three opt-in, orthogonal transforms:
 * `lowercase` (GitHub/SSG-style anchors, folded per code point so no
 * context mapping such as Greek final-sigma applies); `asciiFold`
 * (transliterate the slug to ASCII for share-safe URL fragments, best-effort -
 * unmappable scripts are kept); and `asciiStrict` (implies `asciiFold`, also
 * drops the unmappable residue for a guaranteed pure-ASCII slug). Combine with
 * `lowercase` for a fully lowercase ASCII slug.
 */
export function slugify(plainText, opts = {}) {
    let s = slugRun(deTypography(sanitizeIdSource(plainText)));
    if (opts.asciiFold || opts.asciiStrict) {
        // Transliterate runs in both modes so Latin/Cyrillic become letters rather
        // than separators. Strict then uses slugRunAscii to drop unmappable
        // residue; best-effort fold uses slugRun, which keeps it verbatim.
        s = transliterate(s);
        s = opts.asciiStrict ? slugRunAscii(s) : slugRun(s);
    }
    // Per code point (no whole-string context mappings, e.g. final-sigma)
    // so opt-in lowercasing stays portable across implementations.
    if (opts.lowercase) {
        s = Array.from(s, (c) => c.toLowerCase()).join('');
    }
    // A leading digit is a valid HTML id but an invalid bare CSS selector, so prefix.
    if (/^\p{N}/u.test(s))
        s = `s-${s}`;
    if (s === '')
        s = 's';
    return s;
}
/**
 * Visible plain text of an inline run (markup stripped).
 *
 * A reference-link placeholder (Link with `ref` still set) contributes
 * its `children` text just like a resolved Link — both for heading-id
 * derivation and for the implicit-heading-ref key. This matches the
 * cross-impl behavior in carve-php's CarveConverter: a heading
 * `# [Title][maybe]` slugs to `title` regardless of whether `maybe`
 * resolves, so an implicit `[Title][]` can target it consistently.
 */
export function inlineText(nodes) {
    let out = '';
    for (const n of nodes) {
        switch (n.type) {
            case 'text':
            case 'code':
                out += n.value;
                break;
            case 'math':
                out += n.content;
                break;
            case 'italic':
            case 'strong':
            case 'underline':
            case 'strike':
            case 'super':
            case 'sub':
            case 'highlight':
            case 'bold-italic':
            case 'link':
            case 'span':
            case 'critic-insert':
            case 'critic-delete':
                out += inlineText(n.children);
                break;
            case 'extension':
                out += inlineText(n.content);
                break;
            case 'critic-substitute':
                out += n.newText;
                break;
            case 'abbreviation':
                out += n.abbr;
                break;
            case 'mention':
                out += n.user;
                break;
            case 'tag':
                out += n.name;
                break;
            case 'soft-break':
            case 'hard-break':
                out += ' ';
                break;
            case 'caption-number':
                // Contributes its assigned number (nothing while unresolved).
                out += n.n === undefined ? '' : String(n.n);
                break;
            // image, autolink, footnote, crossref, critic-comment: no slug text
            default:
                break;
        }
    }
    return out;
}
/**
 * Assign heading ids (explicit verbatim wins, auto slugified, 1-based
 * dedup in a shared document-order namespace) and resolve </#id>
 * crossrefs (first-occurrence target, link text cloned from the target
 * heading; unresolved -> literal text). Mutates and returns `doc`.
 */
export function resolveHeadingIds(doc, opts = {}) {
    const used = new Set();
    const nextCounters = new Map();
    const targets = new Map();
    // Case-insensitive `</#id>` index: case-folded id -> actual (verbatim) id,
    // first occurrence wins. Lets `</#getting-started>` resolve to a
    // case-preserved `Getting-Started` heading (or an explicit `{#MyId}`)
    // without lowercasing the emitted id. Folded per code point to stay
    // portable, mirroring slugify's optional lowercase.
    const foldId = (s) => Array.from(s, (c) => c.toLowerCase()).join('');
    const foldedTargets = new Map();
    // Implicit-reference index: normalized visible heading text -> heading id.
    // First-occurrence wins (matches `</#id>` ambiguous-ref behavior). Built
    // from the parsed AST's inlineText so it agrees with the heading slug
    // exactly — no regex pre-pass guesswork.
    const headingRefs = new Map();
    // Assign every heading an id in DOCUMENT ORDER, descending into nested
    // containers (list items, blockquotes, divs/admonitions, definition lists,
    // tables, figures) so a heading inside a list item carries its slug id on
    // the <h*> just like a top-level one (Bug A; carve-php parity). The dedup
    // counter and the implicit-reference/crossref target index are shared across
    // top-level and nested headings, matching carve-php's single document-order
    // pass. The <section> wrapper stays a top-level-only concern in render-html;
    // nested headings emit just <h* id> with no section.
    // `inBlockquote`: a heading with ANY blockquote ancestor still gets an id and
    // is a valid `</#id>` crossref target, but is NOT registered as an implicit
    // `[label][]` reference target -- matching carve-php, where a blockquote
    // ancestor (in either nesting order) suppresses the implicit-ref index entry
    // while list/div/deflist nesting does not.
    const assignHeadingId = (heading, inBlockquote) => {
        let id;
        if (heading.attrs?.id !== undefined) {
            // An explicit id wins verbatim, INCLUDING an explicit empty `id=""`
            // (`{id=""}` then `# T` -> `<section id="">`): it suppresses the auto
            // slug rather than being treated as absent.
            id = heading.attrs.id;
            used.add(id);
        }
        else {
            const base = slugify(inlineText(heading.children), opts);
            if (!used.has(base)) {
                id = base;
                nextCounters.set(base, 2);
            }
            else {
                let n = nextCounters.get(base) ?? 2;
                while (used.has(`${base}-${n}`))
                    n++;
                id = `${base}-${n}`;
                nextCounters.set(base, n + 1);
            }
            used.add(id);
            heading.attrs = { ...heading.attrs, id };
        }
        if (!targets.has(id))
            targets.set(id, heading.children);
        const fk = foldId(id);
        if (!foldedTargets.has(fk))
            foldedTargets.set(fk, id);
        if (inBlockquote)
            return;
        const plain = inlineText(heading.children);
        const key = normalizeHeadingRefLabel(plain);
        if (key && !headingRefs.has(key))
            headingRefs.set(key, id);
    };
    const assignIds = (blocks, inBlockquote) => {
        for (const b of blocks) {
            switch (b.type) {
                case 'heading':
                    assignHeadingId(b, inBlockquote);
                    break;
                case 'blockquote':
                    assignIds(b.children, true);
                    break;
                case 'admonition':
                case 'div':
                    assignIds(b.children, inBlockquote);
                    break;
                case 'list':
                    for (const it of b.items)
                        assignIds(it.children, inBlockquote);
                    break;
                case 'definition-list':
                    for (const it of b.items)
                        for (const d of it.definitions)
                            assignIds(d, inBlockquote);
                    break;
                case 'figure':
                    if (b.target.type === 'blockquote')
                        assignIds(b.target.children, true);
                    break;
                default:
                    break;
            }
        }
    };
    assignIds(doc.children, false);
    // Two-pass resolution: implicit-heading refs must be finalized
    // BEFORE crossref cloning, otherwise a forward `</#id>` could clone
    // a heading's children while they still hold unresolved Link
    // placeholders, locking those placeholders into the clone where the
    // second pass can't see them. Refs are resolved first; then crossrefs
    // clone the now-finalized heading children.
    /** Pass 1: finalize unresolved reference links in-place. */
    const resolveRefs = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.type === 'link' && n.ref !== undefined) {
                // No explicit `[label]: url` def matched in applyLinkDefs.
                // Try the implicit-heading index; otherwise fall back to the
                // raw source text. Explicit defs win because applyLinkDefs
                // already resolved those before this pass.
                const id = headingRefs.get(normalizeHeadingRefLabel(n.ref));
                if (id) {
                    n.href = `#${id}`;
                    delete n.ref;
                    delete n.rawRef;
                }
                else {
                    nodes[i] = { type: 'text', value: n.rawRef ?? '' };
                    continue;
                }
            }
            switch (n.type) {
                case 'italic':
                case 'strong':
                case 'underline':
                case 'strike':
                case 'super':
                case 'sub':
                case 'highlight':
                case 'bold-italic':
                case 'link':
                case 'span':
                case 'critic-insert':
                case 'critic-delete':
                    resolveRefs(n.children);
                    break;
                case 'extension':
                    resolveRefs(n.content);
                    break;
                case 'footnote':
                    // Inline footnote content (`^[…]`) lives in `.inline`; resolve refs
                    // there too so an implicit/reference link inside a note is finalized.
                    if (n.inline)
                        resolveRefs(n.inline);
                    break;
                default:
                    break;
            }
        }
    };
    const crossrefCloneCache = new Map();
    // Pre-resolution snapshot of each target's inline children, taken before any
    // crossref resolution mutates them. Crossref link text is cloned from here
    // (not from the live target) so a reference never picks up a nested link the
    // within-target pass already wrote into another target -- which would
    // double-expand the text (e.g. `A B ` / `Title Bee` instead of one level).
    const pristineTargets = new Map();
    // Flatten any `</#…>` crossref nodes inside a target's text to plain text:
    // a NESTED crossref does NOT recursively expand its own target. This makes
    // crossref resolution strictly ONE LEVEL (the target's own text), matching
    // carve-php / carve-rs and making the result bounded regardless of how
    // crossrefs chain or cycle. (A resolved crossref shows nothing for the
    // nested link; an UNresolved `</#x>` would render literally, but at clone
    // time nested crossrefs are still raw `crossref` nodes, so emit empty text
    // to mirror the siblings, which drop the nested reference entirely.)
    const flattenNestedCrossrefs = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.type === 'crossref') {
                nodes[i] = { type: 'text', value: '' };
                continue;
            }
            switch (n.type) {
                case 'italic':
                case 'strong':
                case 'underline':
                case 'strike':
                case 'super':
                case 'sub':
                case 'highlight':
                case 'bold-italic':
                case 'link':
                case 'span':
                case 'critic-insert':
                case 'critic-delete':
                    flattenNestedCrossrefs(n.children);
                    break;
                case 'extension':
                    flattenNestedCrossrefs(n.content);
                    break;
                case 'footnote':
                    if (n.inline)
                        flattenNestedCrossrefs(n.inline);
                    break;
                default:
                    break;
            }
        }
    };
    /**
     * Pass 2: resolve `</#id>` crossrefs into one-level links.
     *
     * Each crossref becomes a link whose text is a clone of the TARGET's own
     * inline children with any nested crossrefs flattened to text -- i.e. the
     * resolution is strictly one level deep and never recurses into a target's
     * own crossrefs. This matches carve-php / carve-rs (`# A </#a>` ->
     * `A <a href="#A">A </a>`; `See </#a>` where A is `# Title </#b>` ->
     * `<a href="#a">Title </a>`), and -- critically -- makes resolution bounded
     * and non-recursive in the crossref graph. Previously a crossref CYCLE
     * (self-ref, mutual A<->B, or any ring) made a target transitively contain
     * itself; the shared clone cache then spliced a link's `children` array into
     * itself, producing an unbounded / cyclic object graph that overflowed the
     * later `enforceNoNesting` walk (`RangeError: Maximum call stack size
     * exceeded`) -- a crash-DoS reachable from every public API on tiny input.
     */
    const resolveCrossrefs = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.type === 'crossref') {
                // Exact match first, then case-insensitive (case-folded) fallback so a
                // lowercase `</#getting-started>` resolves to a case-preserved
                // `Getting-Started` id. The emitted href uses the ACTUAL id.
                const tgtId = targets.has(n.target)
                    ? n.target
                    : foldedTargets.get(foldId(n.target));
                const tgt = tgtId !== undefined ? targets.get(tgtId) : undefined;
                if (tgt && tgtId !== undefined) {
                    let children = crossrefCloneCache.get(tgtId);
                    if (!children) {
                        // Clone each target once per document from its PRISTINE
                        // (pre-resolution) text, then flatten its OWN nested crossrefs to
                        // text so the link stays one level (no recursion into the crossref
                        // graph -> no cycle, no unbounded chain). Cloning from pristine --
                        // not the live target -- avoids inheriting a nested link another
                        // target's resolution already wrote in. Repeated crossrefs share
                        // the cached immutable tree.
                        const source = pristineTargets.get(tgtId) ?? tgt;
                        children = JSON.parse(JSON.stringify(source));
                        flattenNestedCrossrefs(children);
                        crossrefCloneCache.set(tgtId, children);
                    }
                    const link = {
                        type: 'link',
                        href: `#${tgtId}`,
                        children,
                        fromCrossref: true,
                    };
                    nodes[i] = link;
                }
                else {
                    const txt = { type: 'text', value: `</#${n.target}>` };
                    nodes[i] = txt;
                }
                continue;
            }
            switch (n.type) {
                case 'italic':
                case 'strong':
                case 'underline':
                case 'strike':
                case 'super':
                case 'sub':
                case 'highlight':
                case 'bold-italic':
                case 'link':
                case 'span':
                case 'critic-insert':
                case 'critic-delete':
                    resolveCrossrefs(n.children);
                    break;
                case 'extension':
                    resolveCrossrefs(n.content);
                    break;
                case 'footnote':
                    if (n.inline)
                        resolveCrossrefs(n.inline);
                    break;
                default:
                    break;
            }
        }
    };
    const walkBlock = (b, fn) => {
        switch (b.type) {
            case 'heading':
            case 'paragraph':
                fn(b.children);
                break;
            case 'blockquote':
                if (b.attribution)
                    fn(b.attribution);
                b.children.forEach((c) => walkBlock(c, fn));
                break;
            case 'list':
                for (const item of b.items)
                    item.children.forEach((c) => walkBlock(c, fn));
                break;
            case 'admonition':
                if (b.title)
                    fn(b.title);
                b.children.forEach((c) => walkBlock(c, fn));
                break;
            case 'div':
                b.children.forEach((c) => walkBlock(c, fn));
                break;
            case 'definition-list':
                for (const it of b.items) {
                    for (const t of it.terms)
                        fn(t);
                    for (const d of it.definitions)
                        d.forEach((c) => walkBlock(c, fn));
                }
                break;
            case 'table':
                if (b.caption)
                    fn(b.caption);
                for (const row of b.rows)
                    for (const cell of row.cells)
                        fn(cell.children);
                break;
            case 'figure':
                fn(b.caption);
                if (b.target.type === 'blockquote' || b.target.type === 'table')
                    walkBlock(b.target, fn);
                break;
            default:
                break;
        }
    };
    // Footnote definition bodies live on doc.footnoteDefs, not in
    // doc.children, so they need the same two passes — otherwise a
    // `[Heading][]` or `</#id>` inside a note renders literally. All refs
    // finalize before any crossref cloning (same invariant as above).
    // Caption numbering pass (#87): walk captioned elements in document
    // order, assign a per-label number where a caption carries a `#`
    // placeholder, fill the placeholder, and register the element id as a
    // crossref target whose auto-text is "label + number". Runs BEFORE
    // crossref resolution so a `</#id>` (including a forward reference) to a
    // numbered caption resolves.
    const footnoteBodies = doc.footnoteDefs ? Object.values(doc.footnoteDefs) : [];
    const counters = new Map();
    const numberCaption = (caption, attrs) => {
        const idx = caption.findIndex((n) => n.type === 'caption-number');
        if (idx === -1)
            return;
        const labelNodes = caption.slice(0, idx);
        const label = inlineText(labelNodes).replace(/\s+$/, '');
        const next = (counters.get(label) ?? 0) + 1;
        counters.set(label, next);
        caption[idx].n = next;
        const id = attrs?.id;
        if (id !== undefined && !targets.has(id)) {
            // Clean "Label N" auto-text: clone the label inlines, trim trailing
            // whitespace on the final text node, then append " N". Markup in the
            // label is preserved.
            const autoNodes = labelNodes.map((n) => ({ ...n }));
            const last = autoNodes[autoNodes.length - 1];
            if (last && last.type === 'text') {
                last.value = last.value.replace(/\s+$/, '');
            }
            autoNodes.push({ type: 'text', value: ` ${next}` });
            targets.set(id, autoNodes);
        }
    };
    const numberBlocks = (blocks) => {
        for (const b of blocks) {
            if (b.type === 'figure') {
                numberCaption(b.caption, b.attrs);
            }
            else if (b.type === 'table' && b.caption) {
                numberCaption(b.caption, b.attrs);
            }
            switch (b.type) {
                case 'blockquote':
                case 'admonition':
                case 'div':
                    numberBlocks(b.children);
                    break;
                case 'list':
                    for (const it of b.items)
                        numberBlocks(it.children);
                    break;
                case 'definition-list':
                    for (const it of b.items)
                        for (const d of it.definitions)
                            numberBlocks(d);
                    break;
                case 'figure':
                    // A figure wraps an image / blockquote / table; descend into a
                    // blockquote or table target so a nested captioned element is
                    // numbered too (mirrors walkBlock's figure-target descent).
                    if (b.target.type === 'blockquote')
                        numberBlocks(b.target.children);
                    else if (b.target.type === 'table' && b.target.caption)
                        numberCaption(b.target.caption, b.target.attrs);
                    break;
                default:
                    break;
            }
        }
    };
    for (const block of doc.children)
        walkBlock(block, resolveRefs);
    for (const body of footnoteBodies)
        for (const b of body)
            walkBlock(b, resolveRefs);
    // Number captions AFTER ref resolution so a label that contains an
    // implicit heading reference (`^ [Setup][] #: …`) is cloned into the
    // crossref auto-text already resolved (no dangling href=""), and BEFORE
    // crossref resolution so a `</#id>` to a numbered caption resolves.
    numberBlocks(doc.children);
    for (const body of footnoteBodies)
        numberBlocks(body);
    // Snapshot each target's children BEFORE any crossref resolution mutates
    // them, so the clone cache can build one-level link text from the target's
    // own (pre-resolution) inlines rather than from a copy that another target's
    // resolution has already rewritten with nested links.
    for (const [id, children] of targets)
        pristineTargets.set(id, JSON.parse(JSON.stringify(children)));
    // Finalize crossrefs WITHIN target (heading/caption) children so each
    // target's own `</#…>` becomes a one-level link in its rendered text.
    for (const children of targets.values())
        resolveCrossrefs(children);
    for (const block of doc.children)
        walkBlock(block, resolveCrossrefs);
    for (const body of footnoteBodies)
        for (const b of body)
            walkBlock(b, resolveCrossrefs);
    // Pass 3: enforce "links never nest" (CommonMark: a link may not contain
    // another link). This runs AFTER reference and crossref resolution because
    // both turn into Link nodes only here -- so a `</#id>` crossref or a
    // resolved reference inside a link's text would otherwise survive as a
    // nested anchor. A link found inside another link is unwrapped to its text
    // (only the outermost destination applies); an autolink becomes plain text.
    // A footnote body renders in the endnotes section, outside any anchor, so
    // its links are not nested -- the walk re-enters it with insideLink = false.
    const enforceNoNesting = (nodes, insideLink) => {
        const out = [];
        for (const n of nodes) {
            switch (n.type) {
                case 'link': {
                    const children = enforceNoNesting(n.children, true);
                    if (insideLink) {
                        // Non-spread push: `children` may be unbounded (a large link label),
                        // and `push(...children)` would overflow V8's call-stack argument
                        // limit (~65k) on adversarial input.
                        for (const c of children)
                            out.push(c);
                    }
                    else {
                        n.children = children;
                        out.push(n);
                    }
                    break;
                }
                case 'autolink':
                    if (insideLink) {
                        const value = n.href.startsWith('mailto:')
                            ? n.href.slice('mailto:'.length)
                            : n.href;
                        out.push({ type: 'text', value });
                    }
                    else {
                        out.push(n);
                    }
                    break;
                case 'footnote':
                    if (n.inline)
                        n.inline = enforceNoNesting(n.inline, false);
                    out.push(n);
                    break;
                case 'italic':
                case 'strong':
                case 'underline':
                case 'strike':
                case 'super':
                case 'sub':
                case 'highlight':
                case 'bold-italic':
                case 'span':
                case 'critic-insert':
                case 'critic-delete':
                    n.children = enforceNoNesting(n.children, insideLink);
                    out.push(n);
                    break;
                case 'extension':
                    n.content = enforceNoNesting(n.content, insideLink);
                    out.push(n);
                    break;
                default:
                    out.push(n);
                    break;
            }
        }
        return out;
    };
    const applyNoNesting = (xs) => {
        // In-place rewrite WITHOUT spread: `enforceNoNesting` can return a very
        // large array (e.g. a paragraph with ~65k inline nodes). Spreading it into
        // `splice(0, len, ...arr)` overflows V8's call-stack argument limit and
        // throws RangeError, crashing every public API (resolveHeadingIds runs
        // unconditionally). Mutate length + push instead.
        const next = enforceNoNesting(xs, false);
        xs.length = 0;
        for (const n of next)
            xs.push(n);
    };
    for (const block of doc.children)
        walkBlock(block, applyNoNesting);
    for (const body of footnoteBodies)
        for (const b of body)
            walkBlock(b, applyNoNesting);
    return doc;
}
//# sourceMappingURL=heading-ids.js.map