# Performance

Where the three reference implementations stand on raw HTML-rendering
throughput, and how they compare to their Markdown / CommonMark / Djot
counterparts in the same language.

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
- **carve config:** core conversion (no extensions). Extensions add a small,
  measurable overhead.
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
parsers by design.

## Regression guards

Each implementation guards against perf regressions in its own test suite
(thresholds, not recorded MB/s):

- **carve-rs:** `tests/perf_regressions.rs`
- **carve-js:** `test/inline-position-perf.test.ts`,
  `test/table-rowspan-perf.test.ts`
- **carve-php:** `tests/benchmark/` (a runnable cross-language harness with its
  own `README.md`; produces numbers on demand rather than a checked-in
  snapshot)
