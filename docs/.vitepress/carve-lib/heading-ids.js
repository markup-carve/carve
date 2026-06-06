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
 * jgm/djot#393 slug step: replace each maximal run of non-alphanumeric ASCII with a
 * single '-' and trim. Non-ASCII characters and letter case are preserved.
 */
function slugRun(s) {
    return s.replace(/[^0-9A-Za-z\u{80}-\u{10FFFF}]+/gu, '-').replace(/^-+|-+$/gu, '');
}
/**
 * The automatic-identifier rule. Pure, context-free, no dedup.
 *
 * Uses the jgm/djot#393 run-replacement, then **lowercases** (GitHub/SSG style):
 * non-ASCII characters are preserved (only their case is folded). Lowercasing makes
 * ids and cross-references case-insensitive without special lookup logic. With
 * `asciiFold` (opt-in via `asciiHeadingIds`) the slug is transliterated to ASCII and
 * re-slugged.
 */
export function slugify(plainText, asciiFold = false) {
    // NFC first so a decomposed `résumé` (macOS copy-paste,
    // some editors) slugs identically to its precomposed `résumé` form.
    // Without this, the map would only catch precomposed letters and
    // NFD inputs would emit different ids for visually identical text.
    let s = slugRun(plainText.normalize('NFC'));
    if (asciiFold) {
        s = slugRun(transliterate(s));
    }
    // Lowercase (Unicode-aware): GitHub-style anchors, inherently case-insensitive.
    s = s.toLowerCase();
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
export function resolveHeadingIds(doc, asciiFold = false) {
    const used = new Set();
    const targets = new Map();
    // Implicit-reference index: normalized visible heading text -> heading id.
    // First-occurrence wins (matches `</#id>` ambiguous-ref behavior). Built
    // from the parsed AST's inlineText so it agrees with the heading slug
    // exactly — no regex pre-pass guesswork.
    const headingRefs = new Map();
    for (const block of doc.children) {
        if (block.type !== 'heading')
            continue;
        let id;
        if (block.attrs?.id) {
            id = block.attrs.id;
            used.add(id);
        }
        else {
            const base = slugify(inlineText(block.children), asciiFold);
            if (!used.has(base)) {
                id = base;
            }
            else {
                let n = 2;
                while (used.has(`${base}-${n}`))
                    n++;
                id = `${base}-${n}`;
            }
            used.add(id);
            block.attrs = { ...block.attrs, id };
        }
        if (!targets.has(id))
            targets.set(id, block.children);
        const plain = inlineText(block.children);
        const key = normalizeHeadingRefLabel(plain);
        if (key && !headingRefs.has(key))
            headingRefs.set(key, id);
    }
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
                default:
                    break;
            }
        }
    };
    /** Pass 2: resolve `</#id>` crossrefs, cloning finalized children. */
    const resolveCrossrefs = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (n.type === 'crossref') {
                const tgt = targets.get(n.target);
                if (tgt) {
                    const link = {
                        type: 'link',
                        href: `#${n.target}`,
                        // structuredClone would need DOM/Node lib typings absent from this
                        // tsconfig; InlineNode is plain JSON-serializable data so a
                        // stringify/parse round-trip is a safe deep clone here.
                        children: JSON.parse(JSON.stringify(tgt)),
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
    const footnoteBodies = doc.footnoteDefs ? Object.values(doc.footnoteDefs) : [];
    for (const block of doc.children)
        walkBlock(block, resolveRefs);
    for (const body of footnoteBodies)
        for (const b of body)
            walkBlock(b, resolveRefs);
    for (const block of doc.children)
        walkBlock(block, resolveCrossrefs);
    for (const body of footnoteBodies)
        for (const b of body)
            walkBlock(b, resolveCrossrefs);
    return doc;
}
//# sourceMappingURL=heading-ids.js.map