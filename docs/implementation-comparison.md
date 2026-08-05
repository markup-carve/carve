# Implementation Comparison

The shared comparison runner lives in `scripts/compare-impls.mjs` because this
repo owns the corpus. It compares sibling implementation checkouts against the
same `.crv` / `.html` pairs and reports default conformance, optional Tier-2
adapter coverage, rough CLI timing, and the extension hook surface each
implementation exposes.

## Snapshot (2026-08-04)

> Run with all three implementations built from their own `main`. Regenerate any
> time with `npm run compare:impls`. Timings are from one machine and mean
> nothing across rows; the counts are the point, and
> `tests/implementation-comparison-counts.test.mjs` fails when they stop
> matching the corpus - which is how this page came to quote 302 pairs against a
> corpus of 529, and again at 531, 532, 533, 535, 536, 539, 542, 544, 547, 548, 550, 552, 553, 554, 557, 562, 564, 567, 571 and 580.

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>590 / 590</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>590 / 590</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>590 / 590</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>0</strong>
    <span>cross-implementation diffs</span>
  </div>
</div>

| Implementation | Commit | Corpus | Mismatches | Errors | Avg CLI ms/file |
|----------------|--------|--------|------------|--------|-----------------|
| Rust | `dd73999` | `590 / 590` | `0` | `0` | `2.48` |
| JS | `d1699f3` | `590 / 590` | `0` | `0` | `61.39` |
| PHP | `a9008b3` | `590 / 590` | `0` | `0` | `56.48` |

Spec commit: `b539d14`, plus the corpus case this change adds

Every engine renders every fixture case on every target that has one - 584 of
584, zero mismatches and zero errors in all three - and every target agrees
everywhere, `carve` included.

That last part is new. The `carve` target carried 32 diffs in the previous
snapshot and 5 the run before that, and it is the only target that ever has:
the parse agrees, and what differed was the canonical spelling a formatter
writes back. Three defects accounted for all of them.

- **Nested lists inflated.** Each level was indented twice, once by an absolute
  depth term and again by the parent item's continuation prefix, so `fmt`
  returned O(depth^3) bytes for an O(depth^2) source. Fixed in all three
  (markup-carve/carve-js#653, markup-carve/carve-rs#597,
  markup-carve/carve-php#801); the round-trip fixture that pinned the inflating
  form moved with them.
- **A comment body took its fence's column twice**, so a body line came back one
  column deeper than the other two engines wrote it
  (markup-carve/carve-rs#603).
- **A collected definition left a placeholder comment in the tree**, which the
  writer then serialized as a `%%` nobody typed - and which made an emptied item
  look non-empty, so it was spelled `- %%` where the others write `- +`
  (markup-carve/carve-rs#606).

None of the three could fail anything while they existed: a comment renders
nothing, so `to_html(fmt(x)) == to_html(x)` held either way, and each engine was
idempotent about the spelling it had chosen. The `carve` target had no
expected-output fixtures, so agreement between engines was its only check
(markup-carve/carve#671). It has ten now.

> This run shared a loaded machine, so its per-file times run high and mean
> little against the previous snapshot's. The counts are what this table is
> for.

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
| Rust | `3 / 3` | `30` | `0` | `0` | `2.38` |
| JS | `3 / 3` | `30` | `0` | `0` | `62.34` |
| PHP | `3 / 3` | `30` | `0` | `0` | `50.95` |

Optional cross-implementation diffs: `0`

Note the `Skipped` column against a corpus of 33: each engine runs three cases
and skips thirty, so the `0` diffs is agreement about three documents. The
features are implemented in all three; there is no way to switch them on from a
command line, which is the only interface this tool has (carve#496).

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

### Combinations, not just cases

`npm run combinatorial:check` is a second differential runner over a different
input set. `compare:impls` renders the CORPUS through every engine; the
combinatorial check renders a generated product of AXES - heading level,
attribute provenance, container nesting, trailing body - and diffs the same way.

The distinction is the point. The corpus pins constructs; nothing in it pins
what happens when two constructs meet, and a pair space is larger than a
hand-written case list. Every cross-engine divergence in carve#427 lived in that
gap: nested headings were covered, attributes were covered, and no case gave a
nested heading attributes, so four implementations held four different answers
with every suite green.

There are no expected-output files. The oracle is agreement, plus structural
invariants (no dangling `href="#id"`, no duplicate DOM id, every heading
reachable by a fragment) that hold whatever the agreed answer turns out to be -
those fire even when every engine agrees and all of them are wrong, which has
happened here before.

A divergence it reports is a QUESTION, not a verdict. Decide the canonical
answer, then promote it to a corpus case in `docs/examples/edge-cases.md` so it
is pinned from then on.

```bash
npm run combinatorial:check
CARVE_RS_DIR=/path/to/carve-rs CARVE_PHP_DIR=/path/to/carve-php npm run combinatorial:check
```

The output names each engine's revision, branch and dirty state. That is not
decoration: a CLI engine is whatever its checkout happens to be sitting on, and
the first run of this script reported two divergence classes that were nothing
but an out-of-date working copy. Check those lines before investigating a
finding.

It is deliberately NOT wired into CI yet - it currently reports real
divergences, so it would land red. Wire it once those are resolved.

Render options (`sections`, `sourceLine`) are not an axis yet: neither the
carve-rs nor the carve-php CLI exposes them and the executable spec implements
neither, so there is nothing to compare across. Adding those flags promotes the
option axis to a real differential.

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

### Round-trip inputs

`--roundtrip` formats each corpus case, then feeds that output back in as a
fresh input:

```bash
node scripts/compare-impls.mjs --roundtrip
```

Every case then covers two inputs instead of one, and the second is a document
nobody wrote. That matters because the formatter emits shapes an author rarely
types by hand - normalized indentation, inserted blank lines, escape runs - so
its output is exactly where the engines are least likely to have been compared.
The case that prompted it (carve#353) was a nested list whose formatted form the
engines then parsed differently, tight in one and loose in another: an
HTML-level parser divergence the corpus structurally could not see, because the
input only exists after formatting.

Three numbers come out of it:

```text
roundtrip_compared=499 roundtrip_diffs=0 semantic_failures=0 idempotence_failures=0
```

`roundtrip_diffs` is a cross-engine disagreement on the HTML of formatted
source, and belongs with the target-agreement block. The other two are each
engine failing its own stated invariant (PART 11 §1) and are reported apart from
it:

- `semantic_failures` - `to_html(fmt(x)) != to_html(x)`, the formatter changing
  what the document renders as.
- `idempotence_failures` - `fmt(fmt(x)) != fmt(x)`, a second pass that is not a
  no-op.

A per-engine failure is not a divergence: all three engines can agree and still
be wrong together, which is why the counts are separate rather than folded into
`cross_impl_diffs`.

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
profile=default/no-opt-in corpus=core corpus_pairs=590 targets=html,markdown,plain,carve,ansi
rust: pass=602/602 mismatch=0 error=0 skipped=0 runs=2950 avg_ms=2.48
js: pass=602/602 mismatch=0 error=0 skipped=0 runs=2950 avg_ms=61.39
php: pass=602/602 mismatch=0 error=0 skipped=0 runs=2950 avg_ms=56.48
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=590 diffs=0 errors=0 fixtures=yes
markdown: compared=590 diffs=0 errors=0 fixtures=1
plain: compared=590 diffs=0 errors=0 fixtures=1
carve: compared=590 diffs=0 errors=0 fixtures=10
ansi: compared=590 diffs=0 errors=0 fixtures=none
target_agreement_note=html has an expected-output fixture per case; another target has one wherever a case added it (fixtures=N), and asserts engine agreement everywhere else.

Extension capability matrix
rust: inline matcher, block matcher, after_parse, before_render, inline extension renderer, block extension renderer
js: inline matcher, block matcher, afterParse, beforeRender, inline extension renderer, block extension renderer
php: inline matcher, block matcher, parsed-document hook, before-render hook, render listeners, converter registration
extension_profile_note=this run compares default/no-opt-in output. Use --corpus=optional for Tier-2 opt-in adapters.
```

**Two engines render every fixture case**, on every target that has one: 573 of
573 in carve-js and carve-php, zero mismatches and zero errors. carve-rs misses
the two newest, both pinning what a comment does to the item around it - a
blank after one still ends the item, and a comment fence under a nested item
does not close it. carve-js, carve-php and the executable spec agree on both;
carve-rs is the sole outlier (markup-carve/carve-rs#578). Those two cases
account for eight of the twelve diffs below, across four targets each.

**Four differences remain on the `carve` target** beyond them, which has an
expected-output file for five cases and asserts engine agreement on the rest. All four are the
formatter, and the rule behind the largest of them is one the writer has not
caught up on: PART 11 §1's round trip does not hold for a resolved reference
link in ANY engine - `[a][r]` plus its definition formats to the inline
`[a](/u)`, so the `ref` and `rawRef` that §3a records are gone on reparse. That
is [carve#642](https://github.com/markup-carve/carve/issues/642), a writer
question rather than a parser one.

Optional raw output:

Timings are from one machine and mean nothing across rows; the counts are the
point. `tests/implementation-comparison-counts.test.mjs` fails if the
`corpus_pairs` quoted here stops matching the corpus, which is how this block
came to say 4 when the corpus held 33.

```text
Implementation summary
profile=optional/opt-in corpus=optional corpus_pairs=33 targets=html,markdown
rust: pass=3/3 mismatch=0 error=0 skipped=30 runs=3 avg_ms=2.91
js: pass=31/31 mismatch=0 error=0 skipped=2 runs=31 avg_ms=78.43
php: pass=28/28 mismatch=0 error=0 skipped=5 runs=28 avg_ms=69.21
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=27 diffs=0 errors=0 fixtures=yes
markdown: compared=2 diffs=0 errors=0 fixtures=yes

Optional feature coverage
social-link-templates (html): rust, js, php
symbol-map (html): rust, js
smart-quotes-locale-de (html): php
bare-url-autolink (html): js, php
citations-numbered (html): js, php
code-callouts (html): js, php
...

NOT COMPARED: 5 of 33 optional cases reached fewer than two engines, so they
contribute no agreement evidence. This is not a pass.
```

**Read the last block, not the `cross_impl_diffs=10` above it.** Five of the 33
optional cases still reach fewer than two engines and contribute no evidence.

That was 30 until carve#521. The features were implemented everywhere all
along; what was missing was a way for this tool to switch them on. carve-js and
carve-php are driven through an inline script here, so a shared table of
feature to extension name reached both without either engine changing - taking
the compared count from 2 to 27, and covering citations, which is 16 of the 33
on its own.

The rest need a renderer or parser OPTION rather than an extension, and an
option is per-engine API, so there is no shared table for them. Four of the five
are now driven through one: `markdown-typography-source` reaches carve-js and
carve-php, and the other three reach carve-js.

Reaching an engine is not the same as being compared. These four remain
single-engine, and the run now says why rather than reporting a uniform "no CLI
path":

| case | why |
| --- | --- |
| `smart-typography-off` | no engine implements the documented switch (carve#560) |
| `smart-quotes-locale-de` | carve-js has no quote-locale option |
| `section-wrapper-off` | carve-php has no `sections` switch |
| `source-line-after-generated-id` | its fixture needs sections off, which carve-php cannot do |

That distinction is the point. A missing adapter is this repo's backlog; a
missing option is the engine's, and the difference decides who fixes it. Three
of these four are capability gaps, which is why no amount of harness work would
have moved them.

carve-rs is driven through its binary and exposes no flag for any of these, so
its cases still need a CLI path (carve#496).

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
