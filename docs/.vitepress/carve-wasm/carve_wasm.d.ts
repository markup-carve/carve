/* tslint:disable */
/* eslint-disable */


export function toHtmlWithOptions(source: string, options?: RenderOptions | null): string;
export function toHtmlWithRenderers(source: string, options?: StaticRenderOptions | null): StaticRenderResult;

export interface IncludeContext {
    sourcePath: string | null;
    stack: string[];
    depth: number;
}
export type IncludeDenial = "outside-root" | "not-found" | "no-root" | "include-denied" | "include-non-text" | "include-unresolved";
export interface IncludeOptions {
    resolve: (path: string, context: IncludeContext) => string | { source: string; id?: string } | { denial: IncludeDenial } | null;
    sourcePath?: string;
    extensions?: string[];
    maxDepth?: number;
    maxBytes?: number;
    maxResolverCalls?: number;
    maxWarnings?: number;
}
export interface IncludeExpansion {
    json: string;
    warnings: { rule: string; message: string; file: string | null }[];
    suppressedWarnings: number;
    /** A `include-non-text` refusal reports `denial: null`, like NUL content. */
    dependencies: { id: string; resolved: boolean; denial: Exclude<IncludeDenial, "include-non-text"> | null }[];
    chargedBytes: number;
    resolverErrors: { path: string; message: string }[];
}
export interface SourcePosition {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
    /** Unicode codepoint offsets, not UTF-8 bytes or UTF-16 units. */
    startOffset: number;
    endOffset: number;
}
export interface RenderLoss {
    code: string;
    format: string;
    target: string;
    nodeType: string;
    message: string;
    pos?: SourcePosition;
}
export interface RenderResult {
    value: string;
    losses: RenderLoss[];
    totalLosses: number;
    /**
     * How many losses each code accounts for, across the WHOLE render.
     * `losses` is bounded, so counting codes off that array under-reports as
     * soon as `truncated` is true; these totals do not.
     */
    totalsByCode: Record<string, number>;
    truncated: boolean;
}
export interface RenderOptions {
    full?: boolean;
    extensions?: string[];
    symbols?: Record<string, string> | Map<string, string>;
    rawHtml?: boolean;
    sections?: boolean;
    sourceLine?: boolean;
    positions?: boolean;
    lowercaseHeadingIds?: boolean;
    asciiHeadingIds?: "off" | "fold" | "strict";
    smartTypography?: "glyph" | "source" | boolean | { quotes?: boolean };
    mode?: "interactive" | "static";
    profile?: "full" | "article" | "comment" | "minimal";
    profileBaseHost?: string;
    mentionUrl?: string;
    tagUrl?: string;
    labels?: Record<string, string>;
    /** Pad table columns in `toCarveWithOptions` output. Other targets ignore it. */
    alignTables?: boolean;
}
export interface StaticRenderOptions extends RenderOptions {
    renderers?: {
        math?: (source: string, display: boolean) => string;
        diagrams?: Record<string, (source: string) => string>;
    };
}

export interface LintWarning {
    /** 1-based line number. */
    line: number;
    /** 1-based column number. */
    column: number;
    /** Stable rule id, shared with carve-js and carve-php. */
    rule: string;
    message: string;
    /**
     * 0-based offset into the source in UTF-16 CODE UNITS, inclusive. That is
     * what indexes a JavaScript string, so `source.slice(start, end)` selects the
     * span the warning is about. It was a UTF-8 byte offset before 0.1.6, which
     * agreed with this on an ASCII document and not outside one.
     */
    start: number;
    /** 0-based UTF-16 code unit offset into the source, exclusive. */
    end: number;
    /** The included file the finding arose in; null for the document itself. */
    file: string | null;
    /** The include directives that reached `file`, top-level first. */
    includedBy: { file: string; line: number; column: number }[];
}
/** The `includes` option of `lintCarveWithOptions`: `IncludeOptions` without `extensions`. */
export type LintIncludeOptions = Omit<IncludeOptions, "extensions">;
export interface LintOptions extends RenderOptions {
    /** Follow include directives through `resolve` and lint the included Carve files too. */
    includes?: LintIncludeOptions;
}
/**
 * A finding from a lint that followed includes. `start` and `end` are null on
 * findings from another file, since they would index a text the caller did not pass.
 */
export interface IncludeLintWarning extends Omit<LintWarning, "start" | "end"> {
    start: number | null;
    end: number | null;
}

export interface ProfileViolation {
    /** Canonical node type that was disallowed. */
    nodeType: string;
    /** Machine reason: element_not_allowed | max_nesting_exceeded | link_not_allowed | image_not_allowed. */
    reason: string;
    /** The profile's own wording for the denial, when it carries one. */
    reasonDescription: string | null;
    /** The engine's prose, the same text a thrown ProfileViolationError lists. */
    message: string;
}
export interface ProfileFilterResult {
    /** The filtered tree, as AST JSON. */
    json: string;
    violations: ProfileViolation[];
}

export interface Stamp {
    /** The spec version the document was last processed under. */
    version: string;
    /** The engine that wrote the marker, when it recorded one. */
    generatedBy: string | null;
}

export type MigrationFidelity = "preserved" | "normalized" | "degraded" | "dropped";
export type MigrationConfidence = "exact" | "inferred" | "fallback";
export interface MigrationDiagnostic {
    code: string;
    message: string;
    severity: "info" | "warning" | "error";
    fidelity: MigrationFidelity;
    confidence: MigrationConfidence;
    path?: string;
}
export interface MigrationReport {
    schemaVersion: 2;
    sourceFormat: string;
    mode?: string;
    adapter?: string;
    diagnostics: MigrationDiagnostic[];
}
export interface MigrationResult { value: string; report: MigrationReport; }

export type SourceEditKind = "formatting" | "syntax-migration" | "quick-fix" | "refactor";
export interface SourceEdit {
    /** Inclusive UTF-8 byte offset. */
    start: number;
    /** Exclusive UTF-8 byte offset. */
    end: number;
    replacement: string;
    kind: SourceEditKind;
    code: string;
}
export interface SourceSuggestion extends SourceEdit { message: string; }
export interface SourcePatch {
    version: 1;
    sourceFingerprint: string;
    sourceBytes: number;
    edits: SourceEdit[];
    unresolved: SourceSuggestion[];
}

export interface StaticRendererError {
    /** "math", or the diagram fence class. */
    renderer: string;
    /** Present for math callbacks only. */
    display?: boolean;
    /** The source the renderer was handed. */
    source: string;
    message: string;
}
export interface StaticRenderResult {
    html: string;
    /** Empty unless a render callback threw or returned a non-string. */
    rendererErrors: StaticRendererError[];
}

export interface AccessibilityDiagnostic {
    /** Stable rule id, e.g. a11y/image-alt. */
    rule: string;
    severity: "warning" | "error";
    message: string;
    /**
     * 0-based Unicode CODEPOINT offset, or null when the node carried none.
     * Codepoints, not the UTF-8 bytes `LintWarning` counts: the two lint
     * families answer in different units.
     */
    startOffset: number | null;
    endOffset: number | null;
    /**
     * The same span in UTF-16 code units, which is what indexes a JavaScript
     * string. Null exactly when `startOffset` / `endOffset` are.
     */
    startUtf16: number | null;
    endUtf16: number | null;
}

export interface SanitizeSvgOptions {
    allowStyle?: boolean;
    allowLinks?: boolean;
    allowAnimation?: boolean;
    allowExternalImages?: boolean;
}
export interface SanitizeResult {
    /** Meaningful only when ok is true. */
    svg: string;
    /** False when the input was not a single well-formed <svg> root. */
    ok: boolean;
}

export interface ParsedLocator {
    label: string | null;
    value: string | null;
    suffixText: string | null;
}

export interface ProseMirrorResult {
    /** The ProseMirror document, JSON-encoded. */
    json: string;
    /** Carve node type -> why its content is gone. */
    dropped: Record<string, string>;
    /** Carve node type -> why its node type is gone while its text survives. */
    degraded: Record<string, string>;
}



export function toMarkdownWithOptions(source: string, options?: RenderOptions | null): string;
export function toPlainTextWithOptions(source: string, options?: RenderOptions | null): string;
export function toAnsiWithOptions(source: string, options?: RenderOptions | null): string;
export function toCarveWithOptions(source: string, options?: RenderOptions | null): string;



/**
 * Every extension name this build accepts, in registry order.
 *
 * Taken from the engine, so a new extension is reachable as soon as the pin
 * moves. Nothing here lists names.
 */
export function extensions(): string[];

/**
 * Parse the locator portion of a citation into `{ label, value, suffixText }`.
 *
 * A field the source did not carry is `null`. Same shape as carve-js
 * `parseLocator`; pure, and never throws on bad input.
 */
export function parseLocator(loc: string): ParsedLocator;

/**
 * Sanitize an SVG document, the helper a host embedding SVG would otherwise
 * reimplement.
 *
 * `{ svg, ok }`. `ok` false means the input was not a single well-formed
 * `<svg>` root, and a caller must then show the SOURCE rather than the input:
 * `svg` carries nothing to display. Every option defaults to `false`, which is
 * the strict setting.
 */
export function sanitizeSvg(source: string, options?: object | null): SanitizeResult;

export function toAnsi(source: string): string;

export function toCarve(source: string): string;

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

export function toPlainText(source: string): string;

export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly extensions: () => [number, number];
    readonly parseLocator: (a: number, b: number) => [number, number, number];
    readonly sanitizeSvg: (a: number, b: number, c: number) => [number, number, number];
    readonly toAnsi: (a: number, b: number) => [number, number];
    readonly toAnsiWithOptions: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toCarve: (a: number, b: number) => [number, number];
    readonly toCarveWithOptions: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toHtml: (a: number, b: number) => [number, number];
    readonly toHtmlFull: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toHtmlWithOptions: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toHtmlWithRenderers: (a: number, b: number, c: number) => [number, number, number];
    readonly toHtmlWithSymbols: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toMarkdown: (a: number, b: number) => [number, number];
    readonly toMarkdownWithOptions: (a: number, b: number, c: number) => [number, number, number, number];
    readonly toPlainText: (a: number, b: number) => [number, number];
    readonly toPlainTextWithOptions: (a: number, b: number, c: number) => [number, number, number, number];
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
