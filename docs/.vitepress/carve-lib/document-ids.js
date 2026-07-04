/**
 * Document id namespace shared by explicit `{#id}` attributes, generated
 * heading ids, and extension-generated ids (tabs, code groups, citations).
 *
 * Spec: extensions contract §2.6 — extension-generated ids MUST be
 * deduplicated against explicit and heading ids with the same next-free-suffix
 * mechanism headings use. Mirrors carve-php's HeadingIdTracker::uniqueId().
 */
export class DocumentIdRegistry {
    /** id -> next 1-based suffix candidate (mirrors carve-php usedIds). */
    usedIds = new Map();
    /** Reserve an id verbatim (explicit attribute or already-assigned id). */
    reserve(id) {
        if (id !== '' && !this.usedIds.has(id))
            this.usedIds.set(id, 1);
    }
    /**
     * Reserve `baseId` in the namespace, or the next free numeric suffix
     * (`baseId-2`, `-3`, ...) when taken — skipping candidates already reserved
     * by explicit attributes or previously generated ids.
     */
    uniqueId(baseId) {
        if (!this.usedIds.has(baseId)) {
            this.usedIds.set(baseId, 1);
            return baseId;
        }
        let n = this.usedIds.get(baseId);
        let candidate;
        do {
            n++;
            candidate = `${baseId}-${n}`;
        } while (this.usedIds.has(candidate));
        this.usedIds.set(baseId, n);
        this.usedIds.set(candidate, 1);
        return candidate;
    }
}
/**
 * Seed a registry with every id already present in the resolved AST: explicit
 * `{#id}` attributes anywhere plus the heading ids assigned by
 * resolveHeadingIds. A generic deep walk keeps this exhaustive as node kinds
 * grow — the AST is a finite tree, and non-node leaves are cheap to skip.
 */
export function collectDocumentIds(doc) {
    const registry = new DocumentIdRegistry();
    const visit = (value) => {
        if (Array.isArray(value)) {
            for (const v of value)
                visit(v);
            return;
        }
        if (value === null || typeof value !== 'object')
            return;
        const attrs = value.attrs;
        if (attrs && typeof attrs.id === 'string')
            registry.reserve(attrs.id);
        for (const v of Object.values(value)) {
            if (v !== null && typeof v === 'object')
                visit(v);
        }
    };
    visit(doc);
    return registry;
}
//# sourceMappingURL=document-ids.js.map