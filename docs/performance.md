# Performance

Where the three reference implementations stand on raw HTML-rendering
throughput, how they compare to their Markdown / CommonMark / Djot
counterparts, and a log of what has been optimized (and what was deliberately
ruled out).

This page is about **speed**. For **correctness and conformance** across the
implementations, see [Implementation Comparison](/implementation-comparison),
which is a different axis (corpus pass rate, cross-implementation diffs,
extension-hook surface).

> [!NOTE]
> Throughput numbers are **machine- and load-dependent**. Absolute MB/s drift
> between runs on a loaded machine; the **ratios** between engines on the same
> run are the stable signal. Treat the tables as "carve is roughly X% of
> engine Y", not as a fixed MB/s guarantee.

## Methodology

- **Input:** a ~48 KB document of core syntax (headings, nested lists,
  `**bold**` / `*italic*` / `` `code` ``, links, a GFM table, a blockquote,
  a fenced code block, reference links) repeated to size. The same logical
  content is used for every language so the comparison is apples-to-apples.
- **Measurement:** in-process, warm (discard the first iterations), then
  min-of-5-trials of an N-iteration loop. Minimum (not mean) is used to reject
  scheduler noise on a loaded machine.
- **Metric:** `MB/s = input_bytes / wall_time`.
- **carve config:** core conversion (no extensions). Extensions add a roughly
  measurable but small overhead; see the optimization log below.
- The benchmark harnesses themselves are kept out of this repo (they pull in
  every competing engine as a dependency). Each implementation ships its own
  regression guard instead, listed under [Regression guards](#regression-guards).

## Snapshot (2026-06-22)

Each carve engine against the Djot and CommonMark engine in the same language.

| Language | carve | Djot | CommonMark |
| --- | --- | --- | --- |
| **Rust** | carve-rs **24.3** | jotdown 55.7 | comrak 58.7 / pulldown-cmark 181.4 |
| **JS** | carve-js **4.5** | djot.js 9.1 | markdown-it 19.6 |
| **PHP** | carve-php **1.08** | djot-php 1.48 | league/commonmark (GFM) 0.68 |

*MB/s, ~48 KB input, min-of-5, same machine (variable load).*

Ratios on this run:

- **carve-rs** = ~44% of jotdown, ~13% of pulldown-cmark.
- **carve-js** = ~49% of djot.js, ~23% of markdown-it.
- **carve-php** = ~73% of djot-php, and **~1.6x league/commonmark** (the one
  pairing where a carve engine is faster than the same-language CommonMark
  engine, because league/commonmark is itself comparatively heavy).

## Why carve trails the fastest engines

carve builds a **full owned AST** (parse to a node tree, optionally transform
it, then render), which is the architecture that makes the security defenses
and the extension contract clean to implement. The fastest reference engines
take a different shape:

- **jotdown** and **pulldown-cmark** are near-zero-allocation event / pull
  parsers: they stream tokens straight to the renderer and never materialize a
  tree. That is structurally cheaper, and it is why pulldown-cmark is ~7x
  carve-rs.
- carve's parse phase allocates one owned `String` per text run, attribute,
  and identifier, plus a `Vec` per container node. That allocation count, not
  copy volume, is the dominant cost once the render hot path is tuned.

So carve's ceiling, short of an architectural rewrite, sits below the pull
parsers by design. The optimization work below closes the gap that is
*not* architectural.

## Optimization log

### carve-rs: render hot path ([carve-rs #121](https://github.com/markup-carve/carve-rs/pull/121))

The render phase dominated both allocation count and time. The fix kept the
AST architecture and removed throwaway-`String` allocation from rendering:

| metric | before | after |
| --- | --- | --- |
| render allocations / doc | 78.5k | 16.5k |
| render throughput | 14.5 MB/s | 52.4 MB/s |
| total `to_html` throughput | 11.8 MB/s | **22.9 MB/s (1.94x)** |

- `smart_text_after` returns `Cow` and short-circuits when a text node
  contains no smart-typography / escape trigger character. The old code ran an
  unconditional 16-entry replacement chain per text node, and `str::replace`
  allocates even on no match. **The single largest win.**
- `write_escaped_text` / `write_escaped_attr` scan by byte and write directly
  into the output buffer instead of formatting into a temporary `String` per
  node and per attribute.
- `sanitize_attr_value` / `sanitize_url` return `Cow` so the pass-through case
  borrows instead of cloning.

### carve-php: extension inline-matcher gating ([carve-php #214](https://github.com/markup-carve/carve-php/pull/214))

The inline scanner ran every registered extension matcher at every scan
position. Trigger-byte gating skips a matcher unless the current byte can
start one of its patterns:

- `patternFirstByte` became `patternFirstBytes` returning the full set of
  bytes a pattern can start with (handling alternation, quantifiers, POSIX
  classes, and flags correctly).
- A null trigger set means "runs everywhere" and also disables the global
  fast-skip, so only genuinely run-everywhere matchers pay the full cost.
- Result: wikilinks and citations dropped from ~90 ms of added scan time to
  near zero; full-extension throughput up ~15%.

## Ruled-out levers

Recorded so they are not re-explored. All were investigated against carve-rs.

| Lever | Verdict | Why |
| --- | --- | --- |
| **Borrow input into the AST** (`&'a str` / `Cow` node payloads) | Rejected | Text is unescaped at *render* time and link/image titles plus attribute values are unescaped at *parse* time, so most payloads cannot be a verbatim input slice. Every extension also synthesizes new text (anchors, TOC, flattened summaries). It would recover only ~10-20% of parse allocations while forcing a viral lifetime through `Document`, `Options`, and every extension - a semver-major break - for no measured throughput gain. |
| **`CompactString`** (inline strings <=24 bytes) | Rejected | Prototyped: cut total allocations ~7% (34.4k to 31.9k), byte-identical, full corpus green - but **zero throughput change** (the construct/deref branch cost cancels the alloc-count saving) at the cost of a new dependency and churn across ~20 files. Safe but pointless as a speed play. |
| **`SmallVec` for node children** | Rejected | The inline/block node enums are recursive, so `SmallVec<[InlineNode; N]>` is infinitely sized (E0072) without `Box` (which re-adds an allocation). On the only non-recursive leaf `Vec`s it ballooned `BlockNode` from 288 to 400 bytes with no alloc-count cut and a throughput regression from worse cache behavior. |

## Remaining lever (untried)

The only path with real upside left is **arena / bump allocation** (e.g.
`bumpalo`): allocate the whole node tree and its strings in one bump arena so
each allocation is a near-free pointer bump and the entire tree is freed in one
shot. This keeps owned semantics (no input borrowing) but is a genuine rewrite
of how the AST is owned, larger than anything attempted so far. Not scheduled.

## Regression guards

Each implementation guards against perf regressions in its own test suite
(thresholds, not recorded MB/s):

- **carve-rs:** `tests/perf_regressions.rs`
- **carve-js:** `test/inline-position-perf.test.ts`,
  `test/table-rowspan-perf.test.ts`
- **carve-php:** `tests/benchmark/` (a runnable cross-language harness with its
  own `README.md`; produces numbers on demand rather than a checked-in
  snapshot)
