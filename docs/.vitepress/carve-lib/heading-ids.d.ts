import type { Document, InlineNode } from './ast.js';
/** The 9-step automatic-identifier rule. Pure, context-free, no dedup. */
export declare function slugify(plainText: string): string;
/** Visible plain text of an inline run (markup stripped). */
export declare function inlineText(nodes: InlineNode[]): string;
/**
 * Assign heading ids (explicit verbatim wins, auto slugified, 1-based
 * dedup in a shared document-order namespace) and resolve </#id>
 * crossrefs (first-occurrence target, link text cloned from the target
 * heading; unresolved -> literal text). Mutates and returns `doc`.
 */
export declare function resolveHeadingIds(doc: Document): Document;
//# sourceMappingURL=heading-ids.d.ts.map