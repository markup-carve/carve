import { inlineText } from './heading-ids.js';
// `:::: tabs` parses to an Admonition with kind `tabs`; a bare `{.tabs}\n::::`
// parses to a Div carrying the class. Likewise each `::: tab` child is an
// Admonition kind `tab` or a Div with class `tab`. Detect both for parity with
// carve-php's class-based matching.
function isTabs(node) {
    if (node.type === 'admonition')
        return node.kind === 'tabs';
    if (node.type === 'div')
        return (node.attrs?.classes ?? []).includes('tabs');
    return false;
}
function isTab(node) {
    if (node.type === 'admonition')
        return node.kind === 'tab';
    if (node.type === 'div')
        return (node.attrs?.classes ?? []).includes('tab');
    return false;
}
function extraClasses(node, structural) {
    return (node.attrs?.classes ?? []).filter((c) => c !== structural);
}
export function tabs(opts = {}) {
    const mode = opts.mode === 'aria' ? 'aria' : 'css';
    const wrapperClass = opts.wrapperClass ?? 'tabs';
    const tabClass = opts.tabClass ?? 'tabs-panel';
    const labelClass = opts.labelClass ?? 'tabs-label';
    const radioClass = opts.radioClass ?? 'tabs-radio';
    const idPrefix = opts.idPrefix ?? 'tabset';
    // Per-document counters, reset in beforeRender (matches carve-php clear()).
    let tabSetCounter = 0;
    let labelCounter = 0;
    // An explicit label is the opener `[label]` (canonical) or a `{label="..."}`
    // attribute (deprecated). When present, an inner heading stays as content.
    const explicitLabel = (tab) => tab.label ?? tab.attrs?.keyValues?.label;
    const extractLabel = (tab) => {
        const label = explicitLabel(tab);
        if (label !== undefined)
            return label;
        for (const child of tab.children) {
            if (child.type === 'heading')
                return inlineText(child.children);
        }
        return `Tab ${++labelCounter}`;
    };
    const renderTabContent = (tab, ctx) => {
        const skipFirstHeading = explicitLabel(tab) === undefined;
        let skipped = false;
        let html = '';
        for (const child of tab.children) {
            if (skipFirstHeading && !skipped && child.type === 'heading') {
                skipped = true;
                continue;
            }
            // Render each child as a top-level fragment (level 0) and end with a
            // newline, matching carve-php's renderNodeFragment concatenation.
            const fragment = ctx.renderChildren([child], 0);
            if (fragment !== '')
                html += `${fragment}\n`;
        }
        return html;
    };
    const collectTabs = (wrapper, ctx) => {
        const items = [];
        for (const child of wrapper.children) {
            if (!isTab(child))
                continue;
            const tab = child;
            items.push({
                label: extractLabel(tab),
                content: renderTabContent(tab, ctx),
                selected: tab.attrs?.keyValues?.selected !== undefined,
                id: tab.attrs?.id,
            });
        }
        if (items.length && !items.some((i) => i.selected))
            items[0].selected = true;
        return items;
    };
    const buildWrapperAttributes = (wrapper, ctx, role) => {
        const classes = [
            wrapperClass,
            ...extraClasses(wrapper, 'tabs').filter((c) => c !== wrapperClass),
        ];
        const attrs = { classes };
        const id = wrapper.attrs?.id;
        if (id !== undefined)
            attrs.id = id;
        if (wrapper.attrs?.keyValues || role) {
            attrs.keyValues = { ...(wrapper.attrs?.keyValues ?? {}) };
            if (role)
                attrs.keyValues.role = role;
        }
        const authorOrder = (wrapper.attrs?.order ?? []).filter((s) => s !== '.class');
        attrs.order = [
            '.class',
            ...(role ? ['role'] : []),
            ...authorOrder.filter((s) => s !== 'role'),
        ];
        return ctx.renderAttrs(attrs);
    };
    const renderCss = (wrapper, items, ctx) => {
        tabSetCounter++;
        const setId = `${idPrefix}-${tabSetCounter}`;
        const pad = ctx.indent(ctx.level);
        let html = `${pad}<div${buildWrapperAttributes(wrapper, ctx)}>\n`;
        items.forEach((tab, index) => {
            const inputId = tab.id ?? `${setId}-tab-${index + 1}`;
            const checked = tab.selected ? ' checked' : '';
            html +=
                `<input type="radio" name="${ctx.escapeAttr(setId)}" ` +
                    `id="${ctx.escapeAttr(inputId)}"` +
                    ` class="${ctx.escapeAttr(radioClass)}"${checked}>\n`;
            html +=
                `<label for="${ctx.escapeAttr(inputId)}" ` +
                    `class="${ctx.escapeAttr(labelClass)}">${ctx.escapeHtml(tab.label)}</label>\n`;
        });
        for (const tab of items) {
            html += `<div class="${ctx.escapeAttr(tabClass)}">\n${tab.content}</div>\n`;
        }
        html += `${pad}</div>`;
        return html;
    };
    const renderAria = (wrapper, items, ctx) => {
        tabSetCounter++;
        const setId = `${idPrefix}-${tabSetCounter}`;
        const pad = ctx.indent(ctx.level);
        let html = `${pad}<div${buildWrapperAttributes(wrapper, ctx, 'tablist')}>\n`;
        items.forEach((tab, index) => {
            const num = index + 1;
            const tabId = tab.id ? `${ctx.escapeAttr(tab.id)}-tab` : `${setId}-tab-${num}`;
            const panelId = tab.id ? `${ctx.escapeAttr(tab.id)}-panel` : `${setId}-panel-${num}`;
            const selected = tab.selected ? 'true' : 'false';
            const tabindex = tab.selected ? '' : ' tabindex="-1"';
            html +=
                `<button role="tab" id="${tabId}" ` +
                    `aria-selected="${selected}" ` +
                    `aria-controls="${panelId}" ` +
                    `class="${ctx.escapeAttr(labelClass)}"${tabindex}>${ctx.escapeHtml(tab.label)}</button>\n`;
        });
        items.forEach((tab, index) => {
            const num = index + 1;
            const tabId = tab.id ? `${ctx.escapeAttr(tab.id)}-tab` : `${setId}-tab-${num}`;
            const panelId = tab.id ? `${ctx.escapeAttr(tab.id)}-panel` : `${setId}-panel-${num}`;
            const hidden = tab.selected ? '' : ' hidden';
            html +=
                `<div role="tabpanel" id="${panelId}" ` +
                    `aria-labelledby="${tabId}" ` +
                    `class="${ctx.escapeAttr(tabClass)}"${hidden}>\n${tab.content}</div>\n`;
        });
        html += `${pad}</div>`;
        return html;
    };
    const renderTabs = (node, ctx) => {
        const items = collectTabs(node, ctx);
        // No tab children: defer to core div rendering (matches carve-php).
        if (items.length === 0)
            return undefined;
        return mode === 'aria' ? renderAria(node, items, ctx) : renderCss(node, items, ctx);
    };
    // Static (non-interactive) render: every panel is shown in sequence as a
    // `<section>` headed by its `[label]` (graceful-degradation rule). No radios,
    // no JS - the labels survive as visible headings so a reader of the PDF / the
    // archival page can tell the panels apart.
    const renderTabsStatic = (node, ctx) => {
        const items = collectTabs(node, ctx);
        if (items.length === 0)
            return undefined;
        const pad = ctx.indent(ctx.level);
        const innerPad = ctx.indent(ctx.level + 1);
        let html = `${pad}<div${buildWrapperAttributes(node, ctx)}>\n`;
        for (const tab of items) {
            html += `${innerPad}<section class="${ctx.escapeAttr(tabClass)}">\n`;
            html += `${innerPad}<h3 class="${ctx.escapeAttr(labelClass)}">${ctx.escapeHtml(tab.label)}</h3>\n`;
            html += tab.content;
            html += `${innerPad}</section>\n`;
        }
        html += `${pad}</div>`;
        return html;
    };
    return {
        name: 'tabs',
        beforeRender(doc) {
            tabSetCounter = 0;
            labelCounter = 0;
            return doc;
        },
        blockRenderers: {
            admonition: (node, ctx) => (isTabs(node) ? renderTabs(node, ctx) : undefined),
            div: (node, ctx) => (isTabs(node) ? renderTabs(node, ctx) : undefined),
        },
        staticBlockRenderers: {
            admonition: (node, ctx) => isTabs(node) ? renderTabsStatic(node, ctx) : undefined,
            div: (node, ctx) => (isTabs(node) ? renderTabsStatic(node, ctx) : undefined),
        },
    };
}
//# sourceMappingURL=tabs.js.map