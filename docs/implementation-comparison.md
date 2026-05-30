# Implementation Comparison

The shared comparison runner lives in `scripts/compare-impls.mjs` because this
repo owns the corpus. It compares sibling implementation checkouts against the
same `.crv` / `.html` pairs and reports default conformance, rough CLI timing,
and the extension hook surface each implementation exposes.

## Current Snapshot

Run date: 2026-05-30

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>154 / 154</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>154 / 154</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>154 / 154</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>0</strong>
    <span>cross-implementation diffs</span>
  </div>
</div>

| Implementation | Commit | Corpus | Mismatches | Errors | Avg CLI ms/file |
|----------------|--------|--------|------------|--------|-----------------|
| Rust | `b7cdda4` | `154 / 154` | `0` | `0` | `42.81` |
| JS | `48c45e0` | `154 / 154` | `0` | `0` | `76.53` |
| PHP | `b1fa677` | `154 / 154` | `0` | `0` | `100.10` |

Spec commit: `f3f138a`

## CLI Timing

These timings include process startup and should be read as smoke-level CLI
performance, not parser microbenchmarks.

<div class="impl-chart" aria-label="Average CLI milliseconds per corpus file">
  <div class="impl-chart-row">
    <span>Rust</span>
    <div><i style="width: 42.8%"></i></div>
    <code>42.81 ms</code>
  </div>
  <div class="impl-chart-row">
    <span>JS</span>
    <div><i style="width: 76.5%"></i></div>
    <code>76.53 ms</code>
  </div>
  <div class="impl-chart-row">
    <span>PHP</span>
    <div><i style="width: 100%"></i></div>
    <code>100.10 ms</code>
  </div>
</div>

## Extension Surface

The comparison run is `default/no-opt-in`, so extension behavior is not yet
exercised across every min/max profile. This matrix records the hook surface
available in each implementation today.

| Capability | Rust | JS | PHP |
|------------|------|----|-----|
| Inline matcher | yes | no | yes |
| Block matcher | yes | no | yes |
| After-parse transform | yes | yes | yes |
| Before-render transform | yes | yes | yes |
| Inline extension renderer | yes | yes | yes |
| Block extension renderer / render listener | yes | no | yes |
| Converter-level registration | no | no | yes |

## Running It

```bash
npm run compare:impls
npm run compare:impls -- --limit=20 --bench
```

By default the script expects sibling checkouts:

- `../carve-rs`
- `../carve-js`
- `../carve-php`

Override those paths with `CARVE_RS_DIR`, `CARVE_JS_DIR`, and `CARVE_PHP_DIR`.

The documented snapshot used:

```bash
CARVE_RS_DIR=/media/mark/data/work/git/carve-rs \
CARVE_JS_DIR=/media/mark/data/work/git/carve-js \
CARVE_PHP_DIR=/media/mark/data/work/git/carve-php \
node scripts/compare-impls.mjs
```

Raw output:

```text
Implementation summary
profile=default/no-opt-in corpus=core corpus_pairs=154
rust: pass=154/154 mismatch=0 error=0 avg_ms=42.81
js: pass=154/154 mismatch=0 error=0 avg_ms=76.53
php: pass=154/154 mismatch=0 error=0 avg_ms=100.10
cross_impl_diffs=0

Extension capability matrix
rust: inline matcher, block matcher, after_parse, before_render, inline extension renderer, block extension renderer
js: afterParse, beforeRender, inline extension renderer
php: inline matcher, block matcher, parsed-document hook, before-render hook, render listeners, converter registration
extension_profile_note=this run compares default/no-opt-in output. Optional Tier-2 and app-extension max profiles need per-language adapter fixtures.
```

## Scope

The current tool is the minimum/default profile:

- It runs the mandatory Tier-1 corpus in `tests/corpus`.
- It compares byte-identical output after trimming.
- It reports CLI-level average time per corpus file.
- It reports extension system surface area, not behavior under every possible
  extension configuration.

The maximum/opt-in profile still needs language-specific adapter fixtures. That
means a small runner per implementation that enables the same Tier-2 features
or test extension in each language, then feeds those through the same comparison
loop.
