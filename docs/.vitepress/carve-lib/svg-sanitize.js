/**
 * Hand-rolled SVG sanitizer (Tier-3, zero-dependency). Powers the `img` fence
 * (see {@link file://./svg-fence.ts}); usable standalone.
 *
 * A real tokenizer, NOT a regex scrub — regex "sanitizers" for SVG are
 * routinely bypassed. It walks the source tag by tag, drops any element not on
 * a presentational allowlist **together with its subtree**, drops any attribute
 * not on the allowlist (and every `on*` handler), scrubs URL/style values, and
 * re-serializes only the survivors. Text nodes pass through with `&<>`
 * re-escaped. Anything unrecognized is dropped, never echoed.
 *
 * The output is guaranteed to contain no `<script>`, no event handlers, no
 * `<foreignObject>`, no `javascript:`/external URLs, and no active CSS — so it
 * is safe to inline into the DOM or to encode into a `data:image/svg+xml` URI.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
// Presentational SVG element allowlist. Deliberately excludes script,
// foreignObject, style, a, image, metadata, and SMIL — those are gated by an
// option or dropped outright.
const ALLOWED_TAGS = new Set([
    'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc', 'switch',
    'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'textPath',
    'marker', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern',
    'filter', 'feGaussianBlur', 'feOffset', 'feBlend', 'feColorMatrix',
    'feComponentTransfer', 'feFuncA', 'feFuncR', 'feFuncG', 'feFuncB',
    'feComposite', 'feFlood', 'feMerge', 'feMergeNode', 'feMorphology',
    'feTile', 'feTurbulence', 'feDropShadow', 'feImage', 'feDisplacementMap',
]);
// Elements permitted only when the matching option is set.
const LINK_TAGS = new Set(['a']);
const ANIMATION_TAGS = new Set(['animate', 'animateTransform', 'animateMotion', 'set', 'mpath']);
const EXTERNAL_IMAGE_TAGS = new Set(['image']);
// Attribute-name allowlist (case-insensitive). Geometry + presentation only.
const ALLOWED_ATTRS = new Set([
    'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    'width', 'height', 'viewbox', 'points', 'transform', 'pathlength',
    'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap',
    'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset',
    'stroke-opacity', 'opacity', 'color', 'offset', 'stop-color', 'stop-opacity',
    'gradientunits', 'gradienttransform', 'spreadmethod', 'patternunits',
    'patterntransform', 'patterncontentunits', 'clippathunits', 'maskunits',
    'maskcontentunits', 'markerwidth', 'markerheight', 'markerunits', 'orient',
    'refx', 'refy', 'preserveaspectratio', 'font-family', 'font-size', 'font-weight',
    'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'word-spacing',
    'clip-path', 'clip-rule', 'mask', 'marker-start', 'marker-mid', 'marker-end',
    'stddeviation', 'in', 'in2', 'result', 'mode', 'operator', 'values', 'type',
    'flood-color', 'flood-opacity', 'attributename', 'begin', 'dur', 'from', 'to',
    'repeatcount', 'keytimes', 'keysplines', 'calcmode', 'additive', 'accumulate',
    'class', 'id', 'role', 'xmlns', 'xmlns:xlink', 'xml:space', 'version',
]);
// Reference-carrying attrs get URL scrubbing rather than a value passthrough.
const URL_ATTRS = new Set(['href', 'xlink:href']);
// Kept byte-identical to the core renderer's DANGEROUS_URL_SCHEMES (render-html.ts):
// script / inline-content / local-file vectors plus the OS protocol-handler /
// command-execution schemes (CVE-2026-20841 class). Must not drift narrower.
const DANGEROUS_URL_SCHEMES = new Set([
    'javascript', 'vbscript', 'data', 'file',
    'ms-msdt', 'ms-office', 'ms-word', 'ms-excel', 'ms-powerpoint', 'ms-access',
    'ms-visio', 'ms-project', 'ms-publisher', 'ms-infopath', 'ms-spd', 'ms-search',
    'search-ms', 'ms-cxh', 'ms-cxh-full', 'shell', 'vscode', 'vscode-insiders', 'jar',
]);
const SCHEME_STRIP_RE = /[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g;
function schemeIsSafe(url) {
    const probe = url.replace(SCHEME_STRIP_RE, '');
    const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(probe);
    if (!m)
        return true; // relative / fragment — safe
    return !DANGEROUS_URL_SCHEMES.has(m[1].toLowerCase());
}
// Decode CSS escapes (`\72` → `r`, `\/` → `/`) so an escaped `url(` / `expression(`
// cannot slip past the needle checks. Mirrors the core renderer's decodeCssEscapes.
function decodeCssEscapes(value) {
    return value.replace(/\\([0-9a-f]{1,6}\s?|[\s\S])/gi, (_m, esc) => {
        if (/^[0-9a-f]/i.test(esc)) {
            const cp = Number.parseInt(esc.trim(), 16);
            return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
        }
        return esc;
    });
}
// Named character references that can obfuscate a URL scheme (form a `:`, `/`,
// whitespace, `(`, or `&`). Numeric refs are handled generically below.
const NAMED_REFS = {
    colon: ':', semi: ';', sol: '/', tab: '\t', newline: '\n',
    lpar: '(', rpar: ')', amp: '&', quot: '"', apos: "'", nbsp: ' ',
};
// Decode XML/HTML character references (numeric `&#x61;`/`&#97;` + the named set
// above) so an entity-encoded scheme — `jav&#x61;script:` / `javascript&colon;` —
// is normalized before a URL/scheme check. The browser decodes these back, so
// the sanitizer must too. Used ONLY for validation, never for output.
function decodeEntities(value) {
    return value.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (m, body) => {
        if (body[0] === '#') {
            const cp = body[1]?.toLowerCase() === 'x' ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
            return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
        }
        const named = NAMED_REFS[body.toLowerCase()];
        return named ?? m;
    });
}
// Full normalization for any URL/reference/style check: undo both entity and
// CSS-escape obfuscation.
function normalizeForCheck(value) {
    return decodeCssEscapes(decodeEntities(value));
}
// Blank a style value that can fetch or execute. Mirrors the core renderer's
// hasDangerousCss: whole-value rejection, not CSS surgery. CSS escapes are
// decoded first so `u\72l(` folds to `url(`.
function styleIsDangerous(value) {
    const compact = normalizeForCheck(value.replace(/\/\*[\s\S]*?\*\//g, ''))
        .toLowerCase()
        .replace(/\s+/g, '');
    return (compact.includes('expression(') ||
        compact.includes('url(') ||
        compact.includes('@import') ||
        compact.includes('behavior:') ||
        compact.includes('-moz-binding') ||
        compact.includes('javascript:'));
}
// A `url(...)` whose content does not begin with `#` is a NON-LOCAL reference.
// Anchoring on the START of the url content (after optional quote/space) sidesteps
// quoting and internal `)` — `url("https://a)b#x")` still matches because the char
// right after `url("` is not `#`. Local `url(#id)` refs never match.
const NONLOCAL_URL_RE = /url\(\s*['"]?\s*(?!#)/i;
// Any absolute-URL scheme (`https:`, `ms-msdt:`, …). Used to reject URLs inside
// reference/animation values, which the plain scheme *denylist* would wave through
// (e.g. an external `https:` retargeting an animated `href`).
const ABSOLUTE_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
// Attributes whose value is a paint/filter/animation REFERENCE. These may only
// carry local `#id` refs or literals — never a non-local `url()` or any absolute
// URL. SMIL value lists (`values`, `from`, `to`, `by`) are validated per
// `;`-separated segment so a later entry cannot smuggle a remote target.
const REF_VALUE_ATTRS = new Set([
    'fill', 'stroke', 'filter', 'clip-path', 'mask',
    'marker-start', 'marker-mid', 'marker-end',
    'color', 'stop-color', 'flood-color',
    'values', 'from', 'to', 'by',
]);
function refAttrUnsafe(value) {
    const decoded = normalizeForCheck(value);
    for (const seg of decoded.split(';')) {
        const s = seg.trim();
        if (NONLOCAL_URL_RE.test(s))
            return true;
        const probe = s.replace(SCHEME_STRIP_RE, '');
        if (ABSOLUTE_SCHEME_RE.test(probe))
            return true;
        // A leading `/` is a path reference: `//host/x` (protocol-relative) or
        // `/abs/path` both fetch remotely. A legit reference value is a local `#id`,
        // a `url(#id)`, or a scheme-less literal (number/color/keyword) — never a
        // slash-led path.
        if (probe.startsWith('/'))
            return true;
    }
    return false;
}
// For any other allowlisted attribute: reject a non-local `url()` or a
// denylisted dangerous scheme.
function valueHasExternalRef(value) {
    const decoded = normalizeForCheck(value);
    if (NONLOCAL_URL_RE.test(decoded))
        return true;
    return !schemeIsSafe(decoded);
}
// Escape a bare `&` but leave intact the entities valid in an XML document: the
// five predefined names (`amp lt gt quot apos`) and numeric refs (`&#38;`,
// `&#x26;`). Other HTML named entities (`&nbsp;`, `&copy;`) are NOT defined in
// XML, so a `data:image/svg+xml` parse would fail on them — escape their `&`
// (`&nbsp;` → `&amp;nbsp;`) so the output stays well-formed. Existing predefined
// entities are preserved, so reserialization stays idempotent and un-double-escaped.
function escapeAmp(s) {
    return s.replace(/&(?!#\d+;|#x[0-9a-fA-F]+;|(?:amp|lt|gt|quot|apos);)/g, '&amp;');
}
function escapeText(s) {
    return escapeAmp(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
    return escapeAmp(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function tagAllowed(name, opts) {
    const n = name.toLowerCase();
    if (ALLOWED_TAGS.has(name) || ALLOWED_TAGS.has(n))
        return true;
    if (opts.allowLinks && LINK_TAGS.has(n))
        return true;
    // Note: the `<style>` *element* is never allowed — its text can carry
    // `@import`/`url()` that no attribute scrub would catch. `allowStyle` governs
    // only the `style` attribute (see sanitizeAttrs).
    if (opts.allowAnimation && ANIMATION_TAGS.has(n))
        return true;
    if (opts.allowExternalImages && EXTERNAL_IMAGE_TAGS.has(n))
        return true;
    return false;
}
const ATTR_RE = /([A-Za-z_:][\w:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g;
function parseAttrs(raw) {
    const out = [];
    let m;
    ATTR_RE.lastIndex = 0;
    while ((m = ATTR_RE.exec(raw)) !== null) {
        const value = m[3] ?? m[4] ?? (m[2] !== undefined ? m[2] : null);
        out.push({ name: m[1], value });
    }
    return out;
}
function sanitizeAttrs(raw, opts, tag) {
    // An external (non-`#fragment`) href passes only on the specific element its
    // gate covers: `allowLinks` for `<a>`, `allowExternalImages` for `<image>`.
    // Every other element (incl. fetch-capable `<use>` / `<feImage>`) keeps only
    // local `#id` refs, so opting into links can't widen remote fetches. Scheme
    // is still checked so `javascript:`/`data:`/`file:` never survive.
    const t = tag.toLowerCase();
    const allowExternalHref = (opts.allowLinks === true && t === 'a') || (opts.allowExternalImages === true && t === 'image');
    let out = '';
    // Duplicate attributes are not well-formed XML (breaks the data-URI parse), so
    // keep only the first occurrence of each name.
    const seen = new Set();
    for (const { name, value } of parseAttrs(raw)) {
        if (seen.has(name))
            continue;
        seen.add(name);
        const n = name.toLowerCase();
        if (n.startsWith('on'))
            continue; // every event handler, always
        if (URL_ATTRS.has(n)) {
            if (value === null)
                continue;
            // Normalize entity/CSS-escape obfuscation before deciding — the browser
            // decodes `jav&#x61;script:` / `javascript&colon;` back to a live scheme.
            const decoded = normalizeForCheck(value);
            const local = decoded.startsWith('#');
            if (!local && !allowExternalHref)
                continue;
            if (!schemeIsSafe(decoded))
                continue;
            out += ` ${name}="${escapeAttr(value)}"`;
            continue;
        }
        if (n === 'style') {
            if (!opts.allowStyle || value === null)
                continue;
            if (styleIsDangerous(value))
                continue;
            out += ` ${name}="${escapeAttr(value)}"`;
            continue;
        }
        if (n.startsWith('aria-') || n.startsWith('data-') || ALLOWED_ATTRS.has(n)) {
            // A value may carry an external `url(...)` paint/filter ref or an absolute
            // URL (esp. in a SMIL `values` list); drop the attribute rather than let
            // the inlined SVG fetch or retarget a remote resource. Local `url(#id)` /
            // `#id` refs are kept.
            if (value !== null && (REF_VALUE_ATTRS.has(n) ? refAttrUnsafe(value) : valueHasExternalRef(value)))
                continue;
            out += value === null ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`;
        }
    }
    return out;
}
// One tag / comment / text token at a time.
const TOKEN_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!(?:DOCTYPE|doctype)[^>]*>|<\?[\s\S]*?\?>|<\/([A-Za-z][\w:.-]*)\s*>|<([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
/**
 * Sanitize an SVG source string. See the module docblock for the guarantees.
 */
export function sanitizeSvg(source, opts = {}) {
    const src = source.trim();
    let out = '';
    let lastIndex = 0;
    const dropStack = []; // names of DROPPED open elements (subtree being discarded)
    const kept = []; // names of KEPT open elements — matched on close
    let sawSvgRoot = false;
    let rootSelfClosed = false;
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src)) !== null) {
        // Text between the previous token and this one. Before the root <svg>, only
        // whitespace is ignorable (the newline after a dropped `<?xml?>`/DOCTYPE);
        // any non-whitespace prefix (`caption<svg>…`) means the body is not a single
        // SVG root → reject so the caller falls back to source.
        if (m.index > lastIndex) {
            const between = src.slice(lastIndex, m.index);
            if (!sawSvgRoot) {
                if (between.trim() !== '')
                    return { svg: '', ok: false };
            }
            else if (dropStack.length === 0) {
                out += escapeText(between);
            }
        }
        lastIndex = TOKEN_RE.lastIndex;
        const endName = m[1];
        const startName = m[2];
        if (endName !== undefined) {
            // Closing tag. It must match the most recent open element — whether that
            // element is being dropped or kept. A mismatch means malformed SVG →
            // reject so the caller falls back to source.
            // Tag names are matched CASE-SENSITIVELY: a data-URI SVG is parsed as XML,
            // where `<g></G>` is a mismatch. Accepting it would emit invalid XML.
            if (dropStack.length > 0) {
                const d = dropStack.pop();
                if (d !== endName) {
                    return { svg: '', ok: false };
                }
            }
            else {
                const open = kept.pop();
                if (open === undefined || open !== endName) {
                    return { svg: '', ok: false };
                }
                out += `</${endName}>`;
            }
            continue;
        }
        if (startName === undefined) {
            // Comment / CDATA / DOCTYPE / PI — dropped entirely.
            continue;
        }
        const selfClose = m[4] === '/';
        const allowed = tagAllowed(startName, opts);
        const isRoot = kept.length === 0 && dropStack.length === 0 && !sawSvgRoot;
        if (isRoot && startName !== 'svg') {
            // First element is not a lowercase `<svg>` root. XML (the data-URI parse)
            // is case-sensitive, so only the exact `svg` element is the SVG root.
            return { svg: '', ok: false };
        }
        if (!isRoot && kept.length === 0 && dropStack.length === 0 && sawSvgRoot) {
            // A second element at the top level: the body is not a single <svg> root.
            return { svg: '', ok: false };
        }
        if (dropStack.length > 0) {
            // Already discarding a subtree; track nesting by name so only the
            // matching close exits it.
            if (!selfClose)
                dropStack.push(startName);
            continue;
        }
        if (!allowed) {
            if (!selfClose)
                dropStack.push(startName);
            continue;
        }
        if (isRoot) {
            sawSvgRoot = true;
            rootSelfClosed = selfClose;
        }
        let attrs = sanitizeAttrs(m[3] ?? '', opts, startName);
        if (isRoot) {
            // Force the canonical SVG namespace on the root: drop any author `xmlns`
            // (which may have been stripped as dangerous, or point at a non-SVG
            // namespace) and inject ours. `xmlns:xlink` is left intact — the regex
            // only matches the bare `xmlns=`. A correct namespace is required for the
            // sandbox data-URI to render as SVG.
            attrs = ` xmlns="${SVG_NS}"` + attrs.replace(/\s+xmlns\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
        }
        out += `<${startName}${attrs}${selfClose ? '/>' : '>'}`;
        if (!selfClose)
            kept.push(startName);
    }
    // Trailing text.
    if (lastIndex < src.length && sawSvgRoot && dropStack.length === 0) {
        out += escapeText(src.slice(lastIndex));
    }
    // Well-formedness: a single closed <svg> root, balanced, nothing left open.
    if (!sawSvgRoot || kept.length !== 0 || dropStack.length !== 0) {
        return { svg: '', ok: false };
    }
    const tailOk = rootSelfClosed ? /\/>\s*$/.test(out) : /<\/svg>\s*$/i.test(out);
    if (!/^<svg[\s/>]/i.test(out) || !tailOk) {
        return { svg: '', ok: false };
    }
    return { svg: out, ok: true };
}
//# sourceMappingURL=svg-sanitize.js.map