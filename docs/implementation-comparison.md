# Implementation Comparison

The shared comparison runner lives in `scripts/compare-impls.mjs` because this
repo owns the corpus. It compares sibling implementation checkouts against the
same `.crv` / `.html` pairs and reports default conformance, optional Tier-2
adapter coverage, rough CLI timing, and the extension hook surface each
implementation exposes.

## Snapshot (2026-06-19)

> Run on 2026-06-19 with all three implementations built from their current
> `main`. Regenerate any time with `npm run compare:impls`. The figures below
> are that run; the core corpus has since grown (402 pairs at time of writing),
> so treat the counts as a historical snapshot, not a live total.

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>302 / 302</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>302 / 302</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>302 / 302</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>0</strong>
    <span>cross-implementation diffs</span>
  </div>
</div>

| Implementation | Commit | Corpus | Mismatches | Errors | Avg CLI ms/file |
|----------------|--------|--------|------------|--------|-----------------|
| Rust | `dd0f150` | `302 / 302` | `0` | `0` | `23.47` |
| JS | `f54a860` | `302 / 302` | `0` | `0` | `51.22` |
| PHP | `b8b3e58` | `302 / 302` | `0` | `0` | `53.20` |

Spec commit: `7c41ccc`

## Optional Tier-2 Profile

The optional profile enables a shared adapter per feature where each
implementation exposes one. Unsupported feature/implementation combinations are
reported as skipped, not failures.

| Feature | Rust | JS | PHP |
|---------|------|----|-----|
| Social link templates | pass | pass | pass |
| Symbol map | pass | pass | skipped¹ |
| German smart quotes | skipped | skipped | pass |
| Bare URL autolink | skipped | skipped | pass |

¹ As of this 2026-06-19 snapshot the `symbol-map` case was still skipped for
PHP. PHP has since shipped `:name:` symbols (canonical name shape, word-boundary
guard, attribute wrapper, and a `symbols` render map; carve#258), so a fresh
`npm run compare:impls` run now reports it as passing for all three engines.

| Implementation | Optional pass | Skipped | Mismatches | Errors | Avg CLI ms/file |
|----------------|---------------|---------|------------|--------|-----------------|
| Rust | `2 / 2` | `2` | `0` | `0` | `24.42` |
| JS | `2 / 2` | `2` | `0` | `0` | `48.94` |
| PHP | `3 / 3` | `1` | `0` | `0` | `52.87` |

Optional cross-implementation diffs: `0`

## CLI Timing

These timings include process startup and should be read as smoke-level CLI
performance, not parser microbenchmarks.

<div class="impl-chart" aria-label="Average CLI milliseconds per corpus file">
  <div class="impl-chart-row">
    <span>Rust</span>
    <div><i style="width: 44.1%"></i></div>
    <code>23.47 ms</code>
  </div>
  <div class="impl-chart-row">
    <span>JS</span>
    <div><i style="width: 96.3%"></i></div>
    <code>51.22 ms</code>
  </div>
  <div class="impl-chart-row">
    <span>PHP</span>
    <div><i style="width: 100%"></i></div>
    <code>53.20 ms</code>
  </div>
</div>

## Extension Surface

The comparison run is `default/no-opt-in`, so extension behavior is not yet
exercised across every min/max profile. This matrix records the hook surface
available in each implementation today.

| Capability | Rust | JS | PHP |
|------------|------|----|-----|
| Inline matcher | yes | yes | yes |
| Block matcher | yes | yes | yes |
| After-parse transform | yes | yes | yes |
| Before-render transform | yes | yes | yes |
| Inline extension renderer | yes | yes | yes |
| Block extension renderer / render listener | yes | yes | yes |
| Converter-level registration | no | no | yes |

## Running It

```bash
npm run compare:impls
npm run compare:impls -- --corpus=optional
npm run compare:impls -- --limit=20 --bench
npm run compare:impls -- --targets=html          # fast path, HTML only
```

### Targets

The runner compares every render target, not just HTML: `--targets=all` (the
default) covers `html`, `markdown`, `plain`, `carve` and `ansi`. Pass a
comma-separated subset to narrow it.

In the core corpus only `html` has expected-output fixtures. The other four are
compared **implementation against implementation**, because identical output
across the three engines is the invariant that matters there, and committing
four more expected files per corpus case would not add to it. The `Target
agreement` block in the output reports per-target `compared` / `diffs` /
`errors` counts, and each disagreement prints a `DIFF [target] slug` line naming
the engines that ran. `cross_impl_diffs` is the total across every target
compared, not the HTML count.

Comparison is trailing-newline-insensitive, matching the corpus runner and the
profile parity battery: renderers legitimately differ on a final `\n`, so a
byte-strict comparison would flag that known difference on every case and bury
the real divergences.

Running all five targets costs roughly five times a single-target run, since
every case is a fresh process per engine per target. Use `--targets=html` for a
quick check and `--limit=` while iterating.

The optional corpus works the other way round: a case pins its own target in
[`manifest.json`](https://github.com/markup-carve/carve/blob/main/tests/corpus-optional/manifest.json)
and carries the expected file for it (`html` unless the entry says otherwise -
see [the corpus README](https://github.com/markup-carve/carve/blob/main/tests/corpus-optional/README.md)).
Each case runs on the target it pins, so every optional target is scored against
a fixture, and `--targets` filters which cases run rather than overriding what
they render. A run that filters cases out reports `filtered_out=` so the pair
count does not read as "all of these ran".

A feature adapter that is not wired for the pinned target reports no adapter and
the case is skipped for that engine, the same visible skip an unsupported
feature gets. That is why the PHP adapters, which drive `CarveConverter::convert()`
and so speak HTML, sit out the Markdown-target cases.

### Generated documents

`compare-impls` runs the committed corpus - documents somebody wrote.
`npm run property:check` generates documents nobody wrote, from an alphabet of
construct fragments, and asserts the two PART 11 invariants over them:

```bash
npm run property:check                      # invariants only, vendored engine
npm run property:check -- --engines         # also compare the three writers
npm run property:check -- --count=2000 --seed=7
```

It is deterministic by seed, so a failure is reproducible and one build's counts
are comparable against another's - which is how it is used: run it against a
branch and against the base, and compare, rather than reading the absolute
number as a pass/fail.

The reason it exists is that the corpus cannot reach some shapes. Generated
input combines constructs at indentations a human would not type, and that is
where the writer's normalization changes meaning. Its first run surfaced 48
invariant failures (carve#359) and 41 cross-engine divergences (carve#352) that
the corpus had not.

By default the script expects sibling checkouts:

- `../carve-rs`
- `../carve-js`
- `../carve-php`

Override those paths with `CARVE_RS_DIR`, `CARVE_JS_DIR`, and `CARVE_PHP_DIR`.

The documented snapshot used:

```bash
CARVE_RS_DIR=../carve-rs \
CARVE_JS_DIR=../carve-js \
CARVE_PHP_DIR=../carve-php \
node scripts/compare-impls.mjs
```

Default raw output:

```text
Implementation summary
profile=default/no-opt-in corpus=core corpus_pairs=302
rust: pass=302/302 mismatch=0 error=0 skipped=0 avg_ms=23.47
js: pass=302/302 mismatch=0 error=0 skipped=0 avg_ms=51.22
php: pass=302/302 mismatch=0 error=0 skipped=0 avg_ms=53.20
cross_impl_diffs=0

Extension capability matrix
rust: inline matcher, block matcher, after_parse, before_render, inline extension renderer, block extension renderer
js: inline matcher, block matcher, afterParse, beforeRender, inline extension renderer, block extension renderer
php: inline matcher, block matcher, parsed-document hook, before-render hook, render listeners, converter registration
extension_profile_note=this run compares default/no-opt-in output. Use --corpus=optional for Tier-2 opt-in adapters.
```

Optional raw output:

> **Note:** the snapshot below is from 2026-06-19 (4 optional corpus pairs).
> The optional corpus has since grown to 31 pairs (citations-numbered enrichment
> cases 13-24 for typed locators, integral marker, and suppress-author; code
> callouts cases 10-12; trailing-comma case 24; the Markdown-target cases 30-31).
> The `Optional feature coverage` block also names each case's pinned target now
> (`feature (target): engines`), and the summary line carries a `targets=` field.
> Regenerate with `npm run compare:impls -- --corpus=optional` to get current
> counts.

```text
Implementation summary
profile=optional/opt-in corpus=optional corpus_pairs=4
rust: pass=2/2 mismatch=0 error=0 skipped=2 avg_ms=24.42
js: pass=2/2 mismatch=0 error=0 skipped=2 avg_ms=48.94
php: pass=3/3 mismatch=0 error=0 skipped=1 avg_ms=52.87
cross_impl_diffs=0

Optional feature coverage
social-link-templates: rust, js, php
symbol-map: rust, js
smart-quotes-locale-de: php
bare-url-autolink: php
```

## Scope

The tool has two profiles:

- It runs the mandatory Tier-1 corpus in `tests/corpus`.
- It runs optional Tier-2 adapters in `tests/corpus-optional` with
  `--corpus=optional`.
- It compares byte-identical output after trimming.
- It reports CLI-level average time per corpus file.
- It reports extension system surface area.

Tier-3 app-extension max profiles still need language-specific adapter fixtures.
That means a small runner per implementation that enables the same test
extension in each language, then feeds those through the same comparison loop.
