import type { Document, InlineNode } from './ast.js';
/**
 * The automatic-identifier rule. Pure, context-free, no dedup.
 *
 * Default follows jgm/djot#393 (case + non-ASCII preserved). With `asciiFold`
 * (opt-in via the `asciiHeadingIds` parse option) the slug is transliterated to
 * ASCII for URL/CSS-fragment portability and re-slugged.
 */
export declare function slugify(plainText: string, asciiFold?: boolean): string;
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
export declare function resolveHeadingIds(doc: Document, asciiFold?: boolean): Document;
//# sourceMappingURL=heading-ids.d.ts.map