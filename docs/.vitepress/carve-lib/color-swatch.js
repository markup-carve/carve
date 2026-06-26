const POSITIONS = ['before', 'after', 'none'];
const SHAPES = ['square', 'round', 'ring'];
export function colorSwatch(options = {}) {
    const position = options.position ?? 'before';
    const shape = options.shape ?? 'square';
    const tint = options.tint ?? false;
    const reveal = options.reveal ?? false;
    if (!POSITIONS.includes(position)) {
        throw new Error(`Invalid ColorSwatch position "${position}"; expected one of: ${POSITIONS.join(', ')}.`);
    }
    if (!SHAPES.includes(shape)) {
        throw new Error(`Invalid ColorSwatch shape "${shape}"; expected one of: ${SHAPES.join(', ')}.`);
    }
    return {
        name: 'color',
        renderers: {
            color: (node, ctx) => {
                const value = safeColor(inlineText(node.content));
                const contrast = hasKeyValue(node.attrs, 'contrast');
                const attrs = contrast ? stripKeyValue(node.attrs, 'contrast') : node.attrs;
                if (value === null) {
                    return contrast ? renderGenericColor(node, attrs, ctx) : undefined;
                }
                const text = contrastText(value);
                if (contrast && text !== null)
                    return renderContrastLabel(attrs, ctx, value, text);
                return renderSwatch(attrs, ctx, value, position, shape, tint, reveal);
            },
        },
    };
}
function renderContrastLabel(nodeAttrs, ctx, value, text) {
    const attrs = withBaseClass(nodeAttrs, 'swatch-label');
    // The computed colors go last so author attributes keep their source order; an
    // explicit author `style` wins and suppresses ours (which also avoids emitting
    // a duplicate `style` attribute).
    const style = hasKeyValue(nodeAttrs, 'style')
        ? ''
        : ` style="${ctx.escapeAttr(`background:${value};color:${text}`)}"`;
    return `<span${ctx.renderAttrs(attrs)}${style}>${ctx.escapeHtml(value)}</span>`;
}
function renderGenericColor(node, attrs, ctx) {
    return `<span${ctx.renderAttrs(withBaseClass(attrs, `ext-${node.name}`))}>${ctx.renderInlines(node.content)}</span>`;
}
function renderSwatch(nodeAttrs, ctx, value, position, shape, tint, reveal) {
    const label = ctx.escapeHtml(value);
    // A ring shows the color as the border; filled shapes as the background.
    const chipClass = shape === 'square' ? 'swatch-chip' : `swatch-chip swatch-chip-${shape}`;
    const chipStyle = shape === 'ring' ? `border-color:${value}` : `background-color:${value}`;
    const chip = `<span class="${chipClass}" style="${ctx.escapeAttr(chipStyle)}"></span>`;
    let attrs = withBaseClass(nodeAttrs, 'swatch');
    if (tint) {
        attrs = addClass(attrs, 'swatch-tint');
        attrs = withDefaultKeyValue(attrs, 'style', `background-color:color-mix(in srgb, ${value} 12%, transparent)`);
    }
    let inner;
    if (position === 'none') {
        // Chip only: the value is not shown inline, so surface it as the element
        // title so it stays available on hover and to assistive technology.
        // `reveal` is meaningless here (there is no inline value) and ignored.
        attrs = addClass(attrs, 'swatch-chip-only');
        attrs = withDefaultKeyValue(attrs, 'title', value);
        inner = chip;
    }
    else {
        // When revealing, wrap the value so CSS can collapse / expand it, make the
        // swatch keyboard-focusable, and keep the value in the DOM for AT.
        let valueHtml = label;
        if (reveal) {
            attrs = addClass(attrs, 'swatch-reveal');
            attrs = withDefaultKeyValue(attrs, 'tabindex', '0');
            valueHtml = `<span class="swatch-val">${label}</span>`;
        }
        inner = position === 'after' ? `${valueHtml} ${chip}` : `${chip} ${valueHtml}`;
    }
    return `<span${ctx.renderAttrs(attrs)}>${inner}</span>`;
}
/**
 * The CSS named colors (plus `transparent` / `currentcolor`). A bare keyword is
 * only treated as a color when it is one of these; arbitrary words like
 * `banana` defer to the generic fallback (parity with carve-php / carve-rs).
 */
const NAMED_COLORS = new Set(('transparent currentcolor aliceblue antiquewhite aqua aquamarine azure beige bisque black ' +
    'blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral ' +
    'cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen ' +
    'darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon ' +
    'darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink ' +
    'deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ' +
    'ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory ' +
    'khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen ' +
    'seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan ' +
    'teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));
function safeColor(s) {
    const value = s.trim();
    if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
        return value;
    }
    // rgb()/hsl(): only safe chars inside, and at least one digit (rejects
    // `rgb(/)` / empty args). Author never escapes; the value cannot break out.
    if (/^(rgb|rgba|hsl|hsla)\([0-9.,%\s/]*[0-9][0-9.,%\s/]*\)$/.test(value)) {
        return value;
    }
    // A bare keyword is a color only when it is an actual CSS named color (or
    // `transparent` / `currentcolor`); arbitrary words are not.
    if (/^[a-zA-Z]+$/.test(value) && NAMED_COLORS.has(value.toLowerCase())) {
        return value;
    }
    return null;
}
function contrastText(value) {
    // A fully transparent color paints no background, so a computed text color
    // would sit on the page itself and could be unreadable. Decline the contrast
    // label (fall back to the normal swatch) instead of guessing.
    if (isFullyTransparentHex(value))
        return null;
    const rgb = parseIntegerRgb(value);
    if (rgb === null)
        return null;
    const brightness = Math.floor((rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000);
    return brightness >= 128 ? '#000' : '#fff';
}
/** True for hex colors whose alpha channel is fully zero (e.g. `#0000`, `#00000000`). */
function isFullyTransparentHex(value) {
    const hex = /^#([0-9a-fA-F]{4}|[0-9a-fA-F]{8})$/.exec(value);
    if (!hex)
        return false;
    const alpha = hex[1].length === 4 ? hex[1][3] : hex[1].slice(6, 8);
    return /^0+$/.test(alpha);
}
function parseIntegerRgb(value) {
    const hex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(value);
    if (hex) {
        const h = hex[1];
        if (h.length === 3 || h.length === 4) {
            return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
        }
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const rgb = /^rgba?\((.*)\)$/.exec(value);
    if (!rgb)
        return null;
    const tokens = rgb[1].trim().split(/[\s,/]+/).filter(Boolean);
    if (tokens.length < 3)
        return null;
    const channels = tokens.slice(0, 3);
    if (!channels.every((t) => /^[+-]?\d+$/.test(t)))
        return null;
    return channels.map((t) => clampByte(Number.parseInt(t, 10)));
}
function clampByte(n) {
    return Math.min(255, Math.max(0, n));
}
/** Merge a base class ahead of the author classes (a fresh Attrs copy). */
function withBaseClass(attrs, base) {
    const a = attrs ? { ...attrs } : {};
    a.classes = [base, ...(a.classes ?? [])];
    return a;
}
/** Append a class after the existing ones, de-duplicated. */
function addClass(attrs, cls) {
    const classes = attrs.classes ?? [];
    if (classes.includes(cls))
        return attrs;
    return { ...attrs, classes: [...classes, cls] };
}
/** Set a key-value only when the author did not already provide it. */
function withDefaultKeyValue(attrs, key, value) {
    const keyValues = attrs.keyValues ?? {};
    if (key in keyValues)
        return attrs;
    return { ...attrs, keyValues: { ...keyValues, [key]: value } };
}
function hasKeyValue(attrs, key) {
    return attrs?.keyValues?.[key] !== undefined;
}
function stripKeyValue(attrs, key) {
    if (!attrs?.keyValues || attrs.keyValues[key] === undefined)
        return attrs;
    const keyValues = { ...attrs.keyValues };
    delete keyValues[key];
    const out = { ...attrs };
    if (Object.keys(keyValues).length > 0) {
        out.keyValues = keyValues;
    }
    else {
        delete out.keyValues;
    }
    if (out.order)
        out.order = out.order.filter((slot) => slot !== key);
    return out;
}
/** Flatten an inline tree to its text content. */
function inlineText(nodes) {
    let s = '';
    for (const node of nodes) {
        const n = node;
        if (typeof n.value === 'string')
            s += n.value;
        if (typeof n.name === 'string' && n.type === 'tag')
            s += `#${n.name}`;
        const kids = n.children ?? n.content;
        if (Array.isArray(kids))
            s += inlineText(kids);
    }
    return s;
}
//# sourceMappingURL=color-swatch.js.map