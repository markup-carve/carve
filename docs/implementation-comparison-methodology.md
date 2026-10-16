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

## Core fixture counts (2026-10-07 CEST)

The count-only run covers 2,228 core documents and their 161 target sidecars.
The run scores 2,389 fixtures per engine. It checks expected output on
scored targets; it makes no claim about unscored targets or formatter agreement.

Corpus added since this run: `549-an-ordered-list-carries-its-authored-delimiter`, `19-smart-typography-dashes-and-quotes-10`, `19-smart-typography-dashes-and-quotes-11`, `550-a-dash-run-opens-frontmatter-only-at-the-start-and-only-a-dash-run`, `551-a-link-destination-is-opaque-to-the-bracket-scan`, `552-a-braced-comment-does-not-decide-a-quote`, `19-smart-typography-dashes-and-quotes-12`, `19-smart-typography-dashes-and-quotes-13`, `19-smart-typography-dashes-and-quotes-14`, `19-smart-typography-dashes-and-quotes-15`, `19-smart-typography-dashes-and-quotes-16`, `19-smart-typography-dashes-and-quotes-17`, `19-smart-typography-dashes-and-quotes-18`, `19-smart-typography-dashes-and-quotes-19`, `19-smart-typography-dashes-and-quotes-20`, `19-smart-typography-dashes-and-quotes-21`, `19-smart-typography-dashes-and-quotes-22`, `19-smart-typography-dashes-and-quotes-23`, `19-smart-typography-dashes-and-quotes-24`, `19-smart-typography-dashes-and-quotes-25`, `19-smart-typography-dashes-and-quotes-26`, `19-smart-typography-dashes-and-quotes-27`, `19-smart-typography-dashes-and-quotes-28`, `19-smart-typography-dashes-and-quotes-29`, `19-smart-typography-dashes-and-quotes-30`, `19-smart-typography-dashes-and-quotes-31`, `19-smart-typography-dashes-and-quotes-32`, `553-a-below-column-line-continues-a-paragraph-only-where-one-is-open`, `06-task-lists-3`, `06-task-lists-4`, `06-task-lists-5`, `06-task-lists-6`, `471-braced-emphasis-can-nest-its-own-kind-9`, `471-braced-emphasis-can-nest-its-own-kind-10`, `471-braced-emphasis-can-nest-its-own-kind-11`, `471-braced-emphasis-can-nest-its-own-kind-12`, `471-braced-emphasis-can-nest-its-own-kind-13`, `554-a-caption-scope-resets-at-a-structural-only-line`, `321-delimited-comments-9`, `321-delimited-comments-10`, `321-delimited-comments-11`, `321-delimited-comments-12`, `555-an-unterminated-raw-fence-keeps-literal-payload-termination`, `556-a-closed-block-leaves-no-frame-for-the-line-below`, `557-a-line-retained-after-a-comment-opens-a-paragraph`, `558-a-container-boundary-is-read-at-the-container-s-own-column`, `559-a-tab-inside-a-line-is-content-in-a-label-and-after-a-definition-marker`, `560-a-description-keeps-a-block-at-its-body-column-whatever-leads-the-item`, `561-a-line-block-payload-span-pairs-past-the-content-column`, `562-a-quoted-item-that-ends-on-a-block-past-its-column-holds-no-paragraph`, `563-a-paragraph-in-a-held-container-does-not-loosen-the-item`, `564-a-line-final-run-of-spaces-and-tabs-is-dropped-before-the-line-is-read`, `565-a-tab-is-content-in-a-heading-key-and-in-a-cross-reference-id`, `566-an-opener-past-a-hosted-container-s-column-opens-there`, `567-a-description-marker-followed-by-a-no-break-space-has-content`, `568-a-closed-fence-in-a-quoted-sub-item-after-a-lazy-line-leaves-no-paragraph`, `569-a-quoted-term-takes-a-lazy-line`, `570-an-at-column-comment-retains-nothing`, `571-a-shifted-fence-in-a-quoted-container-s-body-stores-no-continuation-claim`, `572-an-opener-past-a-hosted-container-s-column-interrupts-its-open-paragraph`, `573-a-footnote-reference-in-link-text-keeps-its-id-on-the-sup`, `574-a-head-row-alignment-marker-sets-the-whole-column`, `575-a-line-block-takes-a-lazy-line-whatever-its-last-payload-line`, `576-an-at-sign-before-a-space-and-a-doubled-delimiter-inside-bold-italic-are-text`, `577-a-titled-footnotes-marker-names-the-endnotes-section`, `578-a-closed-fence-at-a-marker-line-note-s-body-column-opens-in-the-note`, `579-a-span-never-covers-another-cell`, `580-a-quote-or-a-term-at-a-marker-line-note-s-body-column-opens-in-the-note`, `581-a-fence-that-leaves-a-closed-nested-item-opens-in-the-host-it-lands-in`, `582-a-footnote-definition-past-a-box-s-column-is-hoisted`, `583-a-comment-between-a-heading-and-a-colon-fence-leaves-the-fence-an-opener`, `584-a-fence-past-the-column-after-an-attribute-line-opens-on-its-authored-base`, `585-a-comment-in-a-marker-line-note-changes-nothing`, `586-a-comment-closes-a-marker-line-note-s-paragraph-and-an-unclosed-fence-below-it-opens-in-the-note`, `587-a-link-definition-or-an-attribute-line-past-a-box-s-column-opens-on-its-authored-base`, `64-table-rowspan-with-multi-line-content-2`, `64-table-rowspan-with-multi-line-content-3`, `588-a-block-quote-and-a-footnote-body-take-the-first-block-form`, `589-an-explicitly-delimited-row-of-blank-cells-is-a-table`, `590-a-closed-fence-in-a-nested-child-leaves-no-paragraph-open`, `591-a-code-line-left-of-an-authored-base-fence-opener-is-measured-from-that-base`, `592-a-fence-closer-below-the-authored-base-is-measured-as-its-payload`, `108-security-hardening-12`, `09-tables-9`, `09-tables-10`, `19-smart-typography-dashes-and-quotes-33`, `19-smart-typography-dashes-and-quotes-34`, `41-line-blocks-11`, `41-line-blocks-12`, `311-a-footnote-in-reference-link-text-nests-the-anchors-too-4`, `593-a-table-row-ends-a-description-body-and-a-lone-plus-folds-into-a-term`, `594-a-continuation-on-a-span-marker-joins-the-cell-the-marker-resolves-into`, `595-a-bare-closer-does-not-reach-inside-a-cross-reference`, `596-an-autolink-or-a-cross-reference-is-atomic-to-brackets-and-braces`, `597-inside-an-unclosed-fence-only-the-innermost-container-s-closer-is-structural`, `598-editorial-markup-closes-outside-a-cross-reference-or-a-bracket-run`, `599-an-autolink-is-opaque-to-the-bracket-scan`, `600-a-delimiter-that-is-part-of-a-larger-character-is-text`, `601-the-combined-bold-italic-token-does-not-open-or-close-inside-a-word`, `602-the-combined-bold-italic-token-does-not-open-after-an-underscore-or-a-slash`, `603-the-combined-bold-italic-token-does-not-open-inside-an-open-bare-italic-or-bold`, `604-an-unclosed-fence-under-an-open-paragraph-in-a-container-opens-nothing`, `605-an-autolink-a-cross-reference-or-a-comment-is-atomic-to-every-outside-delimiter`, `606-an-unclosed-fence-after-an-attribute-line-in-a-container-ends-at-its-closer`, `607-a-quoted-comment-or-attribute-line-closes-the-quote-s-paragraph`, `608-an-unclosed-fence-under-a-multi-line-quote-paragraph-in-a-container-opens-nothing`, `609-an-escaped-cross-reference-spelling-stays-literal`, `610-an-item-comment-or-attribute-line-closes-the-item-s-paragraph`, `611-a-table-row-or-a-definition-under-a-paragraph-ends-it-before-an-unclosed-fence`, `612-a-block-at-an-item-content-column-ends-its-paragraph-before-an-unclosed-fence`, `613-a-definition-or-attribute-line-in-a-nested-container-leaves-no-paragraph-for-an-unmarked-line`, `615-a-line-past-a-body-s-column-is-read-in-the-body-and-a-quote-does-not-rebase`, `616-a-line-is-read-in-the-container-whose-column-it-reaches`.

The first three names, five rows, and the rewritten
`31-ordered-list-start-and-delimiter-2` pin CARVE-P10-014, which no engine has
shipped yet, so they are outside this run's denominators and its `mismatch=0`.
`resources/engine-pin-drift.txt` carries the same six slugs for the pinned
reader.

Category `550` is outside them for the ordinary reason. Its four rows are the
example source's deliberate multi-pair `::: compare` block, added after this run
on a host with no carve-rs checkout to retake the three-engine sweep with
(markup-carve/carve#2833). No engine lags the rule they pin.

Category `551` is outside them for the same reason: its six rows pin link
destination opacity and were added after this run (markup-carve/carve#2859). No
engine lags the rule. All three render the six documents as pinned, which is what
`check-expected` reports beside them, and the shapes they do not cover are the
ones the executable spec itself still reads the old way (markup-carve/carve#2860).

Category `589` is outside them because it was added after this run. It pins
an explicitly delimited row of blank cells as a table row
(markup-carve/carve#2879), which carve-js ships as of `43dd6096` and carve-php
and carve-rs do not yet. The same ruling changed four expectations inside
this run's denominators after it was taken, `113-a-pipe-pair-with-no-cell-is-not-a-table`
and three rows of `453-a-row-whose-every-cell-is-blank-is-not-a-table`, so this
run's `mismatch=0` no longer holds for them. The other four rows of category
`453` are controls every engine still reproduces.

The fixture trees match spec commit `2c3d174b`. The runner reported tracked
changes in the spec worktree; the engine worktrees were clean at the commits
below. These are checkout identities, separate from binary build provenance.
Rebuild each engine before reproducing the run. Engine spec submodules were not
initialized because these runs read this repository's corpus directly.

Earlier measurements remain in the
[previous snapshot](https://github.com/markup-carve/carve/blob/2c3d174b605ab8da3c0c2e59e5c1067f20aafa9d/docs/implementation-comparison-methodology.md),
including the
[2026-09-26 five-target core run](https://github.com/markup-carve/carve/blob/312001fcb712cf3c210990d2134c4f9faa1dd94c/docs/implementation-comparison-methodology.md).

<div class="impl-summary-grid">
  <div class="impl-summary-card">
    <strong>2228 / 2228</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>2228 / 2228</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>2228 / 2228</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>Not measured</strong>
    <span>unscored target agreement</span>
  </div>
</div>

| Implementation | Commit | Corpus | Scored fixtures | Mismatches | Errors |
|----------------|--------|--------|-----------------|------------|--------|
| Rust | `2530cad55` | `2228 / 2228` | `2389 / 2389` | `0` | `0` |
| JS | `c8d619190` | `2228 / 2228` | `2389 / 2389` | `0` | `0` |
| PHP | `b193a1265` | `2228 / 2228` | `2389 / 2389` | `0` | `0` |

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

Optional corpus added since this run: `66-smart-typography-quotes-off-html`,
`66-smart-typography-quotes-off-markdown`, `66-smart-typography-quotes-off-plain`,
`66-smart-typography-quotes-off-ansi`.

The optional profile was measured on 2026-10-07 CEST with the same engine commits as
the core snapshot. It enables a shared adapter per feature where each
implementation exposes one. Unsupported feature/implementation combinations are
reported as skipped, not failures.

The run covered 32 features across 65 cases. Every row below is from that run; `skipped`
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
| Rust | `65 / 65` | `0` | `0` | `0` |
| JS | `65 / 65` | `0` | `0` | `0` |
| PHP | `65 / 65` | `0` | `0` | `0` |

Optional cross-implementation diffs: `0`

All 65 optional cases reached all three engines.
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
which is why the current core run scores 2,389 fixtures for 2,228 documents.

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
marker), the probe's column (below, at and
past every content column, and over-indented), quote markers written or
omitted, and a follower (a column-0 line, a blank, an unclosed fence, a colon
closer of another width, a line at the content column). Single containers are
enumerated in full and nestings are sampled, 6,795 documents in all.

Each document renders through the executable spec, carve-js, carve-php and
carve-rs. The run compares HTML with each line trimmed and reports every
divergence together with the implementation that is the odd one out. The
engines are passed explicitly, so a stale sibling checkout cannot join a run:

```bash
npm run block-family:check -- --js=<carve-js>/dist/index.js --php=<carve-php> \
  --rust=<carve-rs>/target/release/carve --report=/tmp/block-family.json
```

`--spec=<carve checkout>` measures another revision of the executable spec,
and `--filter=<name>` re-runs one slice. Like the other differentials, a
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
profile=default/no-opt-in corpus=core selected_corpus=none corpus_pairs=2228 shard=0/1 targets=html,markdown,plain,carve,ansi
rust: pass=2389/2389 mismatch=0 error=0 skipped=0 runs=2389
  mismatching documents: 0
js: pass=2389/2389 mismatch=0 error=0 skipped=0 runs=2389
  mismatching documents: 0
php: pass=2389/2389 mismatch=0 error=0 skipped=0 runs=2389
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
profile=optional/opt-in corpus=optional selected_corpus=none corpus_pairs=65 shard=0/1 targets=html,markdown,plain,ansi
target_note=optional corpus renders each case on the target its manifest entry pins (html unless stated); --targets filters that set
rust: pass=65/65 mismatch=0 error=0 skipped=0 runs=65
  mismatching documents: 0
js: pass=65/65 mismatch=0 error=0 skipped=0 runs=65
  mismatching documents: 0
php: pass=65/65 mismatch=0 error=0 skipped=0 runs=65
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=57 diffs=0 errors=0 fixtures=yes
markdown: compared=3 diffs=0 errors=0 fixtures=yes
plain: compared=3 diffs=0 errors=0 fixtures=yes
ansi: compared=2 diffs=0 errors=0 fixtures=yes
```

The resolver case runs through host callbacks in carve-js and carve-php, and
through a library example binary in carve-rs. The optional corpus also covers
the eight diagram presets, both diagram aliases, and display math. These cases
compare hydration wrappers without invoking graphics libraries.

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
checked out at its latest published release, resolved once per run, so a merge
to an engine's main cannot change the verdict on a spec PR. Engine regressions
on main surface in the scheduled workflow instead.

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
