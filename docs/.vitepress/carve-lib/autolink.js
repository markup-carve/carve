const EMAIL = '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';
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
    const urlRe = urlSchemes.length
        ? new RegExp('^(?:' + urlSchemes.join('|') + ')://[^\\s<>\\[\\](){}]*[^\\s<>\\[\\](){}.,;:!?\'"]')
        : null;
    const mailtoRe = mailto ? new RegExp('^mailto:' + EMAIL) : null;
    const emailRe = mailto ? new RegExp('^' + EMAIL) : null;
    return {
        name: 'autolink',
        matchInline(text, pos) {
            const rest = text.slice(pos);
            const url = urlRe?.exec(rest);
            if (url) {
                return { node: linkNode(url[0], url[0]), end: pos + url[0].length };
            }
            const mt = mailtoRe?.exec(rest);
            if (mt) {
                // Display without the mailto: prefix, like carve-php.
                return { node: linkNode(mt[0], mt[0].slice('mailto:'.length)), end: pos + mt[0].length };
            }
            const em = emailRe?.exec(rest);
            if (em) {
                return { node: linkNode('mailto:' + em[0], em[0]), end: pos + em[0].length };
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