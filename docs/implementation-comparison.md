---
description: How the reference engines compare on conformance, and how the cross-implementation sweep is run.
---

# Implementation Comparison

The shared comparison runner lives in `scripts/compare-impls.mjs` because this
repo owns the corpus. It compares sibling implementation checkouts against the
same `.crv` / `.html` pairs and reports default conformance, optional Tier-2
adapter coverage, rough CLI timing, and the extension hook surface each
implementation exposes.

## Snapshot (2026-08-29)

> Run with all three implementations built from their own `main`. Regenerate any
> time with `npm run compare:impls`. Timings are from one machine and mean
> nothing across rows; the counts are the point, and
> `tests/implementation-comparison-counts.test.mjs` fails when they stop
> matching the corpus - which is how this page came to quote 302 pairs against a
> corpus of 529, and again at 531, 532, 533, 535, 536, 539, 542, 544, 547, 548, 550, 552, 553, 554, 557, 562, 564, 567, 571, 580 and 653.

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>1541 / 1541</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>1541 / 1541</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>1541 / 1541</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>0</strong>
    <span>cross-implementation diffs</span>
  </div>
</div>

| Implementation | Commit | Corpus | Mismatches | Errors | Avg CLI ms/file |
|----------------|--------|--------|------------|--------|-----------------|
| Rust | `da45f9d2` | `1541 / 1541` | `0` | `0` | `3.71` |
| JS | `f0abfc66` | `1541 / 1541` | `0` | `0` | `107.12` |
| PHP | `3a39d658` | `1541 / 1541` | `0` | `0` | `75.37` |

Spec commit: `3eae6be`.

Corpus added since this run: `441-a-definition-between-two-open-content-columns-reaches-the-outer-one`
and `442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column`.

That category landed on a host with no engine checkouts, so the run above could
not be retaken and its numbers describe the corpus WITHOUT it. Editing the
denominators by hand would publish a three-engine measurement nobody took, and
one that is knowably wrong besides: carve-rs and carve-php both read a
definition between two open content columns as lazy text today
(markup-carve/carve-rs#1505, markup-carve/carve-php#1856).
`tests/implementation-comparison-counts.test.mjs` reads this line and counts the
fixtures the category contributes, so the number cannot be asserted, only
derived, and the line has to be DELETED by whoever next runs
`npm run compare:impls`.

<details>
<summary>What this run measures, and what it cannot</summary>

The pass counts are FIXTURE cases, not documents: html has an expected-output
file per document and the other four targets have one wherever a case added it,
which is 1540 + 26 + 13 + 83 + 13. On the targets without a fixture the three
engines are compared against each other instead, and `cross_impl_diffs=0` is
that comparison.

**A tree-only difference is invisible here.** A paragraph whose whole content is
one image renders as a bare `<img>` with no `<p>` wrapper, so `paragraph > image`
and a top-level `image` emit the same bytes and pass this page either way. The
reader that can tell them apart is `npm run ast:check`, and on the same three
builds its three-way SHAPE comparison is unanimous across 1543 documents, with
values and all 31932 spans identical. That is what closes the window this page
used to declare for category `411` (markup-carve/carve-rs#1341,
markup-carve/carve-php#1681, both since merged).

**`ast:check` did not reach every satellite.** carve-rb has no checkout on the
machine that took this run, and the tool says so rather than passing it: "NOT
MEASURED: 1 of 3 satellites". The three engines this page is about were all
measured.

**The engines are ahead of the pin, and that is a separate window.** This run is
of each engine's own `main`; the build `package.json` pins is a different thing
and drifts behind it by design. What the pinned build does not yet reproduce is
declared per document in `resources/engine-pin-drift.txt`, which currently names
one - the `439` row whose ports have landed on all three mains but not yet in
the pin.

**Timings are one machine and mean nothing across rows.** Read `pass=` and
`mismatch=`. For a timing claim use a benchmark run on an idle machine and say
what it ran on (carve#804); this one was taken on a machine that was not idle.

</details>

The counts here are documents, not runs: an engine that misses one case on two
targets is one document behind, not two.

**The `carve` target is the only one that ever carried diffs**, and it carries
none now. It had 32 in the snapshot before last and 5 the run before that; the
parse always agreed, and what differed was the canonical spelling a formatter
writes back. Three defects accounted for all of them, and all three are fixed.

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
expected-output fixtures at the time, so agreement between engines was its only
check (markup-carve/carve#671). It has 83 now.

> This run shared a loaded machine, so its per-file times run high and mean
> little against any earlier snapshot's. The counts are what this table is for.

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

Every row below is from the same run as the numbers further down; `skipped`
means this tool could not switch the feature on for that engine, not that the
engine lacks it.

| Feature | Rust | JS | PHP |
|---------|------|----|-----|
| `ansi-typography-source` | pass | pass | pass |
| `bare-url-autolink` | skipped | pass | pass |
| `citations-author-date` | skipped | pass | pass |
| `citations-numbered` | skipped | pass | pass |
| `code-callouts` | skipped | pass | pass |
| `details` | skipped | pass | pass |
| `list-table` | skipped | pass | pass |
| `list-table-columns-1344` | skipped | pass | pass |
| `list-table-local-headers-1248` | skipped | pass | pass |
| `markdown-typography-source` | pass | pass | pass |
| `plain-typography-source` | pass | pass | pass |
| `section-wrapper-off` | skipped | pass | pass |
| `semantic-span` | skipped | pass | pass |
| `smart-quotes-locale-de` | pass | pass | pass |
| `smart-typography-default` | pass | pass | pass |
| `smart-typography-off` | pass | pass | pass |
| `social-link-templates` | pass | pass | pass |
| `source-line-after-generated-id` | skipped | pass | pass |
| `spoiler` | skipped | pass | pass |
| `symbol-map` | pass | pass | skipped |
| `tabs` | skipped | pass | pass |
| `tabs-aria` | skipped | pass | pass |

carve-rs reaches the eight that a command-line switch can turn on, because it is
driven through its BINARY here; the rest need a renderer or parser option, which
is per-engine API and has no shared adapter (carve#496). `symbol-map` is the one
row where carve-php is the engine this tool cannot reach.

| Implementation | Optional pass | Skipped | Mismatches | Errors | Avg CLI ms/file |
|----------------|---------------|---------|------------|--------|-----------------|
| Rust | `12 / 12` | `37` | `0` | `0` | `3.06` |
| JS | `49 / 49` | `0` | `0` | `0` | `91.61` |
| PHP | `47 / 47` | `2` | `0` | `0` | `61.96` |

Optional cross-implementation diffs: `0`

Read the `Skipped` column against a corpus of 49. carve-js reaches all of it and
carve-php all but two; carve-rs runs twelve, because it is driven through its
BINARY here and an opt-in feature needs a command-line switch to reach it, which
most of them do not have (carve#496). A skip is not a failure and not a
divergence: it is a case this tool could not switch on for that engine, so the
`0` diffs above is agreement about what was actually compared.

## CLI Timing

These timings include process startup and should be read as smoke-level CLI
performance, not parser microbenchmarks.

<div class="impl-chart" aria-label="Average CLI milliseconds per corpus file">
  <div class="impl-chart-row">
    <span>Rust</span>
    <div><i style="width: 3.5%"></i></div>
    <code>3.71 ms</code>
  </div>
  <div class="impl-chart-row">
    <span>JS</span>
    <div><i style="width: 100%"></i></div>
    <code>107.12 ms</code>
  </div>
  <div class="impl-chart-row">
    <span>PHP</span>
    <div><i style="width: 70.4%"></i></div>
    <code>75.37 ms</code>
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
npm run compare:counts                           # counts only, no five-target sweep
npm run compare:counts -- --corpus=optional
```

`compare:counts` is `compare:impls --counts-only`. It prints the corpus size and
each engine's pass count - the two things
`tests/implementation-comparison-counts.test.mjs` reads, and the only things it
reads: that test asserts on no timing at all.

It renders exactly what is SCORED: every document on the default target, plus
any target that document carries an expected-output file for. That second part
is not optional - a case may add a `.md`, `.txt` or `.fmt` beside its `.html`,
and those files count toward `pass=N/M`, which is why the snapshot above reads
`pass=1675/1675` under `corpus_pairs=1541`. What it drops is the rest of the
five-target sweep, where every document is rendered on every target to check
the engines against each other. That is four extra renders per document against
fifteen extra in total, and no count in the gate depends on it.

Use it when a corpus change has made the quoted size stale. It is NOT the
snapshot above: that block is a five-target transcript, and its per-target
agreement rows are the substance of this page. A counts-only run measures one
target and says so in its own output, so pasting it here would narrow what the
page claims to have checked.

### Combinations, not just cases

`npm run combinatorial:check` is a second differential runner over a different
input set. `compare:impls` renders the CORPUS through every engine; the
combinatorial check renders several curated products of AXES and diffs the same
way. The original family crosses heading level, attribute provenance, container
nesting and trailing body. Six additional families cross the seams that a
2026-08-16 hand sweep found outside that product: unclosed inline runs,
container-scoped floating attributes, terminal container children, ordered
marker spellings, caption positions and `+`-attached block positions.

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
answer, then promote it to a corpus case in `resources/examples/edge-cases.md` so it
is pinned from then on.

```bash
npm run combinatorial:check
CARVE_RS_DIR=/path/to/carve-rs CARVE_PHP_DIR=/path/to/carve-php npm run combinatorial:check
npm run combinatorial:check -- --inventory
```

The output names each engine's revision, branch and dirty state. That is not
decoration: a CLI engine is whatever its checkout happens to be sitting on, and
the first run of this script reported two divergence classes that were nothing
but an out-of-date working copy. Check those lines before investigating a
finding.

The scheduled conformance workflow runs it weekly, reusing the three engine
checkouts that job already builds. `--inventory` lists each family's population
without running an engine; per-family population guards prevent an emptied or
partially walked product from reporting a false clean result.

All 304 generated documents currently agree across the four participants. A
future finding with a focused issue may be declared by exact document id in the
runner: it remains in every report but does not fail the weekly job, while an
undeclared finding does. With all four participants present, a declaration that
no longer reproduces also fails, forcing the debt entry to be removed with its
fix.

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
are comparable against another's.

**It gates.** A violation exits non-zero, and two jobs run it: CI runs 2000
documents per pull request, and the scheduled conformance run repeats the same
seed at 20000, so the per-PR set is a prefix of the larger one. For most of its
life it ran nowhere at all and its own last line said "reporting only", which
made the one check that reaches the shapes `carve#994` is about both unexecuted
and unable to fail (`carve#755`).

Gating while a real defect is outstanding works through a declaration rather
than a lowered bar. `DECLARED` in `scripts/property-check.mjs` names each shape
the writer is known to break, with the ticket that owns it and a mechanical way
to remove it from a document; a failing document is forgiven only when removing
that shape makes it satisfy both invariants, so a document that also fails for a
second reason is reported rather than absorbed. Each entry carries a witness
that must keep failing, so when the engine is fixed the gate goes red and the
entry has to be deleted. **`DECLARED` is empty today**, so nothing is forgiven.
The two entries it has carried both came off that way: `carve#1030`, a ragged
table written back rectangular, and `carve#1027`, an escaped space as the last
column of a line.

The alphabet is the gate's reach, so extending it is how the gate grows rather
than something to avoid. Both declared shapes were found by extending it, and
the extension is also what made the gate able to fail: reverting the
`carve-js#903` guard in the pinned writer leaves it green under the old
alphabet and turns it red with 99 undeclared violations under the current one.

The `--engines` mode does not gate yet. The three writers disagree on roughly
one generated document in 17 (`carve#1028`); it is wired when that closes.

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
profile=default/no-opt-in corpus=core corpus_pairs=1541 shard=0/1 targets=html,markdown,plain,carve,ansi
rust: pass=1675/1675 mismatch=0 error=0 skipped=0 runs=7700 avg_ms=3.71
  mismatching documents: 0
js: pass=1675/1675 mismatch=0 error=0 skipped=0 runs=7700 avg_ms=107.12
  mismatching documents: 0
php: pass=1675/1675 mismatch=0 error=0 skipped=0 runs=7700 avg_ms=75.37
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=1540 diffs=0 errors=0 fixtures=yes
markdown: compared=1540 diffs=0 errors=0 fixtures=26
plain: compared=1540 diffs=0 errors=0 fixtures=13
carve: compared=1540 diffs=0 errors=0 fixtures=83
ansi: compared=1540 diffs=0 errors=0 fixtures=13
target_agreement_note=html has an expected-output fixture per case; another target has one wherever a case added it (fixtures=N), and asserts engine agreement everywhere else.

Extension capability matrix
rust: inline matcher, block matcher, after_parse, before_render, inline extension renderer, block extension renderer
js: inline matcher, block matcher, afterParse, beforeRender, inline extension renderer, block extension renderer
php: inline matcher, block matcher, parsed-document hook, before-render hook, render listeners, converter registration
extension_profile_note=this run compares default/no-opt-in output. Use --corpus=optional for Tier-2 opt-in adapters.
```

**All three engines render every case**, on every target, with zero mismatches
and zero errors. No document differs anywhere, on any target, and no engine
stands alone - the previous snapshot had carve-rs one document behind on
`228-a-line-at-a-footnote-definition-s-own-column-...`, and that is closed.

**The `carve` target carries expected-output files for 83 cases** and asserts
engine agreement on the rest. The class of `carve`-target differences that used
to recur here was the writer inlining a resolved reference, so PART 11 §1's
round trip failed for `[a][r]` in all three engines; that is
[carve#642](https://github.com/markup-carve/carve/issues/642), since closed, and
the target now has no differences to explain.

Optional raw output:


Timings are from one machine and mean nothing across rows; the counts are the
point. `tests/implementation-comparison-counts.test.mjs` fails if the
`corpus_pairs` quoted here stops matching the corpus, which is how this block
came to say 4 when the corpus held 33.

```text
Implementation summary
profile=optional/opt-in corpus=optional corpus_pairs=49 shard=0/1 targets=html,markdown,plain,ansi
target_note=optional corpus renders each case on the target its manifest entry pins (html unless stated); --targets filters that set
rust: pass=12/12 mismatch=0 error=0 skipped=37 runs=12 avg_ms=3.06
  mismatching documents: 0
js: pass=49/49 mismatch=0 error=0 skipped=0 runs=49 avg_ms=91.61
  mismatching documents: 0
php: pass=47/47 mismatch=0 error=0 skipped=2 runs=47 avg_ms=61.96
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=41 diffs=0 errors=0 fixtures=yes
markdown: compared=3 diffs=0 errors=0 fixtures=yes
plain: compared=3 diffs=0 errors=0 fixtures=yes
ansi: compared=2 diffs=0 errors=0 fixtures=yes
target_agreement_note=every optional case has an expected-output fixture on the target it pins; the counts here also assert that the implementations agree with each other.

Optional feature coverage
social-link-templates (html): rust, js, php
symbol-map (html): rust, js
smart-quotes-locale-de (html): rust, js, php
bare-url-autolink (html): js, php
citations-numbered (html): js, php
citations-author-date (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
code-callouts (html): js, php
code-callouts (html): js, php
code-callouts (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
citations-numbered (html): js, php
details (html): js, php
list-table (html): js, php
spoiler (html): js, php
tabs (html): js, php
smart-typography-off (html): rust, js, php
symbol-map (markdown): rust, js
markdown-typography-source (markdown): rust, js, php
section-wrapper-off (html): js, php
source-line-after-generated-id (html): js, php
plain-typography-source (plain): rust, js, php
ansi-typography-source (ansi): rust, js, php
plain-typography-source (plain): rust, js, php
markdown-typography-source (markdown): rust, js, php
ansi-typography-source (ansi): rust, js, php
smart-typography-default (plain): rust, js, php
semantic-span (html): js, php
semantic-span (html): js, php
list-table (html): js, php
citations-numbered (html): js, php
list-table-columns-1344 (html): js, php
list-table-local-headers-1248 (html): js, php
tabs (html): js, php
tabs-aria (html): js, php
tabs-aria (html): js, php
tabs (html): js, php

All optional cases reached at least two engines.

Extension capability matrix
rust: inline matcher, block matcher, after_parse, before_render, inline extension renderer, block extension renderer
js: inline matcher, block matcher, afterParse, beforeRender, inline extension renderer, block extension renderer
php: inline matcher, block matcher, parsed-document hook, before-render hook, render listeners, converter registration
extension_profile_note=optional Tier-2 cases run only where an implementation exposes the matching adapter.
```

**Every optional case now reaches at least two engines.** That line at the
bottom of the block is the one to read: for the first time the optional corpus
carries agreement evidence for all of it, with no case left contributing
nothing.

It was 30 of 33 uncompared until carve#521, and exactly one after that until
carve-js gained locale-aware smart quotes (carve-js#996). The features were implemented
everywhere all along; what was missing was a way for this tool to switch them
on. carve-js and carve-php are driven through an inline script here, so a
shared table of feature to extension name reached both without either engine
changing - covering citations, which is 16 of the 41 on its own.

The rest need a renderer or parser OPTION rather than an extension, and an
option is per-engine API, so there is no shared table for them.
`smart-typography-off` and `markdown-typography-source` reach all three
engines - carve-rs's `--smart-typography source` flag serves both.
`section-wrapper-off` and `source-line-after-generated-id` reach carve-js and
carve-php: carve-php#537 added the `HtmlRenderer::setSectionWrapping()`
opt-out those two adapters drive, and carve-php#679 fixed the id/stamp
ordering the second case pins (carve#535).

Reaching an engine is not the same as being compared, and when a case was
single-engine this page named why rather than reporting a uniform "no CLI
path". The last such case was `smart-quotes-locale-de`, held there because
carve-js had no quote-locale option; carve-js#996 added one, the adapter drives
it, and the case now reaches all three engines.

That distinction is still the point for whatever lands next. A missing adapter
is this repo's backlog; a missing option is the engine's, and the difference
decides who fixes it - no amount of harness work moves a capability gap.

carve-rs is driven through its binary and exposes no flag for the sections
switch or the source-line stamp, so `section-wrapper-off` and
`source-line-after-generated-id` still need a CLI path there (carve#496).

## Converter corpus

`--corpus=convert` runs the arrow the other way: `tests/corpus-convert/` pairs
a foreign source (`input.md`, `input.html`, `input.bbcode`, `input.djot`) with
the expected render of the Carve it converts to. Each engine that imports the
case's format converts the source, carve-js renders every produced document
with default options, and that render is compared against the case's
`expected.html` - the semantic gate ruled on
[carve#1130](https://github.com/markup-carve/carve/issues/1130), which is what
keeps carve-php's escape-only-the-opener spelling and carve-rs's canonical
rewriting from reading as divergence when both render the same document.

Absence is declared, never silent, in two files checked in both directions on
every run:

- **A missing importer** is a capability gap: it lives in
  `scripts/lib/converter-formats.mjs` with the reason. There are no declared
  importer gaps today: carve-rs#1275 added the last missing BBCode path. A format an engine can
  neither convert nor explain fails the run; a declared gap the engine has
  quietly closed is a stale entry and fails too - the runner probes the engine
  itself rather than trusting the table.
- **A known-behind conversion** is drift: it lives in
  `resources/converter-drift.txt` as `engine/case  reason`, the converter
  corpus's `engine-pin-drift.txt`. An undeclared mismatch fails immediately;
  a declared one that starts passing fails as stale until the line is deleted
  in the commit that fixed it.

The per-PR half of the same corpus is `tests/corpus-convert.test.mjs`, which
gates the pinned build and additionally holds every expectation against the
SOURCE language's own reader (`marked` for Markdown, `djot.js` for Djot, the
document itself for HTML), so the expected files answer to something that is
not Carve.

## Scope

The tool has two profiles:

- It runs the mandatory Tier-1 corpus in `tests/corpus`.
- It runs optional Tier-2 adapters in `tests/corpus-optional` with
  `--corpus=optional`.
- It runs the converter corpus in `tests/corpus-convert` with
  `--corpus=convert`.
- It compares byte-identical output after trimming.
- It reports CLI-level average time per corpus file.
- It reports extension system surface area.

Tier-3 app-extension max profiles still need language-specific adapter fixtures.
That means a small runner per implementation that enables the same test
extension in each language, then feeds those through the same comparison loop.
