---
description: How 0.2 performance will be measured, and where the 0.1 engines stood on render speed.
---

# Performance

This page is about **speed**: how fast the engines render HTML, and how they compare with the Markdown, CommonMark and Djot engines of the same language. For correctness and conformance across the implementations, see the [comparison methodology](./implementation-comparison-methodology), which measures a different axis (corpus pass rate, cross-implementation differences, extension surface).

The 0.2 reference engine and specification are still changing, and no 0.2 throughput has been measured yet. Every number on this page was measured on 0.1 engines rendering 0.1 syntax. Those figures are kept as history and as a baseline for the 0.2 rerun; they are not 0.2 results.

## Benchmark method for 0.2

Measure the same valid 0.2 source across implementations at the same spec pin. Record the source size in bytes, engine commit, runtime version, machine, command or API used, warmup, trial count and summary statistic. Keep process startup separate from in-process render time. Measure parse, HTML render and canonical formatting separately. For import, use the same HTML source and importer options.

For growth checks, use several input sizes and report both elapsed time and output agreement with the [0.2 corpus](./conformance). A fast renderer that produces a different result is not a comparable implementation. The writer's work bound and the specified limits are separate conformance requirements, not throughput claims.

See [carve-bench](https://github.com/markup-carve/carve-bench) for the cross-engine benchmark harness.

> [!NOTE]
> Throughput numbers are machine- and load-dependent. Absolute MB/s drift between runs on a loaded machine; the **ratios** between engines on the same run are the stable signal. Read the tables as "carve is roughly X% of engine Y", not as a fixed MB/s guarantee.

## 0.1 methodology

- **Input:** a document of about 48 KB of core syntax (headings, nested lists, strong, emphasis and inline code, links, a table, a block quote, a fenced code block, reference links), repeated to size. The same logical content was used for every language, so each engine read the equivalent document in its own markup.
- **Measurement:** in-process and warm (the first iterations discarded), then the minimum of five trials of an N-iteration loop. The minimum rather than the mean rejects scheduler noise on a loaded machine.
- **Metric:** `MB/s = input_bytes / wall_time`.
- **carve configuration:** core conversion with no extensions. Extensions add a small, measurable overhead.
- The throughput harnesses are kept out of this repository because they pull in every competing engine as a dependency. Cross-engine runs live in [carve-bench](https://github.com/markup-carve/carve-bench).

## Inline pairing growth probe (0.1)

On the [`0.1` branch](https://github.com/markup-carve/carve/tree/0.1), `npm run bench:inline` measures the inline pairing model of the 0.1 specification (PART 9 §9) on five generated families: unclosed combined, braced and bracket candidates; nested braced spans; and combined tokens split and read again. Each family runs at 2,048, 8,192 and 32,768 lines. The script also runs any built sibling `carve-js`, `carve-php` and `carve-rs` checkouts and compares their HTML with the model. Set `CARVE_JS_DIR`, `CARVE_PHP_DIR` or `CARVE_RS_DIR` for checkouts elsewhere. JS needs `dist/cli.js`, PHP needs `vendor/autoload.php`, and Rust needs a binary that matches the checkout. Missing checkouts are skipped. `main` does not carry this script.

For a fast smoke run, use `npm run bench:inline -- --quick`; `--model-only` skips the engines and `--family=split-combined` selects one family. Times are wall milliseconds for parse plus HTML render; engine times also include CLI startup. The probe records growth and output agreement, while the throughput figures below use a separate warm in-process method.

## Snapshot of the 0.1 engines (2026-06-22)

Each carve engine against the Djot and CommonMark engine in the same language.

| Language | carve | Djot | CommonMark |
| --- | --- | --- | --- |
| **Rust** | carve-rs **24.3** | jotdown 55.7 | comrak 58.7 / pulldown-cmark 181.4 |
| **JS** | carve-js **4.5** | djot.js 9.1 | markdown-it 19.6 |
| **PHP** | carve-php **1.08** | djot-php 1.48 | league/commonmark (GFM) 0.68 |

*MB/s, input of about 48 KB, minimum of five trials, same machine under variable load, 0.1 engines.*

Ratios on this run:

- **carve-rs** was about 44% of jotdown and about 13% of pulldown-cmark.
- **carve-js** was about 49% of djot.js and about 23% of markdown-it.
- **carve-php** was about 73% of djot-php and **about 1.6x league/commonmark**. That is the one pairing where a carve engine was faster than the same-language CommonMark engine, because league/commonmark is itself comparatively heavy.

## Why carve trails the fastest engines

carve builds a full owned AST: it parses to a node tree, optionally transforms it, then renders. That architecture makes the security defenses and the extension contract clean to implement, and 0.2 keeps it. The fastest reference engines take a different shape:

- **jotdown** and **pulldown-cmark** are near-zero-allocation event or pull parsers. They stream tokens straight to the renderer and never build a tree. That is structurally cheaper, and it is why pulldown-cmark was about 7x carve-rs.
- The 0.1 carve-rs parse phase allocated one owned `String` per text run, attribute and identifier, plus a `Vec` per container node. That allocation count, not copy volume, was the dominant cost once the render hot path was tuned.

The default path therefore stays more expensive than a pull parser. The 0.1 carve-rs and carve-js engines also exposed a conservative streaming boundary (`try_render_html_streaming` / `tryRenderHtmlStreaming`) for render-only callers. It reported when a document needed the full AST and fell back without emitting partial output, and it returned one completed HTML chunk, so it did not improve time to first byte. 0.2.0 defines no streaming renderer: `render` returns the same HTML in one string (see [Upgrading from 0.1](./upgrade-0-2)).

## Regression guards (0.1)

The 0.1 engines guarded against performance regressions in their own test suites, with thresholds rather than recorded MB/s. These files are on the `0.1` branches of the engine repositories:

- **carve-rs:** `tests/perf_regressions.rs`
- **carve-js:** `test/inline-position-perf.test.ts`, `test/table-rowspan-perf.test.ts`
- **carve-php:** `tests/benchmark/`, a runnable cross-language harness with its own `README.md`, which produces numbers on demand rather than a checked-in snapshot

**Specification (external):** [Writer, the writer and its two gates](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#the-writer-and-its-two-gates), [Limits](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/limits.json), [HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) (C2-H-111), [Upgrade guide](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md).
