/* tslint:disable */
/* eslint-disable */

/**
 * Every extension name this build accepts, in registry order.
 *
 * Taken from the engine, so a new extension is reachable as soon as the pin
 * moves. Nothing here lists names.
 */
export function extensions(): string[];

export function fromHtml(source: string, mode?: string | null): any;

export function fromMarkdown(source: string): any;

/**
 * Import HTML through the Rust HTML5 DOM and canonical Carve writer.
 *
 * Returns `{ value, report }`; `report.diagnostics` makes every lossy import
 * decision observable. `roundtrip` is only safe for Carve-produced HTML.
 */
export function htmlToCarve(source: string, mode?: string | null): any;

/**
 * Parse Carve source and return its AST as a JSON string.
 *
 * The PART 12 exchange shape (https://markup-carve.github.io/carve/ast-json):
 * the same tree every Carve engine publishes, so a consumer written against
 * one implementation reads another's output. The root carries exactly `type`,
 * `children` and `srcByteLength`; frontmatter and footnote definitions are
 * block nodes inside `children`, not root fields.
 *
 * Returns a STRING rather than a JS object: the caller runs `JSON.parse`, which
 * is what a browser does natively and faster than building the object graph
 * across the wasm boundary one property at a time. It also keeps the bytes
 * available for a caller that stores or forwards them.
 *
 * Position tracking is on for this entry point and nowhere else. PART 12 §4
 * lets an engine gate tracking behind a parse option but requires the
 * serialized form to carry it, and rendering would pay for spans nobody reads.
 */
export function parseJson(source: string): string;

export function toAnsi(source: string): string;

export function toAnsiWithReport(source: string, strict?: boolean | null, maximum?: number | null): any;

export function toCarve(source: string): string;

export function toCarveWithReport(source: string, strict?: boolean | null, maximum?: number | null): any;

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

export function toHtmlWithReport(source: string, strict?: boolean | null, maximum?: number | null): any;

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

export function toMarkdown(source: string): string;

export function toMarkdownWithReport(source: string, strict?: boolean | null, maximum?: number | null): any;

export function toPlainText(source: string): string;

export function toPlainTextWithReport(source: string, strict?: boolean | null, maximum?: number | null): any;

export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly extensions: () => [number, number];
    readonly fromHtml: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly fromMarkdown: (a: number, b: number) => [number, number, number];
    readonly parseJson: (a: number, b: number) => [number, number];
    readonly toAnsi: (a: number, b: number) => [number, number];
    readonly toAnsiWithReport: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly toCarve: (a: number, b: number) => [number, number];
    readonly toCarveWithReport: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly toHtml: (a: number, b: number) => [number, number];
    readonly toHtmlFull: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toHtmlWithOptions: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toHtmlWithReport: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly toHtmlWithSymbols: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toMarkdown: (a: number, b: number) => [number, number];
    readonly toMarkdownWithReport: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly toPlainText: (a: number, b: number) => [number, number];
    readonly toPlainTextWithReport: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly version: () => [number, number];
    readonly htmlToCarve: (a: number, b: number, c: number, d: number) => [number, number, number];
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
