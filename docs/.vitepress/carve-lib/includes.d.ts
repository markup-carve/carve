import type { Document } from './ast.js';
/** Warning emitted by {@link expandIncludes}. */
export interface IncludeWarning {
    /** 1-based line number when source positions are available. */
    line: number;
    /** 1-based column number when source positions are available. */
    column: number;
    /** Stable rule id, e.g. "include-cycle". */
    rule: string;
    /** Human-readable explanation of the include degradation or rename. */
    message: string;
    /** 0-based start offset in the parent source, inclusive. */
    start: number;
    /** 0-based end offset in the parent source, exclusive. */
    end: number;
}
export interface IncludeContext {
    /** Identity of the including document, supplied by the host when known. */
    sourcePath?: string;
    /**
     * Include chain, root first: each entry is the canonical id a resolver
     * returned for that file ({@link IncludeResolved}), or the raw directive
     * path when the resolver returned plain source. Used for relative
     * resolution and cycle guards.
     */
    stack: string[];
    /** Zero-based include depth of the directive being resolved. */
    depth: number;
}
/**
 * Resolver result: plain source text, or source plus a canonical id for the
 * resolved file. The id feeds cycle detection and becomes the parent entry in
 * {@link IncludeContext.stack} for nested resolves, so resolvers that map
 * paths to files (filesystem, VFS) should return one; without it two
 * spellings of the same file ("b.crv" vs "./b.crv") defeat the cycle guard
 * and only the depth limit stops the recursion.
 */
export type IncludeResolved = string | {
    source: string;
    id?: string;
};
export interface IncludeOptions {
    /** Resolve an include path to source text. Return null for an unresolvable path. */
    resolve?: (path: string, ctx: IncludeContext) => IncludeResolved | null;
    /** Identity of the root document, passed to the first resolver call as context. */
    sourcePath?: string;
    /** Maximum transitive include depth. Default 16. */
    maxDepth?: number;
    /** Expanded child source byte budget. Default max(1 MB, 8 x root source bytes). */
    maxBytes?: number;
}
/**
 * One include target touched during expansion. Hosts key file watchers off
 * `id`, so unresolved targets are reported too: a preview that watched only
 * successful reads would never notice a missing `{{ chapter-3.crv }}` being
 * created and would stay stale.
 */
export interface IncludeDependency {
    /**
     * The resolver's canonical id when it supplied one (the identity the cycle
     * guard uses), otherwise the directive path as written.
     */
    id: string;
    /** True when the resolver produced source text for this target. */
    resolved: boolean;
}
export interface IncludeResult {
    doc: Document;
    warnings: IncludeWarning[];
    /**
     * Every include target touched during the whole recursive expansion,
     * nested children included, de-duplicated and in first-encounter order.
     * Intended for preview invalidation: re-run the expansion when any of
     * these paths changes. Empty when no resolver was supplied.
     */
    dependencies: IncludeDependency[];
}
export interface FileSystemResolverOptions {
    /** Allow absolute include paths after root containment checks. Default false. */
    allowAbsolute?: boolean;
}
export type IncludeResolver = (path: string, ctx: IncludeContext) => IncludeResolved | null;
/**
 * Expand processor-level `{{ ... }}` include directives in an already-parsed AST.
 *
 * With no resolver, directives remain ordinary text and no warnings are emitted.
 */
export declare function expandIncludes(doc: Document, source: string, options?: IncludeOptions): IncludeResult;
/** Filesystem resolver with canonical root-containment checks for trusted hosts. */
export declare function fileSystemResolver(root: string, opts?: FileSystemResolverOptions): IncludeResolver;
//# sourceMappingURL=includes.d.ts.map