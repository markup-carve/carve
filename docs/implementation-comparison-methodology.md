---
description: Dated conformance evidence and commands used to compare the reference Carve implementations.
---

# Implementation comparison methodology

This page records maintainer-facing measurements and the machinery behind them.
To choose an implementation, start with the concise
[implementation comparison](./implementation-comparison).

The shared comparison runner lives in `scripts/compare-impls.mjs` because this
repo owns the corpus. It compares sibling implementation checkouts against the
same `.crv` / `.html` pairs and reports default conformance, optional Tier-2
adapter coverage, rough CLI timing, and the extension hook surface each
implementation exposes.

## Snapshot (2026-09-26)

The current core corpus has 1,882 documents. This run included every one of them
at spec commit `add5471c`. The previous snapshot measured 1,544 documents and
left 338 current documents in a declared-lag list. All 338 are included here;
there are no core exclusions.
The former case-by-case notes remain in the
[previous snapshot](https://github.com/markup-carve/carve/blob/a22f6a23f7913e44cb3461f3f608605660619032/docs/implementation-comparison-methodology.md).

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>1882 / 1882</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>1882 / 1882</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>1882 / 1882</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>0</strong>
    <span>cross-implementation diffs</span>
  </div>
</div>

| Implementation | Commit | Corpus | Scored fixtures | Mismatches | Errors |
|----------------|--------|--------|-----------------|------------|--------|
| Rust | `0cb580e0f` | `1882 / 1882` | `2042 / 2042` | `0` | `0` |
| JS | `ba987c459` | `1882 / 1882` | `2042 / 2042` | `0` | `0` |
| PHP | `6fb5c9ac` | `1882 / 1882` | `2042 / 2042` | `0` | `0` |

The run used `--shard=0/12` through `--shard=11/12` with clean engine
checkouts. The twelve disjoint shards counted 1,882 documents and 9,410 target
runs per engine. Each target compared all 1,882 documents. The scored fixtures
were 1,882 HTML, 43 Markdown, 13 plain-text, 91 Carve, and 13 ANSI files per
engine. No shard reported a mismatch, error, skip, or cross-engine difference.

JS was built once before the shards started. A temporary copy of the comparison
runner skipped only its redundant JS build preparation in each shard; the
render commands, comparison logic, and corpus files were unchanged. The
published run summary below combines the twelve shard reports. Timings are
omitted because concurrent shards compete for machine resources.

<details>
<summary>What this run measures</summary>

A scored fixture checks an engine against an expected file. Where a target has
no fixture, the runner checks the three engines against each other. Agreement
on rendered bytes does not prove that their AST trees agree; use
`npm run ast:check` for that separate measurement. The installed build selected
by `package.json` is also separate from the three engine commits listed above.

</details>

## The render ceiling is per-engine, deliberately

Nothing above measures the depth at which a renderer refuses, and the three
engines refuse at three different depths. That is by design rather than by
neglect.

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

The optional profile was measured on 2026-09-26 with the same engine commits as
the core snapshot. It enables a shared adapter per feature where each
implementation exposes one. Unsupported feature/implementation combinations are
reported as skipped, not failures.

Every row below is from the same run as the numbers further down; `skipped`
means this tool could not switch the feature on for that engine, not that the
engine lacks it.

| Feature | Rust | JS | PHP |
|---------|------|----|-----|
| `ansi-typography-source` | pass | pass | pass |
| `bare-url-autolink` | pass | pass | pass |
| `citations-author-date` | pass | pass | pass |
| `citations-numbered` | pass | pass | pass |
| `code-callouts` | pass | pass | pass |
| `details` | pass | pass | pass |
| `list-table` | pass | pass | pass |
| `list-table-columns-1344` | pass | pass | pass |
| `list-table-local-headers-1248` | pass | pass | pass |
| `markdown-typography-source` | pass | pass | pass |
| `plain-typography-source` | pass | pass | pass |
| `section-wrapper-off` | pass | pass | pass |
| `semantic-span` | pass | pass | pass |
| `smart-quotes-locale-de` | pass | pass | pass |
| `smart-typography-default` | pass | pass | pass |
| `smart-typography-off` | pass | pass | pass |
| `social-link-resolvers` | skipped | pass | pass |
| `social-link-templates` | pass | pass | pass |
| `source-line-after-generated-id` | pass | pass | pass |
| `spoiler` | pass | pass | pass |
| `symbol-map` | pass | pass | pass |
| `tabs` | pass | pass | pass |
| `tabs-aria` | pass | pass | pass |

carve-rs reaches every row except host resolver callbacks through its binary.
The callbacks remain library-only because command-line values cannot carry host
functions.

| Implementation | Optional pass | Skipped | Mismatches | Errors |
|----------------|---------------|---------|------------|--------|
| Rust | `52 / 52` | `1` | `0` | `0` |
| JS | `53 / 53` | `0` | `0` | `0` |
| PHP | `53 / 53` | `0` | `0` | `0` |

Optional cross-implementation diffs: `0`

All 53 cases reached at least two engines. Rust skips only
`social-link-resolvers`: its library accepts host callbacks, but the CLI used
by this runner cannot carry them. Every other optional case reached all three
engines. A skip is visible in the count and does not count as a pass.

## CLI timing

The core snapshot used concurrent shards, so it makes no timing claim. For
performance measurements, see [Performance](./performance).

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
`pass=2042/2042` under `corpus_pairs=1882`. What it drops is the rest of the
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

The corpus pins constructs; nothing in it pins
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

The output names each engine's revision, branch and dirty state, because a CLI
engine is whatever its checkout happens to be sitting on, and
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

In the core corpus every case has an `html` fixture, and a non-HTML target has
one wherever a case added it; everywhere else the non-HTML targets are compared
**implementation against implementation**, because identical output across the
three engines is the invariant that matters there. The `Target
agreement` block in the output reports per-target `compared` / `diffs` /
`errors` counts, and each disagreement prints a `DIFF [target] slug` line naming
**which engines disagreed**, grouped by the output they wrote:

```text
DIFF [markdown] 05-lists-19 (core): rust+php | js
```

Two engines joined by `+` wrote the same bytes; groups separated by `|` did not.
A line reading `rust+js+php` means all three wrote something different, and is
the only shape from which no engine can be used as a reference.
`cross_impl_diffs` is the total across every target compared, not the HTML
count.

### Declared engine lag on the Markdown target

PART 11 §10l makes the Markdown target preserve a list's tight/loose
distinction, and `tests/corpus/05-lists-19.md` pins it. Two engines are behind
that clause and one is behind part of it, so the fixture half of the Markdown
target is expected to name them until their fixes land:

- carve-rs and carve-php write a blank separator before a nested list, which a
  CommonMark reader turns into a loose outer item. 48 documents across the full
  corpus: markup-carve/carve-rs#1900, markup-carve/carve-php#2380.
- all three drop a flat list's looseness and write a separator before a nested
  block quote in a tight item: markup-carve/carve-js#2050 carries those two for
  the engine that is otherwise conformant.

The golden is derived from the clause, not from an engine, so it stays as
written until the engines meet it. This is the same window
`resources/engine-pin-drift.txt` declares for the HTML target, kept here instead
because that file is read by `npm run engine:report -- --check`, which measures
HTML only and would report a line for this slug as stale on the day it landed.

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

To reproduce the core snapshot, check out the engine commits in the table
above and run all twelve shards. The stock runner rebuilds JS before each shard;
the measured run built it once and skipped only the repeated preparation. Each
invocation prints its own counts:

```bash
for i in $(seq 0 11); do
  CARVE_RS_DIR=../carve-rs \
  CARVE_JS_DIR=../carve-js \
  CARVE_PHP_DIR=../carve-php \
  node scripts/compare-impls.mjs --shard="$i/12"
done
```

The combined summary below omits `avg_ms`; concurrent CLI timing is not a
performance measurement. See [Performance](./performance) for timing data.

Combined core shard summary, summed from twelve runner outputs:

```text
Aggregated implementation summary (12 disjoint shards)
profile=default/no-opt-in corpus=core corpus_pairs=1882 shards=12 targets=html,markdown,plain,carve,ansi
rust: pass=2042/2042 mismatch=0 error=0 skipped=0 runs=9410
  mismatching documents: 0
js: pass=2042/2042 mismatch=0 error=0 skipped=0 runs=9410
  mismatching documents: 0
php: pass=2042/2042 mismatch=0 error=0 skipped=0 runs=9410
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=1882 diffs=0 errors=0 fixtures=yes
markdown: compared=1882 diffs=0 errors=0 fixtures=43
plain: compared=1882 diffs=0 errors=0 fixtures=13
carve: compared=1882 diffs=0 errors=0 fixtures=91
ansi: compared=1882 diffs=0 errors=0 fixtures=13
```

All three engines rendered every core document on every target. The `carve`
target has expected-output files for 91 documents and checks engine agreement
on the others. This output covers the full core corpus; no declared-lag
category is subtracted from its denominator.

Optional run summary (CLI timings and per-case coverage lines omitted):

```text
Implementation summary
profile=optional/opt-in corpus=optional corpus_pairs=53 shard=0/1 targets=html,markdown,plain,ansi
rust: pass=52/52 mismatch=0 error=0 skipped=1 runs=52
  mismatching documents: 0
js: pass=53/53 mismatch=0 error=0 skipped=0 runs=53
  mismatching documents: 0
php: pass=53/53 mismatch=0 error=0 skipped=0 runs=53
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=45 diffs=0 errors=0 fixtures=yes
markdown: compared=3 diffs=0 errors=0 fixtures=yes
plain: compared=3 diffs=0 errors=0 fixtures=yes
ansi: compared=2 diffs=0 errors=0 fixtures=yes
```

The resolver case runs through the host callback APIs in carve-js and
carve-php. carve-rs implements the same API in the library, but its command-line
interface cannot accept host callbacks, so the comparison runner cannot reach
that implementation.

It was 30 of 33 uncompared until carve#521, and exactly one after that until
carve-js gained locale-aware smart quotes (carve-js#996). The features were implemented
everywhere all along; what was missing was a way for this tool to switch them
on. carve-js and carve-php are driven through an inline script here, so a
shared table of feature to extension name reached both without either engine
changing, with the citation cases forming the largest group.

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

That distinction still applies to whatever lands next. A missing adapter
is this repo's backlog; a missing option is the engine's, and the difference
decides who fixes it - no amount of harness work moves a capability gap.

carve-rs is driven through its binary. Its named-extension, section, source-line,
tabs-mode, and citation-mode flags now reach every optional corpus configuration
that does not require a host callback (markup-carve/carve-rs#1755).

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
  closed is a stale entry and fails too - the runner probes the engine
  itself rather than trusting the table.
- **A known-behind conversion** is drift: it lives in
  `resources/converter-drift.txt` as `engine/case  reason`, the converter
  corpus's `engine-pin-drift.txt`. An undeclared mismatch fails immediately;
  a declared one that starts passing fails as stale until the line is deleted
  in the commit that fixed it.

The per-PR half of the same corpus is `tests/corpus-convert.test.mjs`, which
gates the pinned build and additionally holds every expectation against the
SOURCE language's own reader (cmark-gfm for Markdown, `djot.js` for Djot, the
document itself for HTML), so the expected files answer to something that is
not Carve.

## Roundtrip import report

`npm run import:report` compares what each engine SAYS about an import, not what
it produces. Every fixture in `tests/html-import/` imports in `safe`, and the
fixture contract forbids a fixture declaring its mode
([carve#1886](https://github.com/markup-carve/carve/issues/1886)), so
`roundtrip`-only rows had no cross-engine home; the converter comparison above
pairs on the rendered document, and a report row renders nothing. Three engines
reported the same raw-kept-element refusals three different ways until someone
read one payload
([carve#2268](https://github.com/markup-carve/carve/issues/2268)).

It imports three raw-keep cases in `roundtrip` through all three engines and
compares code, severity, fidelity, confidence, path and message string in
document order, `style` rows included. Divergences are declared in the script
with their ticket and checked in both directions, like the converter drift file
above. A clause no engine has reached yet is declared the same way and asserts
the shape of the gap rather than a row string, so the first engine to land its
fix turns the gate red instead of leaving a dead entry: that is where
[carve#2267](https://github.com/markup-carve/carve/issues/2267) sits, with a
ticket per engine. Without all three checkouts it exits 2 rather than reporting
success having compared nothing.

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
