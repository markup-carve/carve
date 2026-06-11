// Default URL generator: a URL-safe slug, matching carve-php's WikilinksExtension.
function defaultSlug(page) {
    return page
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-_/]/g, '')
        .replace(/-+/g, '-');
}
/**
 * Parse `[[wikilinks]]` into navigational links, like Obsidian / MediaWiki.
 *
 * Forms: `[[Page]]`, `[[page|Display]]`, `[[page#anchor]]`, `[[folder/page]]`.
 * Uses the parse-stage inline matcher contract — core leaves `[[…]]` literal,
 * so this adds the syntax without hijacking any core construct.
 *
 * ```ts
 * carveToHtml('See [[Tigers]].', { extensions: [wikilinks()] })
 * // <p>See <a href="tigers" class="wikilink" data-wikilink="Tigers">Tigers</a>.</p>
 * ```
 */
export function wikilinks(opts = {}) {
    const cssClass = opts.cssClass ?? 'wikilink';
    const urlGenerator = opts.urlGenerator ?? defaultSlug;
    return {
        name: 'wikilinks',
        matchInline(text, pos) {
            if (text[pos] !== '[' || text[pos + 1] !== '[')
                return null;
            const close = text.indexOf(']]', pos + 2);
            if (close < 0)
                return null;
            const body = text.slice(pos + 2, close);
            // Page part forbids `|` and `]` (matches the carve-php pattern); the
            // optional display part is everything after the first `|`.
            const bar = body.indexOf('|');
            const rawPage = bar >= 0 ? body.slice(0, bar) : body;
            if (rawPage.includes(']'))
                return null;
            let display = bar >= 0 ? body.slice(bar + 1).trim() : null;
            let page = rawPage.trim();
            let anchor = '';
            const hash = page.indexOf('#');
            if (hash >= 0) {
                anchor = '#' + page.slice(hash + 1);
                page = page.slice(0, hash);
            }
            // A wikilink needs a real target: empty or whitespace-only `[[ ]]`
            // stays literal (an anchor-only `[[#sec]]` is still a link).
            if (page === '' && anchor === '')
                return null;
            const href = urlGenerator(page) + anchor;
            if (display === null)
                display = page || anchor;
            const classes = cssClass.split(' ').filter((c) => c !== '');
            const keyValues = { 'data-wikilink': page };
            if (opts.newWindow) {
                keyValues.target = '_blank';
                keyValues.rel = 'noopener';
            }
            const attrs = { classes, keyValues };
            return {
                node: { type: 'link', href, attrs, children: [{ type: 'text', value: display }] },
                end: close + 2,
            };
        },
    };
}
//# sourceMappingURL=wikilinks.js.map