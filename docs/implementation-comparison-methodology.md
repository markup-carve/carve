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

## Core fixture counts (2026-10-25 CET)

The count-only run covers 3,063 core documents and their 193 target sidecars.
The run scores 3,256 fixtures per engine. It checks expected output on
scored targets; it makes no claim about unscored targets or formatter agreement.

Corpus added since this run: `660-an-empty-link-destination-takes-spaces`, `661-a-tab-cannot-pad-an-empty-link-destination`, `662-a-tab-after-a-comment-marker-stays-in-its-text`, `663-a-titled-admonition-skips-an-authored-heading-id`, `670-bidi-controls-in-math-content`, `671-a-fence-with-no-host-prefix-leaves-an-inline-run`, `672-table-content-parses-inline-markup`, `673-link-titles-accept-trailing-ascii-padding-with-either-destination`, `674-a-partial-braced-opener-before-a-terminal-backslash`, `675-authored-inline-footnote-reference-ids`, `676-an-unclosed-backtick-run-still-forms-math`, `677-an-unresolved-symbol-leaves-a-colon-before-a-quote`, `678-a-below-column-fence-stays-in-a-definition-paragraph`, `679-a-tabbed-table-ends-before-a-flush-left-list-line`, `680-an-indented-line-after-a-table-is-a-paragraph`, `681-a-list-import-preserves-its-hard-break`, `682-escaped-table-hyphens-stay-literal`, `683-a-definition-opens-a-sibling-block-after-a-list`, `684-a-post-marker-tab-keeps-a-quote-literal`.

Sidecars added since this run: none.

The fixture trees match spec commit `180dd2d13`. The runner reported clean
spec and engine worktrees at the commits below. Engine spec submodules were not
initialized because these runs read this repository's corpus directly.

Earlier measurements remain in the
[previous snapshot](https://github.com/markup-carve/carve/blob/2c3d174b605ab8da3c0c2e59e5c1067f20aafa9d/docs/implementation-comparison-methodology.md),
including the
[2026-09-26 five-target core run](https://github.com/markup-carve/carve/blob/312001fcb712cf3c210990d2134c4f9faa1dd94c/docs/implementation-comparison-methodology.md).

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>3063 / 3063</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>3063 / 3063</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>3063 / 3063</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>Not measured</strong>
    <span>unscored target agreement</span>
  </div>
</div>

| Implementation | Commit | Corpus | Scored fixtures | Mismatches | Errors |
|----------------|--------|--------|-----------------|------------|--------|
| Rust | `a5bdaee14` | `3063 / 3063` | `3256 / 3256` | `0` | `0` |
| JS | `67d3ea249` | `3063 / 3063` | `3256 / 3256` | `0` | `0` |
| PHP | `8d5f7c58c` | `3063 / 3063` | `3256 / 3256` | `0` | `0` |

The command was `npm run compare:counts`, with `CARVE_RS_DIR`, `CARVE_JS_DIR`
and `CARVE_PHP_DIR` pointing at the isolated engine checkouts. No case was
skipped and no mismatch or engine error was reported. The output below records
the limited target coverage of this run. The linked 2026-09-26 revision retains
the earlier five-target snapshot.

<details>
<summary>What this run measures</summary>

A scored fixture checks an engine against an expected file. This count-only
run checks those fixtures. It does not compare targets without an expected
file; the full runner does that separately. Matching rendered bytes does not
prove that AST trees agree; use
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

Optional corpus added since this run: `99-citations-definition-space-run`.

The optional profile was measured on 2026-10-25 CET with the same engine commits as
the core snapshot. It enables a shared adapter per feature where each
implementation exposes one. Unsupported feature/implementation combinations are
reported as skipped, not failures.

The run covered 33 features across 69 cases. Every row below is from that run; `skipped`
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
| `fenced-render-abc` | pass | pass | pass |
| `fenced-render-chart` | pass | pass | pass |
| `fenced-render-d2` | pass | pass | pass |
| `fenced-render-graphviz` | pass | pass | pass |
| `fenced-render-mermaid` | pass | pass | pass |
| `fenced-render-plantuml` | pass | pass | pass |
| `fenced-render-vega-lite` | pass | pass | pass |
| `fenced-render-wavedrom` | pass | pass | pass |
| `list-table` | pass | pass | pass |
| `list-table-columns-1344` | pass | pass | pass |
| `list-table-local-headers-1248` | pass | pass | pass |
| `markdown-typography-source` | pass | pass | pass |
| `math-block` | pass | pass | pass |
| `plain-typography-source` | pass | pass | pass |
| `section-wrapper-off` | pass | pass | pass |
| `semantic-span` | pass | pass | pass |
| `smart-quotes-locale-de` | pass | pass | pass |
| `smart-typography-default` | pass | pass | pass |
| `smart-typography-off` | pass | pass | pass |
| `smart-typography-quotes-off` | pass | pass | pass |
| `social-link-resolvers` | pass | pass | pass |
| `social-link-templates` | pass | pass | pass |
| `source-line-after-generated-id` | pass | pass | pass |
| `spoiler` | pass | pass | pass |
| `symbol-map` | pass | pass | pass |
| `tabs` | pass | pass | pass |
| `tabs-aria` | pass | pass | pass |

carve-rs uses its CLI for render options and its `social_resolvers` library
example for host callbacks. Build both with
`cargo build --release --bin carve --example social_resolvers`.

| Implementation | Optional pass | Skipped | Mismatches | Errors |
|----------------|---------------|---------|------------|--------|
| Rust | `69 / 69` | `0` | `0` | `0` |
| JS | `69 / 69` | `0` | `0` | `0` |
| PHP | `69 / 69` | `0` | `0` | `0` |

Optional cross-implementation diffs: `0`

All 69 optional cases reached all three engines.
A skip is visible in the count and does not count as a pass.

## CLI timing

This snapshot makes no timing claim. For
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
each engine's scored results. `tests/implementation-comparison-counts.test.mjs`
reconciles the introductory counts, result tables, and quoted summaries with
the corpus population. It makes no timing assertions.

It renders every document on the default target plus each target that document
carries an expected-output file for. Those sidecars count toward `pass=N/M`,
which is why the current core run scores 3,253 fixtures for 3,060 documents.

Use this mode to refresh scored-fixture counts. Use `compare:impls` to render
every document on every target and compare unscored output between engines.
The historical five-target run linked above records that broader coverage.

### Combinations, not just cases

`npm run combinatorial:check` is a second differential runner over a different
input set. `compare:impls` renders the CORPUS through every engine; the
combinatorial check renders several curated products of AXES and diffs the same
way. The original family crosses heading level, attribute provenance, container
nesting and trailing body. Seven additional families cover unclosed inline
runs, container-scoped floating attributes, terminal container children,
ordered marker spellings, caption positions, `+`-attached block positions, and
repeated children.

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

The inventory contains 346 generated documents across eight families. A
finding with a focused issue may be declared by exact document id in the
runner: it remains in every report but does not fail the weekly job, while an
undeclared finding does. With all four participants present, a declaration that
no longer reproduces also fails, forcing the debt entry to be removed with its
fix.

### The block-structure family

`npm run block-family:check` is a third differential, aimed at one family: a
line read under a container stack. It builds a seeded, deterministic product
of an outer container (none, a `::: note`, a quote, a bullet or ordered item, a
description body, a footnote body, and nestings of two), a host line, a probe
(a link or footnote definition, an attribute line, a comment as a `%%` line
or a matched `%%%` fence, a heading, a table row, a thematic break, a list
marker, a quote marker, a caption line), the probe's column (below, at and
past every content column, and over-indented), quote markers written or
omitted, and a follower (a column-0 line, a blank, an unclosed fence, a colon
closer of another width, a line at the content column). Single containers are
enumerated in full and nestings are sampled, 8.328 documents in all.

Each document renders through the executable spec, carve-js, carve-php and
carve-rs. The run compares HTML with each line trimmed and reports every
divergence together with the implementation that is the odd one out. The
engines are passed explicitly, so a stale sibling checkout cannot join a run:

```bash
npm run block-family:check -- --js=<carve-js>/dist/index.js --php=<carve-php> \
  --rust=<carve-rs>/target/release/carve --report=/tmp/block-family.json
```

`--spec=<carve checkout>` measures another revision of the executable spec,
and `--filter=<name>` re-runs one slice. The daily AST conformance workflow
runs it against the pinned engines and fails on any difference. Like the other differentials, a
divergence is a question. Decide it by the clause, then pin the answer in the
corpus.

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
feature gets. The current adapters cover every target pinned by the optional corpus.

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

The summary reports a document count and three failure counts. This
illustrative output shows their format; it is not the current corpus run:

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

To reproduce the core fixture counts, use the engine commits in the table
and run:

```bash
CARVE_RS_DIR=../carve-rs \
CARVE_JS_DIR=../carve-js \
CARVE_PHP_DIR=../carve-php \
  npm run compare:counts
```

Use `npm run compare:impls` for the five-target sweep and add `-- --roundtrip`
to check formatter conformance. The dated five-target snapshot linked above
records its own engine commits and twelve-shard commands.

Core count-only summary:

```text
Implementation summary
profile=default/no-opt-in corpus=core selected_corpus=none corpus_pairs=3063 shard=0/1 targets=html,markdown,plain,carve,ansi
rust: pass=3256/3256 mismatch=0 error=0 skipped=0 runs=3256
  mismatching documents: 0
js: pass=3256/3256 mismatch=0 error=0 skipped=0 runs=3256
  mismatching documents: 0
php: pass=3256/3256 mismatch=0 error=0 skipped=0 runs=3256
  mismatching documents: 0
cross_impl_diffs=0

counts_only=1 targets_measured=html,markdown,plain,carve,ansi of html,markdown,plain,carve,ansi
counts_only_note=this run validates the corpus counts only. Each document was rendered on the default target plus any target it carries an expected-output file for, so every SCORED case is scored - but nothing was compared engine-against-engine on an unscored target, so this makes no agreement claim and is not the published snapshot. Use `npm run compare:impls` for that.
```

The output names all targets that have scored fixtures. Its
`cross_impl_diffs=0` counts only scored cases. It does not claim that every
document was rendered on every target. Use `npm run compare:impls` for
that full comparison and `--roundtrip` for formatter conformance.

Optional run summary (CLI timings and per-case coverage lines omitted):

```text
Implementation summary
profile=optional/opt-in corpus=optional selected_corpus=none corpus_pairs=69 shard=0/1 targets=html,markdown,plain,ansi
target_note=optional corpus renders each case on the target its manifest entry pins (html unless stated); --targets filters that set
rust: pass=69/69 mismatch=0 error=0 skipped=0 runs=69
  mismatching documents: 0
js: pass=69/69 mismatch=0 error=0 skipped=0 runs=69
  mismatching documents: 0
php: pass=69/69 mismatch=0 error=0 skipped=0 runs=69
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=58 diffs=0 errors=0 fixtures=yes
markdown: compared=4 diffs=0 errors=0 fixtures=yes
plain: compared=4 diffs=0 errors=0 fixtures=yes
ansi: compared=3 diffs=0 errors=0 fixtures=yes
target_agreement_note=every optional case has an expected-output fixture on the target it pins; the counts here also assert that the implementations agree with each other.
```

The resolver case runs through host callbacks in carve-js and carve-php, and
through a library example binary in carve-rs. The optional corpus also covers
the eight diagram presets, both diagram aliases, and display math. The
count-only and optional full runs both scored all 69 cases without errors.

The runner registers extensions and renderer options through each engine's API.
A missing adapter belongs in this repository; a missing capability belongs in
the engine. Both must be reported rather than counted as passes.

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
gates the pinned build and checks every expectation against the
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

## Public importer and AST ingest comparisons

`npm run import:compare` runs all 652 CommonMark 0.31.2 examples through the
Markdown importer, their expected HTML through the HTML importer, and 277
Djot test inputs through the Djot importer. The vendored inputs and licenses
are in `tests/import-comparison/`. Every imported Carve document is rendered by
the same carve-js CLI reader. The report separates identical source, different
spellings with identical HTML, different HTML, and failed imports. HTML
comparison removes only one final newline; content whitespace stays significant.
This measures importer agreement, not conformance to CommonMark or Djot HTML.
Migration-report diagnostics are outside this check; `import:report` compares
the existing HTML roundtrip report fixtures.
Four additional fixtures enforce the [shared import targets](./migrate-from-markdown#shared-importer-targets),
including a case where all engines produce the same incorrect source.

`npm run ast:ingest` recursively reads every `.crv` under `tests/corpus*`.
Each engine's `--json` output is read by each engine's `--from-json` HTML exit,
including all three self-pairs. All files use default CLI options, including
optional-corpus documents; extension-enabled ASTs are outside this sweep. The expected HTML is each reader's direct
render of the original source. This keeps a reader's default extensions and
HTML formatting consistent on both sides of the comparison. A refusal or changed HTML identifies the file,
producer and reader. The comparison covers AST ingestion and rendering; it
does not compare serialized AST bytes or attribute the defect to one side.

Both commands require all three built engines. They honor `CARVE_JS_DIR`,
`CARVE_PHP_DIR`, `CARVE_RS_DIR` and `CARGO_TARGET_DIR`. JavaScript calls the CLI's
injectable `run` entry after a subprocess smoke check, avoiding repeated module
startup while exercising the same options and JSON reader. PHP and Rust run as
subprocesses. The scheduled AST workflow runs both checks and uploads their
JSON reports. To save the evidence locally:

```sh
npm run import:compare -- --report /tmp/import-comparison.json
npm run ast:ingest -- --report /tmp/ingest-comparison.json
```

`resources/import-comparison-drift.json` and
`resources/ingest-comparison-drift.json` declare the measured gaps by case or
producer/reader pair. Each declaration carries an owning issue, a reason, a
readable observation and a SHA-256 fingerprint. Import fingerprints exclude
successful source spellings and retain rendered HTML. Ingest fingerprints cover
both expected and actual HTML. The full observation also appears in the report's
`differences` object. The gate rejects new, changed and resolved differences, including a
changed diagnostic on a failed import. Spelling-only differences are counted
without requiring declarations. Process signals, timeouts, missing engines, unhandled crashes,
producer failures and invalid producer JSON abort the comparison with exit 2; they cannot be accepted
as importer drift. A completed comparison with undeclared drift exits 1. Errors caught by an
importer or JSON reader and returned through its normal CLI status are recorded
as failures. A declaration of such a failure does not make it a deliberate or
acceptable refusal.

A declaration may include `interpreters`, for example `{"php":"8.3"}`.
Each numeric version prefix restricts the declaration to that interpreter:
`8.3` matches PHP 8.3 patches, and `8.3.6` matches that patch, including distro
suffixes. Supported keys are `js` for Node and `php` for PHP. A mismatched or
missing measured runtime fails reconciliation even when the fingerprint agrees;
resolved differences still fail as stale declarations.

Review the full report before changing a declaration. Resolve the engine defect
or explain the changed observation in its owning issue; do not refresh the ledger
from counts alone. Reports include Node and PHP versions, checkout revisions and spec pins. Ingest
report unions require matching interpreter versions in every shard. Revisions
identify source checkouts, not the build provenance of existing binaries.

## Formatter pull-request checks

The formatter PR workflow checks the core documents whose source and expected
HTML and other target fixtures are unchanged at every engine's recorded spec pin. A new or revised corpus
case enters this gate once all three engines pin its bytes. The selection report
lists each pin and every excluded document; a pin outside the checked-out corpus history or an empty selection fails the
job.

Four shards check all five render targets, source round trips, formatting
idempotence and cross-reading by the current spec renderer. Engines are built
once before comparison. The scheduled formatter workflow keeps measuring the
entire latest corpus, so pending rulings remain visible there. Each engine is
checked out at its reviewed pin in `resources/engine-pins.json`, the same
revision every other job here uses, so a merge to an engine's main cannot
change the verdict on a spec PR. A pin moves only through its own pull request,
which `bump-engine-pin.yml` opens daily.

## Structural roundtrip baseline

Run `npm run roundtrip:structure` to compare each engine's PART 12 AST before
and after roundtrip export to HTML or Markdown and import back to Carve.
`--engine js,php,rs` and `--target html,md` select subsets; `--json` includes
all difference buckets and up to three example files with the first differing
path. Conversion errors have separate `errors` counts and `errorBuckets`;
`different` and `buckets` count only completed comparisons with different trees.
Unavailable engines are reported as skipped. PHP uses one process for the
corpus; JS uses the installed pinned package. Rust uses 16 workers by default;
`--workers 1..64` sets concurrency. CI uses a batch driver with one process per
worker across many documents. Without that driver, Rust falls back to the CLI.
The sibling checkouts and `CARVE_PHP_DIR`, `CARVE_RS_DIR`, and
`CARGO_TARGET_DIR` follow the other corpus runners. Set
`CARVE_RS_ROUNDTRIP_BINARY` to select an explicit Rust CLI, including a frozen
copy when other tasks build in the shared Cargo directory. To build and use
the batch driver against an engine checkout:

```bash
CARVE_RS_DIR=/path/to/carve-rs node scripts/build-roundtrip-structure-rs.mjs
CARVE_RS_ROUNDTRIP_DRIVER=/var/tmp/cargo-shared/carve-rs/debug/carve-structural-roundtrip \
  npm run roundtrip:structure -- --check
```

The build uses `CARGO_TARGET_DIR`, defaulting to `/var/tmp/cargo-shared/carve-rs`.
It creates a temporary Cargo manifest and preserves the engine lockfile's
dependency versions; the engine checkout stays on its branch.

Normalization matches the PHP structural measurement: remove `pos`, `position`,
`srcByteLength`, `bulletChar`, `marker`, `delim`, `ref`, `rawRef`,
`separatorWidths`, `tight`, `boldItalic`, and `order`. Drop empty or order-only
`attrs` and comment nodes. Map `autolink` to `link` and `escaped_text` to
`text`; turn soft breaks into spaces and merge adjacent text. Collapse Unicode
whitespace in every string, including code and destinations. These exclusions
make this a structural comparison with reduced whitespace fidelity.

The structural count cannot see a lost carrier, because it removes the fields
the PART 10 §13 carriers restore. A second, strict count covers them. Among
the identical documents it counts those whose trees still match with
`bulletChar`, `marker`, `delim`, `ref`, `separatorWidths` and `tight` kept,
and with `autolink` and `escaped_text` left as their own node types. It still
removes `pos`, `position`, `srcByteLength`, `boldItalic` and `order`, and
`rawRef`, because §13 does not recover whether a reference was written in
collapsed or full form. Whitespace and comments are normalized as above.
Strict differences are reported as `strictBuckets`, separate from `buckets`.

CI runs `npm run roundtrip:structure -- --check` against the pinned engines.
Identical or strict counts below `resources/roundtrip-structure-baseline.json`
fail; improvements print a “raise the baseline” message. A changed corpus size requires review
and a rewritten baseline. A selected engine that is skipped cannot pass the
check. When every document errors for an engine and target, its status is
`unsupported` and its error is reported. The baseline stores that row as
`null`, excluding it from count comparisons. If a row with an existing count
becomes unsupported, `--check` fails, including when the previous identical
count was zero. Partial errors remain a measurement. Newly supported rows
with a null baseline print a request to review and write their baseline.
To refresh the baseline, provision all engines at
`resources/engine-pins.json`, inspect the buckets, then run
`npm run roundtrip:structure -- --write`. Commit the reviewed baseline with
the corresponding engine pin or corpus change. Subset runs cannot rewrite it.

The current counts are in `resources/roundtrip-structure-baseline.json` and
use the revisions in `resources/engine-pins.json`. The table below records an
earlier measurement at carve-js `672d0a0a`, carve-php `29e42817`, and carve-rs
`ee85c4ca`, across 2,401 documents per target. All six rows were measured.

| Engine | HTML identical | HTML strict | Markdown identical | Markdown strict | HTML errors | Markdown errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| JS | 1,712 | 1,654 | 1,462 | 1,109 | 1 | 0 |
| PHP | 1,745 | 1,684 | 1,389 | 1,027 | 1 | 0 |
| Rust | 1,677 | 1,616 | 1,461 | 1,261 | 1 | 0 |

On the measurement host, Rust took 45.9 seconds with four CLI workers and
1.1 seconds with sixteen batch workers at the same pin and corpus. The full
three-engine batch run took 22.1 seconds, excluding dependency installation
and builds. The CLI and batch runs matched every difference bucket and count.

## AST JSON measurements

Comparison output includes the corpus checkout commit, each engine checkout commit, and each engine's recorded and checked-out spec commits. The render comparison’s JSON `--report` includes this data under `revisions`; convert mode prints it to the console. Tracked local changes include a submodule moved off its pin; untracked files are excluded. Missing Git metadata is reported as unknown. These identify the checkouts, not the build provenance of existing binaries. Reproduce a discrepancy against a common spec commit before attributing it to an engine.

### Engine shape and position status

These notes moved from the [parsed document JSON contract](./ast-json-contract).
They record measured engine state and the history behind PART 12's rules, not
requirements; the clauses are the contract. Dated paragraphs stay dated because
the measurements age.

Run `node scripts/ast-conformance.mjs` in this repo against sibling checkouts of
the engines. It reports two things a schema cannot: nodes with no position, and
spans that do not cover the text they claim.

BUILDING A CROSS-ENGINE TABLE: READ THE PUBLISHED EXIT, and say so in the table.
`npm run shape:table -- '<source>'` prints one for any source across all three
engines, reading each through the tree a consumer receives and classifying it with
the same `classifyShapeDisagreement` this page's panel uses. Prefer it to a
hand-rolled probe.

The reason is carve-js specific and it has cost two rulings. carve-js is the only
engine that exposes a PRE-RESOLVE stage: `parse()` returns it, `resolve()` promotes
and degrades on top of it, and `resolve()` MUTATES IN PLACE - so reading
`parse(x).children` after calling `resolve` on the same tree reports the resolved
shape while looking like the parse one. carve-rs and carve-php resolve inside their
own parse and have no such stage, so a table built from `parse()` compares carve-js
at a stage the others cannot reach and reports the difference as theirs. That is
carve#486; it produced carve#1660's premise test, which described carve-js rather
than the language, and carve#1663, whose ruling had to be withdrawn once the
published trees were measured and found unanimous.

The rows below are MEASURED state, so they are reconciled rather than trusted.
`tests/ast-json-claims.test.mjs` measures the carve-js row against the pinned
engine, and holds every row to the two ledgers that run's satellites fill in -
`resources/ast-position-waivers.txt` and `resources/ast-value-divergence.txt`.
A row may name an issue only where one of those still declares the debt.

| engine | shape | positions |
|---|---|---|
| carve-js | PART 12 §3a conformant on the resolved form: publishes `href`, `ref` and `rawRef` together | every block and inline placed, except the categories PART 12 §4 exempts: a coalesced `text` run, a table cell continued on a `+` line, a verbatim run continued on a `+` line, a line-block column a tab expanded, a reassembled `cell_wrap`, and an empty CSV record. |
| carve-rs | PART 12 §3a conformant on the resolved form: `ref` and `rawRef` survive resolution beside `href` | every block and inline placed, except the categories PART 12 §4 exempts: a coalesced `text` run, a reassembled table cell, a verbatim run continued on a `+` line, a line-block column a tab expanded, a reassembled `cell_wrap`, and an empty CSV record. |
| carve-php | PART 12 §3a conformant on both forms: an unresolved reference is a `link` node, and the collapsed form carries the resolution key in `ref` beside `rawRef`, the same label the other two publish on every corpus document | recorded behind a parse option, enabled whenever it serializes; every block and inline placed, except the categories PART 12 §4 exempts: a coalesced `text` run, a reassembled table cell, a verbatim run continued on a `+` line, a line-block column a tab expanded, a reassembled `cell_wrap`, and an empty CSV record. |
| carve-rb / carve-py / carve-go / carve-wasm | publish carve-rs's bytes | whatever carve-rs records |

Corpus 64-2 joins text from a continuation line with the row-1 `cell_wrap`; those reassembled parts have no position under PART 12 §4 (carve#3172).

Corpus 617-8 pads short CSV rows with cells and empty text that have no source
field. Corpus 617-9 has an empty CSV record: its row, cell and text have no
field characters, so they cannot start a span on the line terminator.

A third ledger, `resources/ast-extent-findings.txt`, records the other half of
PART 12 §4: a span that is PRESENT and points at the wrong codepoint. Those findings are
produced by `checkStopsAtChildren` and its neighbors, which read the SOURCE
rather than another engine - the only way a rule every engine breaks the same
way can be seen at all, since the three-way panel compares the engines against
each other and reads a unanimous defect as agreement. Until
[carve#1637](https://github.com/markup-carve/carve/issues/1637) that reading was
theoretical: the findings reached a counter that could not fail, so a run printed
thirty of them per engine and exited green. There is no `permitted` status in
that file - a reassembled node has no true span, which is why the position
waivers have one, and a span that exists and is wrong has no such reading - so
every line names the engine issue that will delete it, and the count fails when
it moves in either direction.

The gaps are listed rather than smoothed over on purpose: "six implementations"
is only a claim worth making if the disagreements are visible.

The **reassembled** regions in the positions column are not among them - PART 12 §4 names
that category permitted, so a table cell or line-block region without a position
is conformant rather than owed. What is still a gap is anything else in that
column, and the test is whether a true span EXISTS rather than whether one was
written down.

The definition-list entry this paragraph used to name is fixed: carve-rs places
`definition_term` and `definition_description` today, checked over every corpus
document that contains one. So is the gap that replaced it - re-measured over 833
documents on 2026-08-07, the OWED half of `resources/ast-position-waivers.txt`
was EMPTY.

It did not stay empty. Re-measured on 2026-08-17 over 1131 documents, at
carve-js c8c8dc3, carve-rs d981df8 and carve-php d2e2fd6, that half holds one
defect again: carve-php drops the position of a line block's content where the
source's spaces became indentation sentinels, and carve-rs publishes the same
value WITH a span, so a true span exists
([carve-php#1351](https://github.com/markup-carve/carve-php/issues/1351)). Four
findings over three documents, with nothing outstanding in carve-js or carve-rs.
The corpus grew 298 documents between that measurement and the 833-document one
above, which is why an undated "the gap is closed" sentence is worth
nothing here - a re-measurement is what says so, and only for the corpus it ran
over.

That one defect was the only thing either ledger declared then, and it survived
a day in which the span ledger was re-measured six times and rewritten five. It
was the constant because nobody had started it, not because it was small: what
stays in a ledger is what nobody is working on.

Every other position finding is `permitted` under PART 12 §4.

That is also how the carve-rs row went wrong. It named the capped-container gap
for two days after the gap closed and the declaration behind it was deleted,
because the one-engine test above declared that row out of scope and handed it to
a script that never reads this page
([carve#965](https://github.com/markup-carve/carve/issues/965)). A row citing an
issue no ledger still declares is now a failing test rather than a sentence.

The PART 12 §3a entries were measured, on `See [getting started][] here.` with the label
defined. All three engines now publish the whole triple - `href`, `ref` and
`rawRef` - which is what PART 12 §3a asks for:

    carve-js   {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}
    carve-rs   {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}
    carve-php  {"href":"/start","ref":"getting started","rawRef":"[getting started][]"}

The unresolved form agrees too: `See [missing][] here.` is a `link` node in all
three, not flattened text. Between them those two lines close what the rows used
to carry as open: whether the serialized tree is pre- or post-resolve (carve#481)
and carve-rs and carve-php flattening an unresolved reference (carve#486), both
answered and both closed.

WHICH label `ref` carries when the label holds inline markup is now RULED, and
the fleet already implements the ruling: given a collapsed reference whose label
is `` `code()` heading ``, all three engines publish the heading's rendered
text, `code() heading`. Measured on carve-js `79175a5`, carve-rs `d855367` and
carve-php `e2c3a97`, each built from a fresh clone of `main` on 2026-08-08.

`resources/ast-value-divergence.txt` declared that disagreement until the same
day, in the pre-merge terms this paragraph used to use. It was re-measured on
those three builds - a full `npm run ast:check` over 870 samples - and the
declaration is now EMPTY: no field the three publish differs anywhere in the
corpus, so both lines were deleted rather than reworded. The caption line that
sat beside it went the same way, fixed under
[carve#963](https://github.com/markup-carve/carve/issues/963).

It did not stay empty either. Re-measured on the morning of 2026-08-17 over 1124
documents plus 3 synthetic samples, at carve-js `02c4d80`, carve-rs `1ad93f0` and
carve-php `4610ef8`, two fields disagreed across four documents
(`paragraph.attrs.classes` and `paragraph.attrs.order`) and nine node types were
spanned differently across twenty-one. All eleven were declared in the two files
rather than left to fail the run, which is what those files are for.

Both halves moved again later the same day, and the two moved in opposite
directions - which is the case for re-measuring rather than reading the ledger.
At carve-js `80537c8`, carve-rs `71318e9` and carve-php `84c422b`, over the 1131
corpus documents plus 3 synthetic samples, `npm run ast:check` reports:

- **The value declaration is EMPTY again.** carve-php shipped the `326`/`329`
  container rulings, and both fields now agree everywhere. The run reported the
  two rows `FIXED` and stayed red until they were deleted.
- **The span declaration holds five rows across nine documents**, down from nine
  across twenty-one. `list`, `list_item`, `block_quote` and
  `definition_description` came `AGREED`; `text (presence)`,
  `code (presence)` and `definition_list (extent)` moved count.

The morning's block attributed eight span rows to a single carve-php issue. That
was too coarse, and the rows that survived their own issue's work are how it
shows: each surviving row was given its own tracker, in carve-php
([#1351](https://github.com/markup-carve/carve-php/issues/1351),
[#1361](https://github.com/markup-carve/carve-php/issues/1361),
[#1362](https://github.com/markup-carve/carve-php/issues/1362),
[#1363](https://github.com/markup-carve/carve-php/issues/1363)) and in carve-js
([#1145](https://github.com/markup-carve/carve-js/issues/1145),
[#1153](https://github.com/markup-carve/carve-js/issues/1153)). Two of those were
carve-js standing alone, so "one engine is behind" was never the whole shape
either.

Ninety minutes later it was four rows across eight documents, of 22,769 spans, at
carve-js `c8c8dc3`, carve-rs `71318e9` and carve-php `6bd856f`. Both carve-js
rows went in the two PRs that answered them - `code (extent)` came `AGREED` and
`text (presence)` dropped from six documents to three - and that second fix also
moved `resources/ast-position-waivers.txt`, which had not moved all day: a
continuation row's carried text now has its own span, so two permitted omissions
retire and a third halves.

That is why these paragraphs are dated rather than written in the present
tense. The block above says a row "will not clear when carve-php catches
up" and names it the one worth watching; it cleared within two hours, in the
other engine, for an unrelated reason. Every remaining span row is carve-php
alone - the first time that day the panel had one engine on every row, and the
third consecutive block to claim something like it.

One more measurement that day, at carve-php `30cc587`, is the one worth keeping
for what it says about the ledgers rather than about the engines. The span
declaration read four rows across eight documents again, with all four counts
identical to the measurement before it - and `code (presence)` had swapped both
its three documents and which engine stood alone. carve-php stopped publishing a
position for a node assembled from discontiguous source, which is right for a
verbatim run carried across a `+` row and wrong for a fenced code block, whose
position is an extent over one contiguous region
([carve-php#1369](https://github.com/markup-carve/carve-php/issues/1369)).

A row that changes its documents and its direction while holding its count is
invisible to a count-based declaration - and the run still failed, because the
six carve-php position findings arrived undeclared in
`resources/ast-position-waivers.txt`. The two ledgers cover each other's blind
spot, which is worth knowing before anyone proposes folding them into one.

It happened a second time within the hour, which is what makes it a pattern
rather than an anecdote. At carve-php `1f60342` the span declaration is three
rows across seven documents: `paragraph (extent)` came `AGREED` and
`definition_list (extent)` dropped from two documents to one - but the surviving
document is not either of the two the closed issue named. Both `329` fixtures
agree now; what is left is `266-a-reference-definition-is-anchored-at-end-of-line-12`,
where the list's extent runs one line PAST a reference definition it does not
consume, the mirror of the gap that was fixed
([carve-php#1371](https://github.com/markup-carve/carve-php/issues/1371)).

So twice in an hour a fix landed correctly on the documents its issue named and
over-reached onto one it did not. The count moved just enough to read as
progress. A row here is a NODE TYPE, and the documents behind a type turn over
faster than the row does - which is why the ledger records document names in
prose beside each count, and why "the number went down" is not an answer to
"did that gap close".

Both over-reaches were then fixed, and the day's last measurement - taken from a
clone made for it, at carve-js `c8c8dc3`, carve-rs `d981df8` and carve-php
`d2e2fd6` - reads ONE span row across three documents, of 22,766 spans:
carve-php dropping the position of a line block's spaced content
([carve-php#1351](https://github.com/markup-carve/carve-php/issues/1351)). The
same three documents are the owed half of
`resources/ast-position-waivers.txt`, so for the first time that day the two
ledgers describe one gap rather than covering for each other. The value
declaration is empty and carve-rb's tree matches carve-rs on all 1134 shared
documents.

Six measurements in one day, each taken because the one before it had stopped
being true. That is the number worth carrying forward from this section: not
which rows are declared, but how quickly a declared row stops describing
anything, and therefore that the run - not the ledger, and not a merged pull
request - is what answers a question about the engines.

The seventh, on 2026-08-18 at carve-js `020c73e8`, carve-rs `a33c42ad` and
carve-php `f30ebd1` over 1259 corpus documents, made that point again and
changed the kind of row it makes it with. `text (presence)` came `AGREED` and
carve-php's owed position findings emptied; what replaced it is
`hard_break (extent)` on one document, where all three engines publish the same
two offsets and disagree about the line and column the end offset names
([carve-php#1457](https://github.com/markup-carve/carve-php/issues/1457)). The
clause deciding it is not the markup-inclusive rule the other rows turn on but
the sentence beside it: a break owns its line terminator and ends at column 1 of
the following line. Three `permitted` position waivers went in the same run, two
of them lines that had described a node carve-js and carve-rs were placing all
along.

An empty declaration is a statement about the corpus, which is the only thing
the run measures. Until 2026-08-08, four collapsed-reference labels absent
from the corpus split carve-php from the other two, HTML included: one held
`/emphasis/`, one an escape, one a nested link, and one a symbol shortcode
([carve#1011](https://github.com/markup-carve/carve/issues/1011)).
[carve-php#1098](https://github.com/markup-carve/carve-php/pull/1098) fixed them,
and [carve#1021](https://github.com/markup-carve/carve/pull/1021) added them to
the corpus.

**This paragraph said the opposite until 2026-08-08**, recording carve-php as
publishing the rendered text where the other two published the authored label.
That was true when written and stopped being true within hours: carve-js#875 and
carve-rs#799 moved js and rs onto the rendered text the same afternoon. A screen
written from the stale text then reasoned carve-php was the defective engine and
filed against it, which would have made it the sole outlier and undone two
merges.

So it was a design question rather than a divergence, and it is ruled at
[carve#962](https://github.com/markup-carve/carve/issues/962): `ref` carries the
RESOLUTION KEY, and PART 12 §3a above now says so instead of leaving "the derived label"
to be read both ways. What decided it is that the authored label is recoverable
from `rawRef` by stripping its brackets while the key is recoverable from
nothing - `href` holds the SLUG (`#code-heading`), which is a different string
from the key (`code() heading`).

An earlier version of this paragraph recorded something different again - none
publishing `rawRef`, carve-php publishing `ref: ""` - and the rows above
described the same. The engines moved and the page did not, which is the failure
mode this table exists to prevent.

That has now happened to this section **twice**, the second time eleven lines
below this warning. So the warning is worth stating as a rule rather than an
observation: **a measured claim on this page needs re-measuring before it is
cited, and citing it without re-measuring has produced a wrong ticket.** Every
claim above now carries the engine SHA it was measured against, so a reader can
see how old it is.

The PART 12 §7 clause the rows used to carry - carve-js and carve-rs leaving an
`abbreviation_def` inside its container instead of hoisting it - is gone, and
not because either engine moved. The spec answered carve-php#631 with a third
option neither engine had implemented: inside a block quote, a list item or a
div, `*[TERM]: expansion` is NOT A DEFINITION AT ALL. It is ordinary paragraph
text, it defines nothing, and there is no `abbreviation_def` to hoist or leave.

Measured on the issue's own document, a definition inside a div, and on the
block-quote and list-item forms beside it: no engine emits an
`abbreviation_def` in any of the three, and all three render the line as the
literal text the author typed with no `<abbr>` below it. So a row describing
where the node sits describes a node that is not produced.

This is the third way a measured table goes wrong, after "the engine fixed it"
and "the engine regressed": the QUESTION was withdrawn. Both readings the issue
weighed - definitions stay put, definitions hoist - stopped being the choice
once the construct stopped existing in that position.

That is also why the PART 12 §3a row is worth keeping while the others go. The spec
says what the shape is, then the engines conform, then the pin moves; a row is
the accurate record of where an engine is in that order, and it has to be deleted
when the order finishes rather than left behind as a fact.

#### Ingest depth at the nesting cap

Measured against carve-js at the cap of 200, counting the root as level 1:

| shape | structural depth |
|---|---|
| blockquote chain | 406 |
| list ladder | 806 |
| table under blockquotes | 406 |

The figures shift by one with the counting convention; the ratio is the point.
Before `CARVE-P12-028` all three engines got the bound wrong in a different way:
carve-rs bounded structural depth by the AST number and rejected its own
encoder's output ([carve-rs#389](https://github.com/markup-carve/carve-rs/issues/389)),
carve-php inherited `json_decode`'s 512 and surfaced a raw `JsonException`
([carve-php#556](https://github.com/markup-carve/carve-php/issues/556)), and
carve-js had no bound until a `RangeError` somewhere past 1500
([carve-js#498](https://github.com/markup-carve/carve-js/issues/498)).

#### NUL sentinels before the U+0000 ingest rule

A NUL is the natural internal sentinel precisely because no document can hold
one - and two engines reached for it while that guarantee held only on the
parse path.

| engine | the sentinel | what the ingest let through |
| --- | --- | --- |
| carve-rs | `\u0000carve:footnotes-placement\u0000` in rendered HTML | a text node carrying that string pulls the endnotes section into itself, `<p><section role="doc-endnotes">…</section></p>` ([carve-rs#1217](https://github.com/markup-carve/carve-rs/issues/1217)) |
| carve-js | term and expansion joined on a NUL for the PART 11 section 10f abbreviation pair key | `("A"·NUL·"b", "c")` and `("A", "b"·NUL·"c")` key identically, and one occurrence of the first drops the SECOND definition line - deleting the author's text ([carve-js#1294](https://github.com/markup-carve/carve-js/issues/1294)) |

Neither sentinel has to change once the rule holds, which is why the rule sits
at the boundary instead of patching each collision: a guarantee the parser makes
and the ingest does not is not a guarantee.

Before the rule, all three engines let a NUL through ingest and then disagreed
about it (carve-js `8f83eea` and carve-php `b845640` measured 2026-08-22;
carve-rs as recorded in carve-rs#1217). All three emitted it on HTML, Markdown
and plain text; ANSI stripped it with other controls. Their canonical writers
also split: carve-js and carve-rs deleted it, while carve-php emitted it.


#### Generated spaces stored as U+E000

Emitting U+E000 rather than mapping it had visible consequences before
`CARVE-P12-004` was read as it is now: a consumer in this org passed it into
Pandoc JSON and back into Carve source in place of the `\ ` it came from
([carve#721](https://github.com/markup-carve/carve/issues/721)), and
`carve-sile` handed it to SILE, which drew the font's `.notdef` glyph as a box
in the PDF ([carve#1242](https://github.com/markup-carve/carve/issues/1242)).

#### Unknown properties and `start: 1`

Measured before `CARVE-P12-030` landed, carve-js echoed 29 of 31 injected
properties back ([carve-js#709](https://github.com/markup-carve/carve-js/issues/709)).
Before `CARVE-P12-042`, carve-php dropped an ingested `start: 1`, carve-js and
carve-rs re-emitted it, and carve-rs also spelled it as `<ol start="1">`
([carve-js#1391](https://github.com/markup-carve/carve-js/issues/1391),
[carve-rs#1293](https://github.com/markup-carve/carve-rs/issues/1293)).

#### Who derived the node roles

carve-js generates eight tables from the schema, including the per-position
admitted types and the required-field sets; carve-rs generates four and makes
up the difference with rules in its decoder
([carve#2197](https://github.com/markup-carve/carve/issues/2197)).
