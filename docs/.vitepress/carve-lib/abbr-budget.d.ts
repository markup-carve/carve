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
/** UTF-8 byte length of a string (browser-safe; matches PHP's strlen). */
export declare function utf8ByteLength(s: string): number;
/** Base budget floor in bytes (applies even for empty/zero-length sources). */
export declare const ABBR_BUDGET_BASE = 1000000;
/** Budget grows this many bytes per source byte. */
export declare const ABBR_BUDGET_FACTOR = 8;
/** Compute the per-render expansion budget from the source byte length. */
export declare function abbrBudget(srcByteLength: number | undefined): number;
/**
 * Mutable per-render tracker. `charge(expansion)` returns true if emitting
 * `expansion` stays within budget (and accounts for it); false once the budget
 * is exhausted, signalling the renderer to degrade to plain key text.
 */
export declare class AbbrBudget {
    private remaining;
    constructor(srcByteLength: number | undefined);
    /**
     * Try to spend `cost` bytes of budget. Returns true if it fit (and the
     * budget was decremented); false if it would overflow (budget untouched, so
     * a later shorter expansion could still fit - though in practice all
     * occurrences share one expansion, this keeps the bound monotonic).
     */
    charge(cost: number): boolean;
}
//# sourceMappingURL=abbr-budget.d.ts.map