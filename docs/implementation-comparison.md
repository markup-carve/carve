# Implementation Comparison

The shared comparison runner lives in `scripts/compare-impls.mjs` because this
repo owns the corpus. It compares sibling implementation checkouts against the
same `.crv` / `.html` pairs and reports default conformance, optional Tier-2
adapter coverage, rough CLI timing, and the extension hook surface each
implementation exposes.

## Snapshot (2026-08-06)

> Run with all three implementations built from their own `main`. Regenerate any
> time with `npm run compare:impls`. Timings are from one machine and mean
> nothing across rows; the counts are the point, and
> `tests/implementation-comparison-counts.test.mjs` fails when they stop
> matching the corpus - which is how this page came to quote 302 pairs against a
> corpus of 529, and again at 531, 532, 533, 535, 536, 539, 542, 544, 547, 548, 550, 552, 553, 554, 557, 562, 564, 567, 571, 580 and 653.

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>675 / 675</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>675 / 675</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>675 / 675</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>0</strong>
    <span>cross-implementation diffs</span>
  </div>
</div>

| Implementation | Commit | Corpus | Mismatches | Errors | Avg CLI ms/file |
|----------------|--------|--------|------------|--------|-----------------|
| Rust | `5b03787` | `675 / 675` | `0` | `0` | `3.01` |
| JS | `8105210` | `675 / 675` | `0` | `0` | `76.02` |
| PHP | `a5f18fb` | `675 / 675` | `0` | `0` | `68.54` |

Spec commit: `2cde4a1`, plus the three corpus cases this change adds

Corpus added since this run: `254-colon-fence-separator-must-be-a-space`,
`255-colon-fence-metadata-slots-must-be-a-space-too`,
`256-table-cell-padding-must-be-a-space`,
`257-link-and-image-title-slots-must-be-a-space`,
`258-code-fence-metadata-slots-must-be-a-space-too`.

Those categories landed on hosts that could not retake the run above, so its
numbers describe the corpus WITHOUT them. The alternative was to edit the
denominators by hand, which would have published a three-engine measurement
nobody took - and one that is knowably wrong: all three engines still accept a
tab in every table-cell padding slot (measured on carve-js, carve-php and
carve-rs main under carve#904 - every tab form renders byte-identical to its
space form), and carve-js and carve-php still read a title after a tab at every
form of the `link_title` slot (measured under carve#907 on carve-js `3d95e94`
and carve-php `876e312`).

The engines have moved under two of those categories since the lines above were
written, in opposite directions, which is exactly why the declaration names
categories and never numbers. Category 258's rule is now implemented by all
three (markup-carve/carve-js#800, markup-carve/carve-php#955,
markup-carve/carve-rs#724); each renders every one of its documents
byte-identically to the corpus, so what lags there is only the build this
repository pins. Category 257's is implemented by carve-rs alone
(markup-carve/carve-rs#729). An earlier revision of this note said carve-rs
still opens an admonition on a tabbed metadata slot; that was corrected by
markup-carve/carve-rs#724 and re-measured false on `378f0d5`, so the claim has
been replaced rather than left to rot.

Categories 256 through 258 were added under the per-repo lock while three engine
repositories were being edited concurrently, so
`compare:impls` could not be run at all: it drives those checkouts live, and a
sweep across a tree mid-edit fabricates diffs. Declaring the gap is the same answer
`resources/engine-pin-drift.txt` gives for the pinned JS build, and
`tests/implementation-comparison-counts.test.mjs` reads this line: it counts the
fixtures those categories actually contribute, so the number cannot be asserted,
only derived, and the line has to be DELETED by whoever next runs
`npm run compare:impls` or the same test goes red from the other side.

The run above predates carve#891, which rewrote `86-list-lazy-continuation-9`
to the answer PART 1 S4 gives. `npm run engine:report` measures the pinned JS
build (`52da7be`) reproducing 671 of the 672 documents, missing exactly that
one; the Rust and PHP columns have not been re-run since, so their numbers
still describe the corpus as it stood before that change. The window is
declared in `resources/engine-pin-drift.txt`, and closes when the engines ship
the rule.

The engines have caught up further since the last snapshot: the `carve`-target
differences it listed - `16-reference-link-4`,
`195-a-definition-inside-a-container-...` and two more in carve-rs - are gone,
and the `carve` target now has expected-output files for twelve cases rather
than ten, so more of it is pinned rather than merely agreed.

The counts here are documents, not runs: an engine that misses one case on two
targets is one document behind, not two.

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

## The render ceiling is per-engine, deliberately

Nothing above measures the depth at which a renderer refuses, and the three
engines refuse at three different depths. That is by design rather than by
neglect, and it is worth stating because the numbers look like a disagreement.

PART 9 §25 requires each implementation to DERIVE its render-ceiling margin from
the worst per-level cost of **its own unit**, and forbids adopting another
implementation's number without redoing that derivation. The units differ: two
engines count container depth (one step per nesting level), one counts AST node
levels, where a single list level costs two. A margin sized for one unit does not
carry to the other - copying one across is what silently truncated a 120-level
list in [carve#650](https://github.com/markup-carve/carve/issues/650). So three
derivations produce three ceilings, and all three are conformant.

The constants are not quoted here on purpose. Each lives in its own engine, next
to the derivation it came from, and a table of them in this repository would be a
number nobody checks - the same way this page once claimed 302 corpus pairs when
there were 529.

**What it means in practice.** No tree the parser produces can reach any of them:
the parse path caps containers at `MAX_NESTING_DEPTH`, and every ceiling exceeds
that cap by construction in its own unit. Only a programmatically built tree - an
AST-JSON ingest, an editor bridge, a formatter driving a rewritten tree - reaches
the band where the engines differ, and there the same document can be rendered by
one engine and refused by another. Every refusal is typed and names its bound, so
a caller is told which one it hit; none of them truncates.

A host that needs one answer across engines should bound its own trees rather
than rely on the ceilings agreeing, because §25 says they will not.

## The render ceiling is per-engine, deliberately

Nothing above measures the depth at which a renderer refuses, and the three
engines refuse at three different depths. That is by design rather than by
neglect, and it is worth stating because the numbers look like a disagreement.

PART 9 §25 requires each implementation to DERIVE its render-ceiling margin from
the worst per-level cost of **its own unit**, and forbids adopting another
implementation's number without redoing that derivation. The units differ: two
engines count container depth (one step per nesting level), one counts AST node
levels, where a single list level costs two. A margin sized for one unit does not
carry to the other - copying one across is what silently truncated a 120-level
list in [carve#650](https://github.com/markup-carve/carve/issues/650). So three
derivations produce three ceilings, and all three are conformant.

The constants are not quoted here on purpose. Each lives in its own engine, next
to the derivation it came from, and a table of them in this repository would be a
number nobody checks - the same way this page once claimed 302 corpus pairs when
there were 529.

**What it means in practice.** No tree the parser produces can reach any of them:
the parse path caps containers at `MAX_NESTING_DEPTH`, and every ceiling exceeds
that cap by construction in its own unit. Only a programmatically built tree - an
AST-JSON ingest, an editor bridge, a formatter driving a rewritten tree - reaches
the band where the engines differ, and there the same document can be rendered by
one engine and refused by another. Every refusal is typed and names its bound, so
a caller is told which one it hit; none of them truncates.

A host that needs one answer across engines should bound its own trees rather
than rely on the ceilings agreeing, because §25 says they will not.

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

`avg_ms` IS NOT A BENCHMARK. It is wall-clock from whichever machine last
refreshed this page, on whatever else that machine was doing, and it is
re-rolled every time the block is regenerated for an unrelated reason - the
corpus-size gate below requires a fresh run whenever the corpus grows, so these
numbers change without any engine changing. The same three engines measured
2.37 / 59.31 / 54.50 in one run and 3.21 / 83.35 / 75.68 in the next, purely
from load.

Read the `pass=` and `mismatch=` counts, which are facts about the engines.
For a timing claim, use a benchmark run on an idle machine and say what it was
measured on (carve#804).

Default raw output:

```text
Implementation summary
profile=default/no-opt-in corpus=core corpus_pairs=675 targets=html,markdown,plain,carve,ansi
rust: pass=690/690 mismatch=0 error=0 skipped=0 runs=3375 avg_ms=3.01
  mismatching documents: 0
js: pass=690/690 mismatch=0 error=0 skipped=0 runs=3375 avg_ms=76.02
  mismatching documents: 0
php: pass=690/690 mismatch=0 error=0 skipped=0 runs=3375 avg_ms=68.54
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=675 diffs=0 errors=0 fixtures=yes
markdown: compared=675 diffs=0 errors=0 fixtures=1
plain: compared=675 diffs=0 errors=0 fixtures=1
carve: compared=675 diffs=0 errors=0 fixtures=13
ansi: compared=675 diffs=0 errors=0 fixtures=none
target_agreement_note=html has an expected-output fixture per case; another target has one wherever a case added it (fixtures=N), and asserts engine agreement everywhere else.

Extension capability matrix
rust: inline matcher, block matcher, after_parse, before_render, inline extension renderer, block extension renderer
js: inline matcher, block matcher, afterParse, beforeRender, inline extension renderer, block extension renderer
php: inline matcher, block matcher, parsed-document hook, before-render hook, render listeners, converter registration
extension_profile_note=this run compares default/no-opt-in output. Use --corpus=optional for Tier-2 opt-in adapters.
```

**Two engines render every case**, on every target: carve-js and carve-php are
642 of 642 with zero mismatches and zero errors. carve-rs is one document
behind - `228-a-line-at-a-footnote-definition-s-own-column-...` - and that one
document accounts for BOTH diffs below, one on `html` and one on `carve`. No
other document differs anywhere.

**The `carve` target is down to that same one**, and it has an expected-output
file for twelve cases now, asserting engine agreement on the rest. The rule
behind the class of `carve`-target differences that keeps recurring is one the
writer has not caught up on: PART 11 §1's round trip does not hold for a
resolved reference link in ANY engine - `[a][r]` plus its definition formats to
the inline `[a](/u)`, so the `ref` and `rawRef` that §3a records are gone on
reparse. That is
[carve#642](https://github.com/markup-carve/carve/issues/642), a writer question
rather than a parser one.

Optional raw output:

Timings are from one machine and mean nothing across rows; the counts are the
point. `tests/implementation-comparison-counts.test.mjs` fails if the
`corpus_pairs` quoted here stops matching the corpus, which is how this block
came to say 4 when the corpus held 33.

```text
Implementation summary
profile=optional/opt-in corpus=optional corpus_pairs=33 targets=html,markdown
rust: pass=5/5 mismatch=0 error=0 skipped=28 runs=5 avg_ms=22.17
js: pass=32/32 mismatch=0 error=0 skipped=1 runs=32 avg_ms=64.69
php: pass=31/31 mismatch=0 error=0 skipped=2 runs=31 avg_ms=54.55
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=30 diffs=0 errors=0 fixtures=yes
markdown: compared=2 diffs=0 errors=0 fixtures=yes

Optional feature coverage
social-link-templates (html): rust, js, php
symbol-map (html): rust, js
smart-quotes-locale-de (html): php
bare-url-autolink (html): js, php
citations-numbered (html): js, php
code-callouts (html): js, php
...

NOT COMPARED: 1 of 33 optional cases reached fewer than two engines, so they
contribute no agreement evidence. This is not a pass.
```

**Read the last block, not the `cross_impl_diffs=10` above it.** One of the 33
optional cases still reaches fewer than two engines and contributes no
evidence.

That was 30 until carve#521. The features were implemented everywhere all
along; what was missing was a way for this tool to switch them on. carve-js and
carve-php are driven through an inline script here, so a shared table of
feature to extension name reached both without either engine changing - taking
the compared count from 2 to 27, and covering citations, which is 16 of the 33
on its own.

The rest need a renderer or parser OPTION rather than an extension, and an
option is per-engine API, so there is no shared table for them.
`smart-typography-off` and `markdown-typography-source` reach all three
engines - carve-rs's `--smart-typography source` flag serves both.
`section-wrapper-off` and `source-line-after-generated-id` reach carve-js and
carve-php: carve-php#537 added the `HtmlRenderer::setSectionWrapping()`
opt-out those two adapters drive, and carve-php#679 fixed the id/stamp
ordering the second case pins (carve#535).

Reaching an engine is not the same as being compared. One case remains
single-engine, and the run says why rather than reporting a uniform "no CLI
path":

| case | why |
| --- | --- |
| `smart-quotes-locale-de` | carve-js has no quote-locale option (carve#560) |

That distinction is the point. A missing adapter is this repo's backlog; a
missing option is the engine's, and the difference decides who fixes it. This
one is a capability gap, which is why no amount of harness work would move it.

carve-rs is driven through its binary and exposes no flag for the sections
switch or the source-line stamp, so `section-wrapper-off` and
`source-line-after-generated-id` still need a CLI path there (carve#496).

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
