// Email: local-part `@` domain. Two changes vs the old
// `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`, both to kill the O(n^2)
// scan that the per-position matcher loop produced on inputs like `x@(a.)*z`:
//
//  1. The quantifiers are length-bounded to the RFC limits (local part <= 64
//     octets per RFC 5321; DNS labels <= 63, RFC 1035). Without a bound, the
//     local-part class - which includes `.` - greedily consumes a long dotted
//     run at EVERY scan position, giving O(remaining) work per position. The
//     bound makes each attempt O(1), so the whole scan is linear.
//  2. The domain is explicit dot-separated labels ending in an alpha TLD, so
//     the `.` boundaries are unambiguous and cannot backtrack across labels.
//
// Real-world addresses stay within these RFC limits, so valid emails still
// autolink identically.
const EMAIL = '[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\\.)+[a-zA-Z]{2,63}';
/**
 * Linkify bare URLs and email addresses, ported from carve-php's
 * AutolinkExtension. Carve core leaves bare URLs literal (the Tier-1 default),
 * and angle autolinks `<url>` are already core; this Tier-2 extension opts into
 * linkifying plain `https://…`, `mailto:…`, and bare `a@b.com` text.
 *
 * ```ts
 * carveToHtml('Visit https://example.com today.', { extensions: [autolink()] })
 * // <p>Visit <a href="https://example.com">https://example.com</a> today.</p>
 * ```
 *
 * A trailing sentence punctuation mark is left outside the link, matching
 * carve-php.
 */
export function autolink(opts = {}) {
    const schemes = opts.allowedSchemes ?? ['https', 'http', 'mailto'];
    const urlSchemes = schemes.filter((s) => s !== 'mailto').map(escapeRe);
    const mailto = schemes.includes('mailto');
    // Scheme URL: stop before trailing whitespace, brackets, and sentence
    // punctuation, so `https://x.com.` links `https://x.com` (matches php).
    // Stop before whitespace, brackets, braces, and trailing sentence
    // punctuation. Excluding `{}` leaves a trailing inline-attribute block
    // (`https://x.com{.external}`) for the core attribute pass, like angle autolinks.
    // Sticky (`y`) regexes anchored at the scan position via `lastIndex`, so the
    // match starts exactly at `pos` without a per-position `text.slice(pos)`
    // (the old slice made the whole inline scan O(n^2) on adversarial input).
    const urlRe = urlSchemes.length
        ? new RegExp('(?:' + urlSchemes.join('|') + ')://[^\\s<>\\[\\](){}]*[^\\s<>\\[\\](){}.,;:!?\'"]', 'y')
        : null;
    const mailtoRe = mailto ? new RegExp('mailto:' + EMAIL, 'y') : null;
    const emailRe = mailto ? new RegExp(EMAIL, 'y') : null;
    const at = (re, text, pos) => {
        re.lastIndex = pos;
        const m = re.exec(text);
        return m ? m[0] : null;
    };
    return {
        name: 'autolink',
        matchInline(text, pos) {
            const url = urlRe && at(urlRe, text, pos);
            if (url) {
                return { node: linkNode(url, url), end: pos + url.length };
            }
            const mt = mailtoRe && at(mailtoRe, text, pos);
            if (mt) {
                // Display without the mailto: prefix, like carve-php.
                return { node: linkNode(mt, mt.slice('mailto:'.length)), end: pos + mt.length };
            }
            const em = emailRe && at(emailRe, text, pos);
            if (em) {
                return { node: linkNode('mailto:' + em, em), end: pos + em.length };
            }
            return null;
        },
    };
}
function linkNode(href, text) {
    return { type: 'link', href, children: [{ type: 'text', value: text }] };
}
function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=autolink.js.map