/* tslint:disable */
/* eslint-disable */

export function toHtml(source: string): string;

/**
 * Render with the demo-useful built-in Carve extensions enabled
 * (tab-normalize, details, Mermaid, wikilinks, autolink). Lets the WASM engine
 * match an extensions-on host (e.g. the docs Playground) instead of the
 * core-only `toHtml`.
 *
 * Deliberately excludes table-of-contents and heading-permalinks (they
 * auto-inject a TOC / mutate headings, which clutters a preview), and
 * external-links / citations (no visible effect without config). This mirrors
 * the JS Playground's extension set, minus the code-group / tabs extensions
 * that carve-rs does not implement.
 */
export function toHtmlFull(source: string): string;

export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly toHtml: (a: number, b: number) => [number, number];
    readonly toHtmlFull: (a: number, b: number) => [number, number];
    readonly version: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
