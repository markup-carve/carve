/**
 * Normalize tabs to spaces in code content on output.
 *
 * Carve preserves literal tabs in code blocks and inline code by default
 * (djot/CommonMark-aligned; tab display is a CSS `tab-size` concern). Add this
 * extension to expand each tab to a fixed number of spaces before rendering --
 * useful for fixed-width output without CSS (email, RSS, plain HTML).
 *
 * Flat replacement: every tab becomes exactly `width` spaces (no elastic tab
 * stops). Only code CONTENT is touched -- fenced code blocks and inline code
 * spans -- never prose, attributes, or structure. Default width is 2 (matching
 * djot's 2-space convention).
 *
 * @example
 * carveToHtml(src, { extensions: [tabNormalize()] })       // 2 spaces
 * carveToHtml(src, { extensions: [tabNormalize(4)] })      // 4 spaces
 */
export function tabNormalize(width = 2) {
    const spaces = ' '.repeat(Math.max(0, width));
    const expand = (s) => s.replace(/\t/g, spaces);
    const visit = (node) => {
        if (Array.isArray(node)) {
            for (const child of node)
                visit(child);
            return;
        }
        if (node === null || typeof node !== 'object')
            return;
        const n = node;
        // Only code CONTENT carries expandable tabs.
        if (n.type === 'code-block' && typeof n.content === 'string') {
            n.content = expand(n.content);
        }
        else if (n.type === 'code' && typeof n.value === 'string') {
            n.value = expand(n.value);
        }
        // Recurse into every child container (children/items/rows/cells/...).
        for (const key in n) {
            if (key === 'pos' || key === 'attrs')
                continue;
            visit(n[key]);
        }
    };
    return {
        name: 'tab-normalize',
        beforeRender(doc) {
            visit(doc);
            return doc;
        },
    };
}
//# sourceMappingURL=tab-normalize.js.map