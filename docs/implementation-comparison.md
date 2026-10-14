---
description: Choose a Carve implementation by runtime, output formats, integrations, and tested compatibility.
---

# Compare implementations

Carve has reference implementations for JavaScript, Rust, and PHP, plus a
WebAssembly package for browsers and other runtimes. They share the core syntax
and expected output; choose primarily by where your application runs and which
integration it needs.

For exact test runs, corpus accounting, timing methodology, and maintainer
commands, see the [comparison methodology](./implementation-comparison-methodology).

## Quick choice

| Implementation | Best fit | Install and API |
|---|---|---|
| **carve-js** | JavaScript and TypeScript applications, Node-based tooling, and browser bundlers | [carve-js documentation](https://github.com/markup-carve/carve-js) |
| **carve-rs** | Rust applications, native command-line tools, and performance-sensitive services | [carve-rs documentation](https://github.com/markup-carve/carve-rs) |
| **carve-php** | PHP applications, server rendering, and PHP editor integrations | [carve-php documentation](https://github.com/markup-carve/carve-php) |
| **carve-wasm** | Browser or non-Rust runtimes that can host WebAssembly | [carve-wasm documentation](https://github.com/markup-carve/carve-wasm) |

Start with [Get Started](./get-started) for installation examples. The broader
[ecosystem page](./ecosystem) lists bindings, editors, and conversion tools.

## Shared capabilities

The three reference engines support the same core language and are checked
against shared expected results. Their common surface includes:

- parsing Carve and rendering HTML, Markdown, plain text, and ANSI output;
- standard formatting back to Carve;
- parsed document JSON;
- built-in safety requirements;
- core syntax and the shared optional-feature tests;
- diagnostics for unsupported or degraded operations.

A shared language contract does not require identical package names or
framework adapters. Consult an implementation’s own documentation for its
language-native API.

## Output formats

HTML, Markdown, plain text, ANSI, and canonical Carve output are shared by the
three reference engines. If a target format cannot express a Carve feature,
the renderer should follow the [graceful-degradation rules](./graceful-degradation)
and report meaningful loss where the API provides diagnostics.

For DOCX, LaTeX, Typst, EPUB, and other publishing formats, use a tool described
in [Format conversion](./format-bridges).

## Optional features

Standard optional features are designed to behave consistently when enabled,
but registration uses each language’s normal API style. Application extensions
may exist in only one ecosystem. Check [Optional features and
extensions](./extensions) before assuming that a host-specific feature is
portable.

## Compatibility expectations

Use the latest compatible release of your chosen implementation. A release may
temporarily trail a newly accepted language rule even when its development
branch has already caught up. For a feature near a release boundary:

1. check the implementation’s release notes;
2. test a representative document in your deployment version; and
3. consult the technical snapshot if exact cross-engine status matters.

The [comparison methodology](./implementation-comparison-methodology) records
the dated evidence behind conformance claims. Its counts and commit identifiers
are measurements, not a stable user-facing feature list.

## Performance

Runtime startup, process invocation, and embedding strategy often matter more
than parser throughput for small documents. Compare implementations inside your
own application rather than treating CLI timings from another machine as a
benchmark. See [Performance](./performance) for the measurements Carve does
publish and how to interpret them.

## For maintainers

The [technical comparison and methodology](./implementation-comparison-methodology)
contains the current snapshot, test commands, target rules, round-trip and
generated-document checks, pin drift, and corpus bookkeeping.

Comparison output includes the corpus checkout commit, each engine checkout commit, and each engine's recorded and checked-out spec commits. The render comparison’s JSON `--report` includes this data under `revisions`; convert mode prints it to the console. Tracked local changes include a submodule moved off its pin; untracked files are excluded. Missing Git metadata is reported as unknown. These identify the checkouts, not the build provenance of existing binaries. Reproduce a discrepancy against a common spec commit before attributing it to an engine.

### AST JSON measurements

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
| carve-js | PART 12 §3a conformant on the resolved form: publishes `href`, `ref` and `rawRef` together | every block and inline placed, except the categories PART 12 §4 exempts: a coalesced `text` run, a table cell continued on a `+` line, a verbatim run continued on a `+` line, and a line-block column a tab expanded. Owes the second `table_row` of corpus 64-2, unplaced pending a ruling (carve-js#3060). |
| carve-rs | PART 12 §3a conformant on the resolved form: `ref` and `rawRef` survive resolution beside `href` | every block and inline placed, except the categories PART 12 §4 exempts: a coalesced `text` run, a reassembled table cell, a verbatim run continued on a `+` line, and a line-block column a tab expanded. Owes the `pos` of every `cell_wrap` (carve-rs#2695). |
| carve-php | PART 12 §3a conformant on both forms: an unresolved reference is a `link` node, and the collapsed form carries the resolution key in `ref` beside `rawRef`, the same label the other two publish on every corpus document | recorded behind a parse option, enabled whenever it serializes; every block and inline placed, except the categories PART 12 §4 exempts - a coalesced `text` run, a reassembled table cell, a verbatim run continued on a `+` line, and a line-block column a tab expanded |
| carve-rb / carve-py / carve-go / carve-wasm | publish carve-rs's bytes | whatever carve-rs records |

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
