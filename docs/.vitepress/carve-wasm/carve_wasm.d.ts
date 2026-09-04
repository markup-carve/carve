/* tslint:disable */
/* eslint-disable */

export interface LintWarning {
    /** 1-based line number. */
    line: number;
    /** 1-based column number. */
    column: number;
    /** Stable rule id, shared with carve-js and carve-php. */
    rule: string;
    message: string;
    /** 0-based BYTE offset into the source, inclusive. */
    start: number;
    /** 0-based BYTE offset into the source, exclusive. */
    end: number;
}

export interface Stamp {
    /** The spec version the document was last processed under. */
    version: string;
    /** The engine that wrote the marker, when it recorded one. */
    generatedBy: string | null;
}



/**
 * Every extension name this build accepts, in registry order.
 *
 * Taken from the engine, so a new extension is reachable as soon as the pin
 * moves. Nothing here lists names.
 */
export function extensions(): string[];

export function toHtml(source: string): string;

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
 */
export function toHtmlFull(source: string, symbols?: object | null): string;

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
 * * `smartTypography` - `"glyph"` (default) resolves `...` to an ellipsis,
 *   `"source"` keeps the author's run.
 * * `lowercaseHeadingIds` (default `false`) and `asciiHeadingIds`
 *   (`"off"` (default), `"fold"`, `"strict"`) - the slug policy, for a host
 *   whose anchors have to match another generator's.
 *
 * An unrecognized key is ignored: the object is configuration, and a caller
 * who mistypes one deserves the render to still work. A wrong TYPE on a key
 * that is recognized does throw, because that changes behavior silently.
 *
 * Turning sections off changes nothing else. Ids, collision dedup, `</#id>`
 * crossrefs, implicit `[Heading][]` references and heading numbering all
 * resolve against the slug rather than the element carrying it, and the
 * endnotes `<section role="doc-endnotes">` is a separate construct that is
 * still emitted.
 */
export function toHtmlWithOptions(source: string, options?: object | null): string;

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
 */
export function toHtmlWithSymbols(source: string, symbols?: object | null): string;

export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly extensions: () => [number, number];
    readonly toHtml: (a: number, b: number) => [number, number];
    readonly toHtmlFull: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toHtmlWithOptions: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toHtmlWithSymbols: (a: number, b: number, c: number) => [number, number, number, number];
    readonly version: () => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
