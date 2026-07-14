import type { BlockNode, Document, InlineNode } from './ast.js';
/**
 * Public opt-in for ASCII heading ids. `true` / `'fold'` is best-effort
 * transliteration (non-ASCII the map can't handle is kept verbatim); `'strict'`
 * additionally drops that unmappable residue so the id is guaranteed pure ASCII.
 */
export type AsciiHeadingIdMode = boolean | 'fold' | 'strict';
/**
 * Translate the public `asciiHeadingIds` / `lowercaseHeadingIds` options into
 * the `slugify` flags. Shared by `resolve()` and `lintCarve` so the lint id set
 * matches the resolver exactly.
 */
export declare function headingIdSlugOpts(opts: {
    asciiHeadingIds?: AsciiHeadingIdMode;
    lowercaseHeadingIds?: boolean;
}): {
    lowercase: boolean;
    asciiFold: boolean;
    asciiStrict: boolean;
};
/**
 * The automatic-identifier rule. Pure, context-free, no dedup.
 *
 * Default is CASE-PRESERVING with no Unicode normalization or case folding:
 * the jgm/djot#393 run-replacement over the raw code points, keeping non-ASCII
 * verbatim (e.g. a German heading keeps its umlaut). Zero-dependency and
 * byte-identical across implementations, matching djot's "no Unicode tables"
 * identifier model. Cross-reference resolution is case-insensitive (see
 * resolveHeadingIds), so `</#getting-started>` still resolves to the
 * case-preserved `Getting-Started` id. Three opt-in, orthogonal transforms:
 * `lowercase` (GitHub/SSG-style anchors, folded per code point so no
 * context mapping such as Greek final-sigma applies); `asciiFold`
 * (transliterate the slug to ASCII for share-safe URL fragments, best-effort -
 * unmappable scripts are kept); and `asciiStrict` (implies `asciiFold`, also
 * drops the unmappable residue for a guaranteed pure-ASCII slug). Combine with
 * `lowercase` for a fully lowercase ASCII slug.
 */
export declare function slugify(plainText: string, opts?: {
    lowercase?: boolean;
    asciiFold?: boolean;
    asciiStrict?: boolean;
}): string;
/**
 * Visible plain text of an inline run (markup stripped).
 *
 * A reference-link placeholder (Link with `ref` still set) contributes
 * its `children` text just like a resolved Link — both for heading-id
 * derivation and for the implicit-heading-ref key. This matches the
 * cross-impl behavior in carve-php's CarveConverter: a heading
 * `# [Title][maybe]` slugs to `title` regardless of whether `maybe`
 * resolves, so an implicit `[Title][]` can target it consistently.
 */
export declare function inlineText(nodes: InlineNode[]): string;
/**
 * Assign heading ids (explicit verbatim wins, auto slugified, 1-based
 * dedup in a shared document-order namespace) and resolve </#id>
 * crossrefs (first-occurrence target, link text cloned from the target
 * heading; unresolved -> literal text). Mutates and returns `doc`.
 */
export declare function resolveHeadingIds(doc: Document, opts?: {
    lowercase?: boolean;
    asciiFold?: boolean;
    asciiStrict?: boolean;
}): Document;
/**
 * Promote a paragraph whose sole child is a (resolved) image to a block-level
 * image, matching the standalone inline-image rule and carve-php. A reference
 * image resolves AFTER the syntactic block-image check, so it arrives here as a
 * one-image paragraph; an unresolved ref already became a Text node, so its
 * paragraph is left untouched (renders as a literal `<p>`). A one-image
 * paragraph followed by a `^ …` caption becomes a <figure>.
 *
 * Exported so `carve fmt` (carveToCarve) can apply it too: without the figure
 * promotion the caption stays a paragraph `[Image, SoftBreak, "^ …"]` and the
 * serializer escapes the leading `^` to `\^`, which only carve-js's lenient
 * parser reads back as a caption (carve-rs / carve-php read it literally,
 * losing the figure). Emitting the promoted figure yields a portable
 * unescaped `^ …` line, matching carve-php.
 */
export declare function promoteBlockImages(blocks: BlockNode[], figuresOnly?: boolean): void;
//# sourceMappingURL=heading-ids.d.ts.map