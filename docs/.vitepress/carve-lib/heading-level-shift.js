/** Recursively shift every heading level in a block subtree. */
function shiftBlock(node, shift) {
    switch (node.type) {
        case 'heading':
            // Cap at h6 (matches carve-php's Heading::setLevel clamp).
            node.level = Math.min(6, node.level + shift);
            break;
        case 'blockquote':
        case 'div':
        case 'admonition':
            node.children.forEach((c) => shiftBlock(c, shift));
            break;
        case 'list':
            for (const it of node.items)
                it.children.forEach((c) => shiftBlock(c, shift));
            break;
        case 'definition-list':
            for (const it of node.items)
                for (const d of it.definitions)
                    for (const b of d)
                        shiftBlock(b, shift);
            break;
        case 'figure':
            if (node.target.type === 'blockquote')
                shiftBlock(node.target, shift);
            break;
        default:
            break;
    }
}
/**
 * Shift every heading level down by a fixed offset, ported from carve-php's
 * HeadingLevelShiftExtension. Useful when h1 is reserved for the page title
 * and document headings should start at h2 or lower.
 *
 * A `beforeRender` transform: h1 -> h1+shift, capped at h6. Levels are
 * clamped to the range 0-5; the `<section>` id and other heading attributes
 * are preserved (only the level number changes).
 *
 * ```ts
 * carveToHtml('# Title', { extensions: [headingLevelShift({ shift: 1 })] })
 * // <section id="title"><h2>Title</h2></section>
 * ```
 */
export function headingLevelShift(opts = {}) {
    const shift = Math.max(0, Math.min(opts.shift ?? 1, 5));
    return {
        name: 'heading-level-shift',
        beforeRender(doc) {
            if (shift === 0)
                return doc;
            doc.children.forEach((c) => shiftBlock(c, shift));
            return doc;
        },
    };
}
//# sourceMappingURL=heading-level-shift.js.map