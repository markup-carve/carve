import type { Document } from './ast.js';
/**
 * Document id namespace shared by explicit `{#id}` attributes, generated
 * heading ids, and extension-generated ids (tabs, code groups, citations).
 *
 * Spec: extensions contract §2.6 — extension-generated ids MUST be
 * deduplicated against explicit and heading ids with the same next-free-suffix
 * mechanism headings use. Mirrors carve-php's HeadingIdTracker::uniqueId().
 */
export declare class DocumentIdRegistry {
    /** id -> next 1-based suffix candidate (mirrors carve-php usedIds). */
    private usedIds;
    /** Reserve an id verbatim (explicit attribute or already-assigned id). */
    reserve(id: string): void;
    /**
     * Reserve `baseId` in the namespace, or the next free numeric suffix
     * (`baseId-2`, `-3`, ...) when taken — skipping candidates already reserved
     * by explicit attributes or previously generated ids.
     */
    uniqueId(baseId: string): string;
}
/**
 * Seed a registry with every id already present in the resolved AST: explicit
 * `{#id}` attributes anywhere plus the heading ids assigned by
 * resolveHeadingIds. A generic deep walk keeps this exhaustive as node kinds
 * grow — the AST is a finite tree, and non-node leaves are cheap to skip.
 */
export declare function collectDocumentIds(doc: Document): DocumentIdRegistry;
//# sourceMappingURL=document-ids.d.ts.map