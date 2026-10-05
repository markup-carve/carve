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

## Core fixture counts (2026-09-30)

The count-only run covers 2,164 core documents and their 161 target
sidecars. Each engine passed all 2,325 scored fixtures. The run checks expected
output on each scored target; it does not compare unscored targets and makes no
formatter or full-target agreement claim.

Corpus added since this run: `535-a-marker-line-opaque-quote-keeps-overindented-markers-literal`,
`536-a-denied-destination-takes-one-render-loss-row-per-sink`,
`537-invalid-named-container-metadata-keeps-the-subtree`,
`538-multiple-table-bodies-have-positional-source-metadata`,
`539-empty-table-bodies-keep-their-source-boundaries`,
`540-a-table-with-no-bodies-keeps-its-head-and-foot`,
`541-invalid-table-body-metadata-stays-ordinary`,
`542-a-span-across-bodies-keeps-their-header-semantics`,
`543-a-head-and-foot-consuming-all-rows-leave-no-implicit-body`,
`544-explicit-body-counts-include-native-header-cells`,
`545-an-unreferenced-footnote-definition-takes-its-links-out-of-the-render`,
`546-every-name-lookup-compares-case-exactly`.

The 36 ownership controls were added after this count snapshot. They are not
included in its denominators. The paired Rust fix merged in
[carve-rs #2228](https://github.com/markup-carve/carve-rs/pull/2228); this
recorded comparison still excludes these controls.

Category 536 pins the two-row denied-destination case (carve#2679) and was also
added after the snapshot, so it sits outside the denominators too.

The Rust and PHP checkouts carried uncommitted carve#2643 lint changes; the
JavaScript checkout was clean when the run started. The table lists their base
commits. The lint changes affect diagnostics, not the measured render paths. The corpus
includes the bracket-boundary controls and quoted-slot cases for carve#2645
and carve#2587.

<details>
<summary>Earlier corpus measurements (2026-09-26 through 2026-09-30)</summary>


The [2026-09-26 five-target core run](https://github.com/markup-carve/carve/blob/312001fcb712cf3c210990d2134c4f9faa1dd94c/docs/implementation-comparison-methodology.md)
covered all 1,882 documents at spec commit `add5471c`, including the 338 that
the preceding 1,544-document run had left in a declared-lag list. The notes
below record subsequent corpus additions before the count refresh.

Corpus added after the earlier run: `502-an-attribute-line-under-an-attributed-sub-item-stays-in-that-item`,
`503-a-block-opener-indented-under-a-definition-term-is-term-text-at-every-depth`,
`504-a-comment-or-a-definition-under-a-definition-term-folds-at-every-depth`,
`505-a-verbatim-line-keeps-what-sits-past-its-fence-opener-not-past-its-container`,
`506-comment-columns-and-surviving-list-items`,
`507-a-list-marker-in-a-raised-colon-container-folds-into-its-open-paragraph`,
`508-a-comment-span-s-closer-below-its-host-s-column-stays-a-delimiter`,
`509-a-fence-closer-below-a-nested-item-s-column-ends-containers-down-to-its-owner`,
`510-a-nested-quoted-term-leaves-no-paragraph-for-a-lazy-line`,
`511-a-fence-in-a-quote-stores-no-continuation-claim`,
`512-a-comment-span-s-closer-column-does-not-move-the-item-s-ownership`,
`513-a-comment-span-opened-below-every-content-column-is-located-there`,
`514-a-fence-a-container-inside-a-quote-holds-open-stores-no-claim`,
`515-a-nested-marker-comment-keeps-its-own-ownership`,
`516-a-heading-comment-preserves-code-span-content`,
`517-a-band-paragraph-after-an-invisible-line-leaves-the-item-loose`,
`518-a-trailing-comment-takes-a-tab-a-run-start-and-its-whole-separator`,
`519-a-shifted-fence-in-a-quoted-item-stores-no-continuation-claim`,
`520-a-dropped-raw-block-takes-no-line-in-the-container-that-holds-it`,
`521-a-zero-line-and-a-one-blank-raw-payload-are-not-the-same-block`,
`522-an-emphasis-marker-does-not-pair-across-a-link-bracket`,
`523-a-link-title-crosses-a-soft-wrap-and-an-attribute-value-does-not`,
`524-an-empty-code-payload-renders-no-characters`,
`525-a-link-inside-a-span-s-label-keeps-its-destination`,
`526-a-quoted-value-and-a-quoted-title-escape-different-sets`,
`527-a-tab-does-not-open-the-title-slot`,
`528-a-footnote-body-whose-every-block-renders-nothing-is-an-empty-body`,
`529-a-container-label-publishes-its-inline-run`,
`530-a-fence-after-a-footnote-quote-has-its-own-base`,
`531-an-opener-under-a-quote-in-a-nested-host-opens-at-one-column-only`,
`532-a-container-label-preserves-closed-inline-constructs-before-cutting-a-comment`,
`533-a-braced-span-cannot-close-beyond-its-bracket-run`,
`41-line-blocks-10`.
The first landed on a host whose three engine checkouts were each on an
unmerged branch, so the run above could not be retaken against clean ones; the
remaining cases landed after the run, so its numbers describe the corpus without
them. 505's four documents were measured against carve-js `c5df77f6`, carve-rs
`3cb8a685` and carve-php `77a83856`, which agree with the oracle on all four.
508's six were measured against carve-js `c5df77f6`, carve-php `9fc5fae` and
carve-rs `3a8403d`: all three agree on the two control documents and disagree
with the oracle on the four the ruling moved, which
[carve#2488](https://github.com/markup-carve/carve/issues/2488) tracks per
engine.

511's four colon-fence documents were measured against carve-js `cc9bed84`,
carve-rs `main` and carve-php `415dfe28`: carve-js and carve-rs reproduce all
four, carve-php keeps the unmarked line in the outer quote on the three nested
spellings, which
[carve-php#2664](https://github.com/markup-carve/carve-php/issues/2664) tracks.

512's nine were measured against the pinned carve-js `c5df77f6` only, because this
host carries no carve-rs or carve-php checkout: it reproduces the three
definition documents and the two whose closer sits at the opener's column, and
reads the closer's column on the other four, which
`resources/engine-pin-drift.txt` declares. The other two engines are unmeasured
here.

514's twelve were measured against the pinned carve-js only, for the same reason:
it reproduces the four controls and keeps the unmarked line inside the quote on
the other eight, which `resources/engine-pin-drift.txt` declares per document.
carve-rs and carve-php are unmeasured here; no engine carries the rule yet.

513's eight were measured against carve-js `58c747bf0` and carve-php `ab0648469`,
each built from its own default branch: both reproduce all eight. carve-rs
`cd1bb9cce` reads the closer's column on five of them, the gap
[carve#2530](https://github.com/markup-carve/carve/issues/2530) records.
509's twelve were measured against carve-js `c5df77f6`: it agrees on the four the
[carve#2490](https://github.com/markup-carve/carve/issues/2490) ruling leaves
where they were and diverges on the other six, which
`resources/engine-pin-drift.txt` declares.

515's five were measured against the pinned carve-js. It reproduces the line
comment and the two spans whose closers sit at their openers' columns. The two
below-column closers retain the outer item, declared in
`resources/engine-pin-drift.txt` under
[carve#2526](https://github.com/markup-carve/carve/issues/2526).

516's eight heading documents match the pinned carve-js `c5df77f6`. They were
added after the three-engine snapshot; Rust and PHP were not measured for this
change.

517's five band-column documents match the pinned carve-js `c5df77f6`, which
reads all five the way this ruling does. carve-js `main` (`4c89ca26b`) does not:
`002ef9fcc` (carve-js#2300) turned the three band paragraphs tight and the
attached sub-list loose, and its parent `aa481d0d6` reproduces all five, so the
engine held the reading a day before the pin was measured. carve-php
`2742f8175` reads the three band paragraphs tight and splits the attached
sub-list document into three lists, which is an ownership question this ruling
does not reach. carve-rs is unmeasured here.

518's thirteen were measured against the pinned carve-js `c5df77f6`, which
reproduces eleven of them: the tab separator, the whole separating run and the
run start all read the way PART 9 §21 states them in a paragraph, a definition
term, a table cell, a figure caption and a link label. It keeps the comment in a
div label, and those two rows are declared in `resources/engine-pin-drift.txt`
under [carve#2552](https://github.com/markup-carve/carve/issues/2552). Rust and
PHP were not measured: this host's checkouts of both sit on branches another
task holds, so neither could be built from its default branch.
519's four documents were added after this snapshot. The pinned carve-js
`c5df77f6` reproduces the paragraph control and retains the unmarked line inside
the quote on the other three. `resources/engine-pin-drift.txt` records those
measured differences under [#2554](https://github.com/markup-carve/carve/issues/2554).

520's eight dropped-raw documents match the pinned carve-js `c5df77f6` byte for
byte. Seven of them did not match the oracle before this change: five list-item
hosts wrote the text `null` where the dropped block stood, the colon div left a
blank line, and the footnote body left one and moved the backlink into a
paragraph of its own. The eighth, the `=html` control, already agreed. Measured
over a generated sweep of 19 hosts and 6 payloads, 33 shapes moved and all 33 now
match the pin. carve-rs `a40be82b6` reproduces all eight as well, each from a
worktree built off its default branch. carve-php `b6845d49f` reproduces seven and
differs on the footnote body: it gives the backlink a paragraph of its own, which
is PART 9 section 16 read over the AST's last block rather than the rendered one,
tracked at
[carve-php#2711](https://github.com/markup-carve/carve-php/issues/2711).

521's nine raw-payload documents match the pinned carve-js `c5df77f6` on all
nine, measured document by document: it encodes a zero-line payload as `""` and
a one-blank-line payload as `"\n"`, the distinction PART 2 `raw_block` requires,
while the oracle encoded both as `""` until this change. carve-php `2742f817`
and carve-rs `840e38cf` collapse the two in HTML the way the oracle did, which
[carve#2557](https://github.com/markup-carve/carve/issues/2557) measured rather
than this host; neither engine was built here.

524's two empty-code-payload documents split against the pinned carve-js
`ddcae5d4`, measured by running the `engine:report` check over both. The
one-blank document reproduces; the zero-line one does not, because the pin emits
a newline where `code_content` preserves zero characters, and
`resources/engine-pin-drift.txt` declares that row. carve-php and carve-rs are
unmeasured here: every checkout on this host sits on an unmerged branch, one of
them mid-merge, so [carve#2560](https://github.com/markup-carve/carve/issues/2560)
carries their readings rather than this page.
522's three documents and 523's six were added after this snapshot and were
measured against all four builds: the pinned carve-js `c5df77f6`, carve-js
`fb0e08e8`, carve-php `b6845d49` and carve-rs `0bf06bc3`, the three engines'
default branches at the time. On 522 every build pairs the emphasis marker
across the link bracket and writes `<p><em>[a</em>](/u)</p>`, where PART 8
resolves the link first; the two controls reproduce everywhere. The pinned row
is declared in `resources/engine-pin-drift.txt` under
[#2565](https://github.com/markup-carve/carve/issues/2565), which also carries
the per-engine obligation. On 523 all four builds reproduce all six documents,
including the image title and the two controls: the defect
[#2566](https://github.com/markup-carve/carve/issues/2566) reports was in this
repo's own grammar, not in an engine.

525's nine documents were measured against four builds: the pinned carve-js
`c5df77f6` and the three default branches, carve-js `e5ff631b0`, carve-php
`650e65499` and carve-rs `b4c4f5a08`, the last built here from a clean clone.
All four reproduce all nine, the six span-label documents and the three
link-label controls alike, so no engine owes anything and no pinned row is
declared. The defect
[#2578](https://github.com/markup-carve/carve/issues/2578) reports was in this
repo's own renderer.

526's ten documents and 527's three were measured against carve-js
`e5ff631b0`, carve-php `650e65499` and carve-rs `b4c4f5a08`, the same three
default branches. All three reproduce all thirteen. On 526 they read the full
`escaped_char` set in a quoted attribute value, which is what the production
says and what the ohm grammar did not; on 527 they leave a tab-padded title
closed, which the production and the ohm already said. The ohm's own note
claimed the engines accepted that tab, and
[#2581](https://github.com/markup-carve/carve/issues/2581) is where the
measurement replaced the claim.

528's six documents were measured against carve-js `991f8e0`, the pinned carve-js
`c5df77f6` and carve-php `0175e15e`, each from a clean clone installed here. All
three reproduce all six: a footnote body whose every block renders nothing takes
the same spelling as an empty one, and the two controls keep their visible block
on its own line. This renderer was the outlier and
[#2570](https://github.com/markup-carve/carve/issues/2570) moved it. carve-rs is
NOT measured here: the release binary on this host sits in a target directory
several checkouts share and reports no version, so nothing establishes which
commit built it. The earlier withdrawn ruling on this shape rested on a reading
of that kind, so it is left out rather than quoted.

531's thirteen documents were measured against the pinned carve-js `c5df77f6`,
carve-js `db5a3e9c`, carve-rs `04222a4f` and carve-php `d20294bc`, the last three
from clean clones installed and built here. All four reproduce all thirteen, so
`resources/engine-pin-drift.txt` gains no line.
[carve-rs#2183](https://github.com/markup-carve/carve-rs/issues/2183) recorded
this band as a carve-rs divergence, measured at `d8e95bdef`; carve-rs#2185 landed
the fold and that reading no longer holds at carve-rs `main`. The row is the
first fixture that can tell the two answers apart, which is what it is for now
that the engines agree.

The former case-by-case notes remain in the
[previous snapshot](https://github.com/markup-carve/carve/blob/a22f6a23f7913e44cb3461f3f608605660619032/docs/implementation-comparison-methodology.md).

</details>

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>2164 / 2164</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>2164 / 2164</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>2164 / 2164</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>Not measured</strong>
    <span>unscored target agreement</span>
  </div>
</div>

| Implementation | Commit | Corpus | Scored fixtures | Mismatches | Errors |
|----------------|--------|--------|-----------------|------------|--------|
| Rust | `3db5e6201` | `2164 / 2164` | `2325 / 2325` | `0` | `0` |
| JS | `6d02fa706` | `2164 / 2164` | `2325 / 2325` | `0` | `0` |
| PHP | `7033d04b1` | `2164 / 2164` | `2325 / 2325` | `0` | `0` |

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
| Rust | `53 / 53` | `0` | `0` | `0` |
| JS | `53 / 53` | `0` | `0` | `0` |
| PHP | `53 / 53` | `0` | `0` | `0` |

Optional cross-implementation diffs: `0`

All 53 optional cases reached all three engines in the resolver-adapter recheck.
A skip is visible in the count and does not count as a pass.

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

To reproduce the core fixture counts, use the engine base commits in the table
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
profile=default/no-opt-in corpus=core corpus_pairs=2164 shard=0/1 targets=html,markdown,plain,carve,ansi
rust: pass=2325/2325 mismatch=0 error=0 skipped=0 runs=2325
  mismatching documents: 0
js: pass=2325/2325 mismatch=0 error=0 skipped=0 runs=2325
  mismatching documents: 0
php: pass=2325/2325 mismatch=0 error=0 skipped=0 runs=2325
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
profile=optional/opt-in corpus=optional corpus_pairs=64 shard=0/1 targets=html,markdown,plain,ansi
rust: pass=64/64 mismatch=0 error=0 skipped=0 runs=64
  mismatching documents: 0
js: pass=64/64 mismatch=0 error=0 skipped=0 runs=64
  mismatching documents: 0
php: pass=64/64 mismatch=0 error=0 skipped=0 runs=64
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=56 diffs=0 errors=0 fixtures=yes
markdown: compared=3 diffs=0 errors=0 fixtures=yes
plain: compared=3 diffs=0 errors=0 fixtures=yes
ansi: compared=2 diffs=0 errors=0 fixtures=yes
```

The resolver case runs through host callbacks in carve-js and carve-php, and
through a library example binary in carve-rs. The optional corpus also covers
the eight diagram presets, both diagram aliases, and display math. These cases
compare hydration wrappers without invoking graphics libraries.

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
checked out at its latest published release, resolved once per run, so a merge
to an engine's main cannot change the verdict on a spec PR. Engine regressions
on main surface in the scheduled workflow instead.

Optional corpus added since this run: `65-tabs-invalid-title-recovery`.
