# Implementation Comparison

The shared comparison runner lives in `scripts/compare-impls.mjs` because this
repo owns the corpus. It compares sibling implementation checkouts against the
same `.crv` / `.html` pairs and reports default conformance, rough CLI timing,
and the extension hook surface each implementation exposes.

```bash
npm run compare:impls
npm run compare:impls -- --limit=20 --bench
```

By default the script expects sibling checkouts:

- `../carve-rs`
- `../carve-js`
- `../carve-php`

Override those paths with `CARVE_RS_DIR`, `CARVE_JS_DIR`, and `CARVE_PHP_DIR`.

## Latest Local Run

Run date: 2026-05-30

Repos:

| Repo | Commit |
|------|--------|
| `carve` | `f3f138a` |
| `carve-rs` | `b7cdda4` |
| `carve-js` | `48c45e0` |
| `carve-php` | `b1fa677` |

Command:

```bash
CARVE_RS_DIR=/media/mark/data/work/git/carve-rs \
CARVE_JS_DIR=/media/mark/data/work/git/carve-js \
CARVE_PHP_DIR=/media/mark/data/work/git/carve-php \
node scripts/compare-impls.mjs
```

Result:

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
- It reports CLI-level average time per corpus file. This includes process
  startup, so use it as smoke-level performance data only.
- It reports extension system surface area, not behavior under every possible
  extension configuration.

The maximum/opt-in profile still needs language-specific adapter fixtures. That
means a small runner per implementation that enables the same Tier-2 features
or test extension in each language, then feeds those through the same comparison
loop.
