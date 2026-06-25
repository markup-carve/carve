/**
 * Abbreviation-expansion output budget (DoS guard).
 *
 * Each occurrence of an abbreviation re-emits its full expansion
 * (`<abbr title="EXPANSION">KEY</abbr>` in HTML, a raw `<abbr>` in Markdown,
 * `(EXPANSION)` in ANSI). A tiny input that defines a huge expansion
 * (`*[KEY]: <50KB>`) and uses the key many times amplifies output by
 * expansion_len x occurrences - up to thousands of times - and can exceed
 * V8's max string length (`RangeError: Invalid string length`), crashing the
 * render. We bound the cumulative bytes contributed by expansions across a
 * single render: once the next occurrence would exceed the budget, that
 * occurrence (and all later ones) degrade gracefully to the plain key text
 * only (no `<abbr>` wrapper, no title). No throw, no giant allocation.
 *
 * Budget = max(BASE, FACTOR * sourceByteLength). This is far above any real
 * document and above every spec-corpus fixture, so the corpus is unaffected.
 *
 * Each occurrence is charged the RAW UTF-8 byte length of `expansion` (not the
 * HTML/Markdown-escaped form). This is deliberate: the same charge unit is used
 * by carve-rs and carve-php so all three impls degrade at the exact same
 * occurrence, keeping output cross-impl-aligned. An escape-heavy expansion
 * (e.g. all `&`, which inflates ~5x to `&amp;`) can therefore overshoot the
 * budget by that constant escape factor - a benign linear overage (a 1MB
 * budget tops out near ~5MB), nowhere near V8's max string length. The crash
 * DoS this guards against requires unbounded amplification, which the byte
 * cap removes regardless of the escape factor.
 *
 * The counter is per render call. A renderer constructs a fresh tracker at its
 * top-level entry; it must never leak across calls.
 */
// Shared encoder for UTF-8 byte counting. `Buffer` is Node-only; carve-js
// runs in browsers too (the playground), so the byte length must be computed
// with the universal TextEncoder, matching the rest of the public pipeline.
const UTF8_ENCODER = new TextEncoder();
/** UTF-8 byte length of a string (browser-safe; matches PHP's strlen). */
export function utf8ByteLength(s) {
    return UTF8_ENCODER.encode(s).length;
}
/** Base budget floor in bytes (applies even for empty/zero-length sources). */
export const ABBR_BUDGET_BASE = 1_000_000;
/** Budget grows this many bytes per source byte. */
export const ABBR_BUDGET_FACTOR = 8;
/** Compute the per-render expansion budget from the source byte length. */
export function abbrBudget(srcByteLength) {
    return Math.max(ABBR_BUDGET_BASE, ABBR_BUDGET_FACTOR * (srcByteLength ?? 0));
}
/**
 * Mutable per-render tracker. `charge(expansion)` returns true if emitting
 * `expansion` stays within budget (and accounts for it); false once the budget
 * is exhausted, signalling the renderer to degrade to plain key text.
 */
export class AbbrBudget {
    remaining;
    constructor(srcByteLength) {
        this.remaining = abbrBudget(srcByteLength);
    }
    /**
     * Try to spend `cost` bytes of budget. Returns true if it fit (and the
     * budget was decremented); false if it would overflow (budget untouched, so
     * a later shorter expansion could still fit - though in practice all
     * occurrences share one expansion, this keeps the bound monotonic).
     */
    charge(cost) {
        if (cost > this.remaining)
            return false;
        this.remaining -= cost;
        return true;
    }
}
//# sourceMappingURL=abbr-budget.js.map