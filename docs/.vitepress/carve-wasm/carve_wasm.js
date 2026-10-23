/* @ts-self-types="./carve_wasm.d.ts" */

/**
 * Every extension name this build accepts, in registry order.
 *
 * Taken from the engine, so a new extension is reachable as soon as the pin
 * moves. Nothing here lists names.
 * @returns {string[]}
 */
export function extensions() {
    const ret = wasm.extensions();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Parse the locator portion of a citation into `{ label, value, suffixText }`.
 *
 * A field the source did not carry is `null`. Same shape as carve-js
 * `parseLocator`; pure, and never throws on bad input.
 * @param {string} loc
 * @returns {ParsedLocator}
 */
export function parseLocator(loc) {
    const ptr0 = passStringToWasm0(loc, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parseLocator(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Sanitize an SVG document, the helper a host embedding SVG would otherwise
 * reimplement.
 *
 * `{ svg, ok }`. `ok` false means the input was not a single well-formed
 * `<svg>` root, and a caller must then show the SOURCE rather than the input:
 * `svg` carries nothing to display. Every option defaults to `false`, which is
 * the strict setting.
 * @param {string} source
 * @param {object | null} [options]
 * @returns {SanitizeResult}
 */
export function sanitizeSvg(source, options) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.sanitizeSvg(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {string} source
 * @returns {string}
 */
export function toAnsi(source) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toAnsi(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Render to ANSI text with an options object. See
 * [`to_markdown_with_options`].
 * @param {string} source
 * @param {RenderOptions | null} options
 * @returns {string}
 */
export function toAnsiWithOptions(source, options) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toAnsiWithOptions(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @param {string} source
 * @returns {string}
 */
export function toCarve(source) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toCarve(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Write canonical Carve with an options object.
 *
 * `profile` and `alignTables` are the only options this target reads; see
 * [`to_markdown_with_options`] for why.
 * @param {string} source
 * @param {RenderOptions | null} options
 * @returns {string}
 */
export function toCarveWithOptions(source, options) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toCarveWithOptions(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @param {string} source
 * @returns {string}
 */
export function toHtml(source) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toHtml(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Render with the preview extension set enabled (`PREVIEW_EXTENSIONS`), so the
 * WASM engine matches an extensions-on host such as the docs Playground rather
 * than the core-only `toHtml`.
 *
 * The set is curated, not "everything the engine has": `heading-numbers` and
 * `table-of-contents` rewrite a document that never asked for it, which is
 * wrong for a preview. Callers who want an exact set pass `extensions` to
 * `toHtmlWithOptions`, and `extensions()` reports what this build accepts.
 *
 * The optional second argument is the same **symbols map** as
 * [`to_html_with_symbols`], with the same trusted-raw contract: mapped values
 * are emitted UNESCAPED, so never feed it untrusted input.
 * @param {string} source
 * @param {object | null} [symbols]
 * @returns {string}
 */
export function toHtmlFull(source, symbols) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toHtmlFull(ptr0, len0, isLikeNone(symbols) ? 0 : addToExternrefTable0(symbols));
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Render with an options object, the general form of the three shorthands
 * above.
 *
 * ```js
 * toHtmlWithOptions('# A\n\np\n', { sections: false })
 * // '<h1 id="A">A</h1>\n<p>p</p>'
 *
 * toHtmlWithOptions(src, { sections: false, symbols: { rocket: '🚀' }, full: true })
 *
 * toHtmlWithOptions(untrusted, { rawHtml: false })
 * ```
 *
 * Every field is optional:
 *
 * * `sections` (default `true`) - wrap each top-level heading, and the content
 *   following it up to the next same-or-shallower heading, in a
 *   `<section id="…">` (spec PART 9 §13). `false` renders headings flat with
 *   the id back on the `<h*>` and the former section children as siblings.
 *   For a host whose CSS or JS assumes rendered blocks are direct children of
 *   the content container - the `.stack > * + *` spacing idiom,
 *   `:first-child`, `nth-child()` counting, `element.children` walks - the
 *   wrapper is the one output change a clean source migration still breaks.
 * * `symbols` - the same map as [`to_html_with_symbols`], with the same
 *   TRUSTED-RAW contract: mapped values are emitted UNESCAPED, so never build
 *   it from untrusted input.
 * * `extensions` - an array of extension names to enable, e.g.
 *   `["glossary", "table-of-contents"]`. `extensions()` reports what this
 *   build accepts. An unknown name throws: a silently ignored extension would
 *   render as missing behavior that looks like a Carve bug. Takes precedence
 *   over `full`.
 * * `full` (default `false`) - enable the preview extension set instead of
 *   rendering core-only.
 * * `rawHtml` (default `true`) - render an explicit passthrough - the `=html`
 *   raw block and the `` `…`{=html} `` inline raw span - as markup. `false`
 *   emits it as escaped text instead, the same switch carve-js spells
 *   `allowRawHtml`. A host that renders a document it did not author (a shared
 *   link, a comment field, anything a reader supplies) wants `false`: without
 *   it a passthrough is a way to run script on the host's origin.
 * * `profile` - one of `"full"`, `"article"`, `"comment"`, `"minimal"`. The
 *   rest of the untrusted-input story: input length, denied constructs, link
 *   policy. A document the profile REJECTS throws a `ProfileViolationError`
 *   carrying `violations`, rather than resolving to an empty string.
 * * `profileBaseHost` - the host counted as internal when the profile's link
 *   policy distinguishes internal from external links.
 * * `mode` - `"interactive"` (default) or `"static"`, the self-contained form
 *   for print, PDF and archival: no client scripts.
 * * `sourceLine` (default `false`) - stamp top-level blocks with
 *   `data-source-line`, for editor preview scroll-sync.
 * * `positions` (default `false`) - keep source offsets on the nodes.
 * * `labels` - override the engine-written strings (admonition names, the
 *   endnotes heading, backlink text) for a page that is not in English. These
 *   are TEXT and are escaped where they land, unlike `symbols`.
 * * `smartTypography` - `"glyph"` or `true` (default) resolves `...` to an
 *   ellipsis, `"source"` or `false` keeps the author's run, and
 *   `{ quotes: false }` keeps only the author's quotes.
 * * `lowercaseHeadingIds` (default `false`) and `asciiHeadingIds`
 *   (`"off"` (default), `"fold"`, `"strict"`) - the slug policy, for a host
 *   whose anchors have to match another generator's.
 * * `mentionUrl` and `tagUrl` - URL templates for `@mention` and `#tag`.
 *   Without them both render as inert spans, which is why a host that wants
 *   them linked has to say where to. The token name is percent-encoded into
 *   `{name}` - `{user}` works too for a mention - and the result goes through
 *   the same URL sanitizer as an authored link. These are the HOST's
 *   configuration, not the document's: the template is trusted, the name
 *   substituted into it is not.
 *
 * An unrecognized key is ignored: the object is configuration, and a caller
 * who mistypes one deserves the render to still work. A wrong TYPE on a key
 * that is recognized does throw, because that changes behavior silently.
 *
 * `renderers` is the one recognized key this entry point refuses, because a
 * render callback can fail and a bare string has nowhere to report that. Use
 * [`to_html_with_renderers`].
 *
 * Turning sections off changes nothing else. Ids, collision dedup, `</#id>`
 * crossrefs, implicit `[Heading][]` references and heading numbering all
 * resolve against the slug rather than the element carrying it, and the
 * endnotes `<section role="doc-endnotes">` is a separate construct that is
 * still emitted.
 * @param {string} source
 * @param {RenderOptions | null} options
 * @returns {string}
 */
export function toHtmlWithOptions(source, options) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toHtmlWithOptions(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Render with a build-time math renderer, the option `mode: "static"` needs.
 *
 * Static output carries no client scripts, so a formula it contains has to be
 * rendered while the HTML is being written. `renderers.math` is the callback
 * the engine calls for each ``` ```math ``` fence, with the TeX source and a
 * display flag; KaTeX's `renderToString` has that exact shape.
 *
 * ```js
 * toHtmlWithRenderers(src, {
 *   mode: 'static',
 *   extensions: ['math-block'],
 *   renderers: { math: (tex, display) => katex.renderToString(tex, { displayMode: display }) },
 * })
 * // { html: '…', rendererErrors: [] }
 * ```
 *
 * SECURITY: what the callback returns is inserted as **TRUSTED RAW HTML**, the
 * same trust class as a `symbols` value. The difference worth stating: a symbol
 * value is host configuration keyed by a NAME, while a renderer is host
 * configuration that is HANDED DOCUMENT CONTENT and typically echoes some of it
 * back. A host rendering documents it did not author is accepting whatever its
 * renderer makes of that input, so the escaping is the renderer's job.
 *
 * The engine consults the renderer only under `mode: "static"`; interactive
 * output keeps the `\[…\]` source for the client to typeset, and so does a
 * static render with no renderer supplied.
 *
 * The callback must be SYNCHRONOUS. wasm-bindgen cannot await across it, so an
 * `async` renderer returns a Promise the engine has no way to resolve; that is
 * recorded as a failure rather than stringified into the document.
 *
 * `renderers.diagrams` is the same callback one level down, keyed by the
 * fence's css class: `{ mermaid: (source) => html }`. A host that renders its
 * diagrams beforehand passes the lookup in that one line -
 * `(source) => prerendered.get(source)`. Mermaid itself cannot be passed,
 * because its `render` returns a Promise from v10 on.
 *
 * ```js
 * toHtmlWithRenderers(src, {
 *   mode: 'static',
 *   extensions: ['fenced-render'],
 *   renderers: { diagrams: { mermaid: (source) => prerendered.get(source) } },
 * })
 * ```
 *
 * A diagram key the document never uses renders nothing and reports nothing.
 * So does a fence whose class the caller did not configure: the engine
 * degrades it to an escaped source block, and this binding never sees the
 * node.
 *
 * A callback that throws, or returns anything other than a string, does not
 * abort the render: the node it was called for emits nothing and the failure
 * is reported in `rendererErrors`, with `renderer` naming the css class.
 * This entry point exists because [`to_html_with_options`] returns a bare
 * string with nowhere to put that, and so it rejects `renderers` rather than
 * dropping the failures.
 * @param {string} source
 * @param {StaticRenderOptions | null} options
 * @returns {any}
 */
export function toHtmlWithRenderers(source, options) {
    const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.toHtmlWithRenderers(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Render with the core profile and a **symbols map**: `{ rocket: "🚀" }` (a
 * plain object or a `Map`). A `:name:` symbol whose name is in the map renders
 * the mapped value; an unmapped `:name:` stays literal `:name:` text, and the
 * leading word-boundary guard still applies (`a:b:c`, `10:30:`,
 * `me@example.com` never become symbols).
 *
 * Names and values must both be strings; a non-string value throws a JS
 * `TypeError`.
 *
 * SECURITY: a mapped value is inserted as **TRUSTED RAW output in the target
 * format** - it is NOT escaped, the same trust class as the static `renderers`
 * map. So `{ b: "<b>x</b>" }` emits a real `<b>` element, not escaped text.
 * This is deliberate: processor configuration is trusted. NEVER build a
 * symbols map out of untrusted / user-supplied input.
 * @param {string} source
 * @param {object | null} [symbols]
 * @returns {string}
 */
export function toHtmlWithSymbols(source, symbols) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toHtmlWithSymbols(ptr0, len0, isLikeNone(symbols) ? 0 : addToExternrefTable0(symbols));
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @param {string} source
 * @returns {string}
 */
export function toMarkdown(source) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toMarkdown(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Render to Markdown with the same options object as
 * [`to_html_with_options`].
 *
 * `profile` is why this exists. Without it a host can hold an untrusted
 * document to a profile on the way to HTML and not on the way to Markdown,
 * out of one package: the max-length bound, the denied constructs and the
 * link policy were all unreachable here. A document the profile rejects
 * throws a `ProfileViolationError` rather than resolving to an empty string.
 *
 * What these targets read is narrower than HTML's list: `profile` and
 * `smartTypography` change the output and extensions run, while `symbols`
 * (markup-carve/carve-rs#1668), `labels`, `sections`, `sourceLine`, `mode` and
 * the heading-id switches are HTML-side concerns the engine's other renderers
 * do not consult. `renderers` is refused for the reason
 * [`to_html_with_options`] refuses it.
 *
 * [`to_carve_with_options`] is narrower again and reads `profile` and
 * `alignTables` alone: the
 * engine's canonical writer is parse-only by contract, so extensions and
 * `smartTypography` are inert there. They are accepted rather than refused
 * because one options object is meant to serve every target.
 * @param {string} source
 * @param {RenderOptions | null} options
 * @returns {string}
 */
export function toMarkdownWithOptions(source, options) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toMarkdownWithOptions(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @param {string} source
 * @returns {string}
 */
export function toPlainText(source) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toPlainText(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Render to plain text with an options object. See
 * [`to_markdown_with_options`].
 * @param {string} source
 * @param {RenderOptions | null} options
 * @returns {string}
 */
export function toPlainTextWithOptions(source, options) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.toPlainTextWithOptions(ptr0, len0, isLikeNone(options) ? 0 : addToExternrefTable0(options));
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_boolean_get_a86c216575a75c30: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_is_function_49868bde5eb1e745: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_344c8750a8525473: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_object_40c5a80572e8f9d3: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_undefined_c0cca72b82b86f4d: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_string_get_914df97fcfa788f2: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_81fc77679af83bc6: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_typeof_ec2e006152efc95c: function(arg0) {
            const ret = typeof arg0;
            return ret;
        },
        __wbg_call_368fa9c372d473ba: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.call(arg1, arg2, arg3);
            return ret;
        }, arguments); },
        __wbg_call_d578befcc3145dee: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_entries_616b1a459b85be0b: function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        },
        __wbg_entries_7d89e479ff037f54: function(arg0) {
            const ret = arg0.entries();
            return ret;
        },
        __wbg_from_741da0f916ab74aa: function(arg0) {
            const ret = Array.from(arg0);
            return ret;
        },
        __wbg_get_4848e350b40afc16: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_f96702c6245e4ef9: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_unchecked_7d7babe32e9e6a54: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_instanceof_Error_e3390d6805733dad: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Error;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_a10a2795ef4bfe97: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Object_72ee0c53dd8f0726: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Object;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Promise_95d523058012a13d: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Promise;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_db61795ad004c139: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_keys_e611eeb7873788db: function(arg0) {
            const ret = Object.keys(arg0);
            return ret;
        },
        __wbg_length_6e821edde497a532: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_message_7367f8c7d0fa1589: function(arg0) {
            const ret = arg0.message;
            return ret;
        },
        __wbg_new_47dfee3855dec446: function(arg0, arg1) {
            const ret = new TypeError(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_4f9fafbb3909af72: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_e3b04b4d53d1b593: function(arg0, arg1) {
            const ret = new Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_f3c9df4f38f3f798: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_push_6bdbc990be5ac37b: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_set_8ee2d34facb8466e: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_name_ab9c98596fd7310a: function(arg0, arg1, arg2) {
            arg0.name = getStringFromWasm0(arg1, arg2);
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./carve_wasm_bg.js": import0,
    };
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('carve_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
