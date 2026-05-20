/*
 * Heading identifier generation + cross-reference resolution.
 *
 * Behavior is fixed by markup-carve/carve PR #1 ("Automatic Identifiers")
 * plus the ASCII-safety transliteration step ported from djot-php #183
 * (so a heading id survives being shared as a URL fragment through
 * auto-linkers, which routinely truncate or mis-encode non-ASCII).
 * slugify is pure and context-free; dedup lives in resolveHeadingIds.
 */
import { TRANSLIT_MAP } from './translit-map.js';
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
/** The automatic-identifier rule. Pure, context-free, no dedup. */
export function slugify(plainText) {
    // NFC first so a decomposed `résumé` (macOS copy-paste,
    // some editors) slugs identically to its precomposed `résumé` form.
    // Without this, the map would only catch precomposed letters and
    // NFD inputs would emit different ids for visually identical text.
    let s = plainText.normalize('NFC');
    s = transliterate(s);
    s = s.toLowerCase();
    s = s.trim();
    s = s.replace(/['";:]/gu, '');
    s = s.replace(/[^\p{L}\p{N}_-]+/gu, '-');
    s = s.replace(/-{2,}/gu, '-');
    s = s.replace(/^-+|-+$/gu, '');
    if (/^\p{N}/u.test(s))
        s = `section-${s}`;
    if (s === '')
        s = 'section';
    return s;
}
/** Visible plain text of an inline run (markup stripped). */
export function inlineText(nodes) {
    let out = '';
    for (const n of nodes) {
        switch (n.type) {
            case 'text':
            case 'code':
                out += n.value;
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
            case 'critic-insert':
            case 'critic-delete':
            case 'critic-highlight':
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
export function resolveHeadingIds(doc) {
    const used = new Set();
    const targets = new Map();
    for (const block of doc.children) {
        if (block.type !== 'heading')
            continue;
        let id;
        if (block.attrs?.id) {
            id = block.attrs.id;
            used.add(id);
        }
        else {
            const base = slugify(inlineText(block.children));
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
    }
    const resolveList = (nodes) => {
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
                case 'critic-insert':
                case 'critic-delete':
                case 'critic-highlight':
                    resolveList(n.children);
                    break;
                case 'extension':
                    resolveList(n.content);
                    break;
                default:
                    break;
            }
        }
    };
    const walkBlock = (b) => {
        switch (b.type) {
            case 'heading':
            case 'paragraph':
                resolveList(b.children);
                break;
            case 'blockquote':
                if (b.attribution)
                    resolveList(b.attribution);
                b.children.forEach(walkBlock);
                break;
            case 'list':
                for (const item of b.items)
                    item.children.forEach(walkBlock);
                break;
            case 'admonition':
                if (b.title)
                    resolveList(b.title);
                b.children.forEach(walkBlock);
                break;
            case 'table':
                if (b.caption)
                    resolveList(b.caption);
                for (const row of b.rows)
                    for (const cell of row.cells)
                        resolveList(cell.children);
                break;
            case 'figure':
                resolveList(b.caption);
                if (b.target.type === 'blockquote' || b.target.type === 'table')
                    walkBlock(b.target);
                break;
            default:
                break;
        }
    };
    for (const block of doc.children)
        walkBlock(block);
    return doc;
}
//# sourceMappingURL=heading-ids.js.map