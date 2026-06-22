// `::: code-group` parses to an Admonition with kind `code-group` (typed div),
// while a bare `{.code-group}\n:::` parses to a Div carrying the class. Detect
// both so the extension matches carve-php's class-based behavior.
function isCodeGroup(node) {
    if (node.type === 'admonition')
        return node.kind === 'code-group';
    if (node.type === 'div')
        return (node.attrs?.classes ?? []).includes('code-group');
    return false;
}
function extraClasses(node) {
    // Admonition: kind is the structural class; other classes come from attrs.
    // Div: the structural class is 'code-group'; keep the rest in order.
    const classes = node.attrs?.classes ?? [];
    return classes.filter((c) => c !== 'code-group');
}
function extractItems(node) {
    const items = [];
    let position = 0;
    for (const child of node.children) {
        if (child.type !== 'code-block')
            continue;
        position++;
        const cb = child;
        const language = cb.lang && cb.lang !== '' ? cb.lang : undefined;
        const labelText = cb.label?.trim();
        const label = labelText && labelText !== '' ? labelText : (language ?? `Code ${position}`);
        const selected = cb.attrs?.keyValues?.selected !== undefined;
        items.push({ block: cb, language, label, selected });
    }
    if (items.length && !items.some((i) => i.selected))
        items[0].selected = true;
    return items;
}
/** Strip the internal `selected` attribute before rendering the code block. */
function withoutSelected(attrs) {
    if (!attrs?.keyValues || attrs.keyValues.selected === undefined)
        return attrs;
    const kv = { ...attrs.keyValues };
    delete kv.selected;
    const out = { ...attrs, keyValues: kv };
    if (attrs.order)
        out.order = attrs.order.filter((s) => s !== 'selected');
    return out;
}
export function codeGroup(opts = {}) {
    const wrapperClass = opts.wrapperClass ?? 'code-group';
    const panelClass = opts.panelClass ?? 'code-group-panel';
    const labelClass = opts.labelClass ?? 'code-group-label';
    const radioClass = opts.radioClass ?? 'code-group-radio';
    const idPrefix = opts.idPrefix ?? 'codegroup';
    const highlighter = opts.highlighter;
    // Per-render group counter. Reset at the start of each document render via a
    // beforeRender hook so ids are deterministic and reset between conversions
    // (matching carve-php's clear()).
    let groupCounter = 0;
    const renderGroup = (node, ctx) => {
        const items = extractItems(node);
        // No code blocks: defer to core div rendering (matches carve-php).
        if (items.length === 0)
            return undefined;
        groupCounter++;
        const groupId = `${idPrefix}-${groupCounter}`;
        const pad = ctx.indent(ctx.level);
        // Wrapper attributes: wrapperClass first, then any extra classes the author
        // added (except 'code-group'), then non-class attributes.
        const classes = [wrapperClass, ...extraClasses(node).filter((c) => c !== wrapperClass)];
        const attrs = { classes };
        if (node.attrs?.id !== undefined)
            attrs.id = node.attrs.id;
        if (node.attrs?.keyValues)
            attrs.keyValues = { ...node.attrs.keyValues };
        attrs.order = ['.class', ...(node.attrs?.order ?? []).filter((s) => s !== '.class')];
        let html = `${pad}<div${ctx.renderAttrs(attrs)}>\n`;
        items.forEach((item, index) => {
            const inputId = `${groupId}-tab-${index + 1}`;
            const checked = item.selected ? ' checked' : '';
            html +=
                `<input type="radio" name="${ctx.escapeAttr(groupId)}" ` +
                    `id="${ctx.escapeAttr(inputId)}" ` +
                    `class="${ctx.escapeAttr(radioClass)}"${checked}>\n`;
            html +=
                `<label for="${ctx.escapeAttr(inputId)}" ` +
                    `class="${ctx.escapeAttr(labelClass)}">${ctx.escapeHtml(item.label)}</label>\n`;
        });
        for (const item of items) {
            html += `<div class="${ctx.escapeAttr(panelClass)}">`;
            html += renderCodeBlock(item, ctx);
            html += '</div>\n';
        }
        html += `${pad}</div>`;
        return html;
    };
    const renderCodeBlock = (item, ctx) => {
        const content = item.block.content.replace(/\n+$/, '');
        if (highlighter)
            return highlighter(content, item.language);
        const langAttr = item.language ? ` class="language-${item.language}"` : '';
        const escaped = ctx.escapeHtml(item.block.content);
        return `<pre${ctx.renderAttrs(withoutSelected(item.block.attrs))}><code${langAttr}>${escaped}\n</code></pre>\n`;
    };
    return {
        name: 'code-group',
        beforeRender(doc) {
            groupCounter = 0;
            return doc;
        },
        blockRenderers: {
            admonition: (node, ctx) => isCodeGroup(node) ? renderGroup(node, ctx) : undefined,
            div: (node, ctx) => (isCodeGroup(node) ? renderGroup(node, ctx) : undefined),
        },
    };
}
//# sourceMappingURL=code-group.js.map