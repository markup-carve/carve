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

Corpus added since this run: `441-a-definition-between-two-open-content-columns-reaches-the-outer-one`,
`442-a-marker-folds-only-strictly-between-the-item-s-base-and-content-column`,
`443-an-unterminated-comment-fence-in-a-list-item-is-the-line-form`
`444-an-opener-at-or-past-a-description-body-s-column-closes-its-paragraph`,
`445-a-degraded-comment-fence-at-a-container-s-column-0-keeps-the-follower-in-the-item`,
`446-a-degraded-comment-fence-leaves-a-lazy-follower-where-the-line-form-does`,
`447-the-host-does-not-change-which-column-a-definition-reaches`,
`448-a-marker-folds-into-a-quote-below-it`
and
`449-a-comment-below-a-description-body-s-column-ends-the-body`
and
`450-a-closed-fence-in-a-description-body-ends-it`
and
`451-a-container-in-a-host-body-owns-a-line-past-its-own-content-column`
and
`452-an-empty-unterminated-container-ends-at-a-flush-left-line`
and
`453-a-row-whose-every-cell-is-blank-is-not-a-table`
and
`454-a-block-opener-past-a-nested-footnote-definition-opens-in-the-item`
and
`455-an-unterminated-fence-on-a-nested-lead-in-a-description-body-owns-its-body`
and
`456-a-definition-nested-past-a-footnote-body-is-a-note-and-a-reference-below-it-resolves`
and
`457-a-container-closer-closes-its-container-in-a-footnote-body-too`,
`458-a-wrapped-attribute-block-ends-at-its-quote-and-reaches-no-line-below-it`,
`459-a-trailing-line-after-a-consumed-definition-is-placed-by-column-reach`
and
`460-a-nested-note-s-floor-is-two-columns-past-its-own-marker`
and
`461-a-column-0-line-after-a-description-hosted-note-is-a-document-sibling`
and
`462-include-directive-with-no-resolver-renders-literal`
and
`463-a-bare-closer-does-not-reach-inside-a-braced-inline`
and
`464-a-block-that-opens-a-tight-item-is-written-on-the-marker-line`
and
`465-an-underscore-pair-in-text-is-escaped-where-the-line-would-pair-it`
and
`466-the-round-trip-comparison-normalizes-a-named-list`
and
`467-a-bare-closer-does-not-reach-inside-a-link-destination`
and
`468-an-underscore-pair-split-across-a-line-break-is-escaped`
and
`469-an-empty-link-destination-is-not-a-link`
and
`470-a-quote-is-an-ordinary-link-destination-character`
and
`12-inline-code-7`
and
`84-single-line-headings-6`
and
`84-single-line-headings-7`
and
`84-single-line-headings-8`
and
`84-single-line-headings-9`
and
`84-single-line-headings-10`
and
`12-inline-code-8`
and
`12-inline-code-9`
and
`12-inline-code-10`
and
`152-leading-attribute-brace-before-an-inline-span-stays-literal-2`
and
`12-inline-code-11`
and
`12-inline-code-12`
and
`471-a-forced-opener-of-an-open-kind-is-literal`
and
`472-substitution-content-is-inline-and-only-a-top-level-arrow-splits-it`
and
`152-leading-attribute-brace-before-an-inline-span-stays-literal-3`
and
`47-numbered-cross-references-10`
and
`47-numbered-cross-references-11`
and
`473-a-run-of-asterisks-inside-a-combined-token-is-content`
and
`474-glued-attribute-blocks-on-an-inline-element-merge`
and
`475-footnote-references-take-an-attribute-run-editorial-substitution-and-comment-take-none`
and
`476-an-item-s-fence-is-read-once-whatever-block-it-follows`
and
`477-a-code-span-closes-only-on-a-run-of-its-own-length-whatever-the-length`
and
`478-a-definition-body-s-open-code-fence-ends-at-a-line-below-its-column`
and
`479-a-closer-below-the-container-s-column-does-not-count`
and
`480-a-bare-colon-opener-in-a-description-body-is-an-opener`
and
`481-a-bare-colon-run-interrupts-a-paragraph-whether-or-not-a-line-follows-it`
and
`482-a-closer-does-not-rescue-a-marker-line-colon-opener-whose-body-folded-in`
and
`483-an-empty-term-marker-in-a-description-body-is-text`
and
`484-a-delimiter-after-an-underscore-or-slash-opens-only-when-that-one-pairs`
and
`485-a-quote-after-an-escaped-quote-closes`
and
`486-any-character-is-content-of-the-combined-bold-italic-token`
and
`487-a-form-feed-or-a-no-break-space-is-content-wherever-whitespace-is-tested`
and
`488-a-quote-after-a-bare-delimiter-follows-what-that-delimiter-does`
and
`489-a-caption-s-placeholder-is-any-that-does-not-begin-a-tag`
and
`490-a-comment-inside-a-forced-span-or-the-combined-token-ends-at-its-closer`
and
`491-an-unresolved-reference-s-literal-source-is-html-escaped-like-any-other-text`
and
`492-adjacent-strong-spans-use-html-only-where-their-delimiters-merge`
and
`493-empty-containers-share-one-html-body-shape`
and
`494-an-explicit-table-head-span-keeps-one-row-group`
and
`495-a-table-foot-span-keeps-one-row-group`
and
`496-a-title-or-label-fills-the-container-body-slot`
and
`497-a-footnotes-placement-marker-inside-a-container-does-not-place`.

Entries through 491 landed on a host with no engine checkouts, so the run above
could not be retaken and its numbers describe the corpus WITHOUT them. Section
492 through 497 also postdate the snapshot, so they are excluded from the dated
count.
Editing the denominators by hand would publish a three-engine measurement
nobody took, and one that is knowably wrong besides: carve-rs and carve-php
both read a definition between two open content columns as lazy text today
(markup-carve/carve-rs#1505, markup-carve/carve-php#1856), and the JS column
would be wrong for section 443 as well, whose band the pinned build answers its
own way (markup-carve/carve-js#1602), and for section 444, which no engine reads
the ruled way yet (markup-carve/carve-js#1604, markup-carve/carve-php#1874,
markup-carve/carve-rs#1525) and for section 445, which no engine reads the ruled
way either (markup-carve/carve-js#1607, markup-carve/carve-php#1877,
markup-carve/carve-rs#1529). Section 446 is the one exception: every engine
already reads that band the ruled way, so its rows would only widen the
denominators. Section 448 is the widest of them: seven of its thirteen rows are
the fold no engine performs yet (markup-carve/carve-js#1615,
markup-carve/carve-php#1882, markup-carve/carve-rs#1537), and the other six are
its controls, which every engine already reproduces - so a hand-edited
denominator would be wrong for the folds and right for the controls, in one
number that could not say which.
Section 451 is measured rather than argued: the pinned build reads SIX of its
nine rows differently from the executable spec, a definition consumed past an
inner container content column and a lazy run ending early at a closer
(markup-carve/carve-js#1637), and all six are declared in
`resources/engine-pin-drift.txt`. A hand-edited `1550 / 1550` would therefore
be false in the JS column by six, and unmeasured in the other two: the engine
checkouts on this host are mid-work and their builds do not match any commit
the run could name.
Section 452 lags for one row only, and the reason is the mirror of the others:
the pinned build folds a flush-left line into an empty container for the
MARKER-LINE spelling (markup-carve/carve-js#1641), where carve-php and carve-rs
both answer the ruled way. Its other four rows every engine already reproduces,
so a hand-edited denominator would be right for four and wrong for one, in one
number that could not say which.
Section 453 lags for three of its seven rows: `|||`, `| | |` and `|= |` are
the empty-row cases all three engines still open as tables
(markup-carve/carve-js#1643, markup-carve/carve-php#1910,
markup-carve/carve-rs#1556), and the other four are controls every engine
already reproduces. A hand-edited denominator would be wrong for three and
right for four, in one number that could not say which.
Section 454 lags for two of its four rows: a heading and a quote one column
past a nested footnote definition, which the pinned build demotes to text
while carve-php, carve-rs and carve-js main open the block (the pin lags
markup-carve/carve-js#1634). Its other two rows every engine already
reproduces. A hand-edited denominator would be wrong for two and right for
two, in one number that could not say which.
Section 455 lags for all four of its rows: an unterminated fence on a nested
lead in a description body, which all three engines answer three different
wrong ways (markup-carve/carve-js#1650, markup-carve/carve-php#1913,
markup-carve/carve-rs#1559) - none of them the ruled fence-owns-body answer.
A hand-edited denominator would be wrong for all four, since no engine
reproduces the ruling yet.
Section 456 lags for both of its rows: a nested-footnote stack where all three
engines read the innermost definition as text, not a note
(markup-carve/carve-php#1895, markup-carve/carve-js#1653, markup-carve/carve-rs#1560).
A hand-edited denominator would be wrong for both.
Section 457 lags for both of its rows: a container closer inside a footnote
body, where the pinned build keeps the closer as text. carve-rs already
matches; carve-php and carve-js are ported (markup-carve/carve-php#1914,
markup-carve/carve-js#1654). A hand-edited denominator would be wrong for both.
Section 458 does NOT lag any engine: the wrapped-attribute boundary fix brings
the oracle onto carve-rs and the pinned carve-js, which already produce it, so
its three rows are added since the run but every engine reproduces them. It is
listed because the published run predates it, not because any engine disagrees.
Section 462 does NOT lag any engine either: it pins what a `{{ path }}` directive does
with NO resolver configured, which is nothing - it stays literal text. That is
what every engine already produces, including one that has never heard of PART 9
section 19, because expansion is processor-level and off by default. It is
listed because the published run predates the row.
Section 473 does NOT lag any engine: carve-js, carve-php and carve-rs all read a
run of asterisks inside `/*...*/` as content, and it is the executable reference
that markup-carve/carve#2135 brought to them. It is listed because the published
run predates the row; a counts-only run over the whole corpus scored 1892/1892 on
every engine with no cross-implementation diff.
Section 476 lags all three engines, which fold the fence into the caption or
the quoted paragraph while still ending the item at the below-column line; so
does the moved row `276-...-7`, whose published result predates the move
(markup-carve/carve-js#1880, markup-carve/carve-php#2205,
markup-carve/carve-rs#1800).
Section 477 lags carve-php on one row of ten, the substitution whose code
span holds `~}` (markup-carve/carve-php#2209). carve-js and carve-rs, and the
pinned carve-js build, reproduce all ten.
Section 478 lags all three engines on two of its five rows, which read the fence
and the description the two ways section 476 describes for a list item
(markup-carve/carve-js#1880, markup-carve/carve-php#2205, markup-carve/carve-rs#1800),
and carve-php on a third, the control whose line folds after a closed fence
(markup-carve/carve-php#2210).
Section 479 lags carve-rs on six of its seven rows, carve-php on four and
carve-js on one, the definition body with a flush-left closer
(markup-carve/carve-js#1883, markup-carve/carve-php#2211,
markup-carve/carve-rs#1802, markup-carve/carve-rs#1803).
Section 480 lags no engine on its five bare-opener rows. carve-php misses the
control whose div holds a paragraph (markup-carve/carve-php#2210), and all three
read the code-fence control two ways, as section 478 records
(markup-carve/carve-js#1880, markup-carve/carve-php#2205,
markup-carve/carve-rs#1800).
Section 481 does NOT lag any engine: carve-js, carve-php and carve-rs already
open a bare `:::` at the end of its container, as CARVE-P9-016's example does,
and it is the executable reference that markup-carve/carve#2151 brought to
them. It is listed because the published run predates the row.
Section 482 lags carve-js on all six of its ruled rows and carve-php on five
(markup-carve/carve-js#1889, markup-carve/carve-php#2216). carve-rs reads the
ruled shape and misses the nested item and the paragraph-then-opener control
(markup-carve/carve-rs#1808).
Section 483 lags all three engines on five of its six rows, which end a
description body at an empty term marker (markup-carve/carve-js#1891,
markup-carve/carve-php#2218, markup-carve/carve-rs#1812).
Section 484 does NOT lag any engine: carve-js, carve-php and carve-rs already
keep a delimiter literal after a `_` or `/` that does not pair, and it is the
executable reference that markup-carve/carve#2156 brought to them. It is listed
because the published run predates the row.
Section 485 does NOT lag any engine either: all three already close a quote
after an escaped quote, and markup-carve/carve#2158 brought the executable
reference to them.
Section 486 lags no engine at main: all three keep the combined token whole
around a tab or any other character, which markup-carve/carve#2159 brought the
executable reference to. The pinned carve-js misses the tab-before-closer
control, which carve-js main fixed (markup-carve/carve-js#1887).
Section 487 lags carve-rs on three of its twelve rows: the combined token after
a form feed (markup-carve/carve-rs#1817) and the two heading references around
a no-break space (markup-carve/carve-rs#1818). carve-js and carve-php read all
twelve the ruled way, and markup-carve/carve#2157 brought the executable
reference to them.
Section 488 does NOT lag any engine: carve-js, carve-php, carve-rs and the
pinned build all decide a quote after a bare delimiter by what that delimiter
does, and markup-carve/carve#2164 brought the executable reference to them.
Section 489 lags carve-php and carve-rs on its two controls, where a `#` that
begins a tag is numbered anyway (markup-carve/carve-php#2227,
markup-carve/carve-rs#1820), and carve-js, carve-php and the pinned build on
the word-glued row (markup-carve/carve-js#1900, markup-carve/carve-php#2228).
markup-carve/carve#2165 brought the executable reference to CARVE-P2-022, and
carve-rs reads every row but the controls the same way.
Section 490 does NOT lag any engine: carve-js, carve-php, carve-rs and the
pinned build already end a `%%` comment at a forced span's closer or the
combined token's `*/`, and markup-carve/carve#2167 brought the executable
reference to them.
Section 491 lags carve-rs on its first document, where an unresolved
reference's literal source loses a no-break space instead of folding it to
`&nbsp;` (markup-carve/carve-rs#1823, open). carve-js, carve-php and the
pinned build already fold it, and markup-carve/carve#2168 brought the
executable reference to PART 10 SS2's one-entity exception.
Section 497 lags carve-php and carve-rs, which place the endnotes section inside
the block quote instead of degrading the marker
(markup-carve/carve-php#2372, markup-carve/carve-rs#1894). carve-js and the
pinned build already render the ruled shape, which is what made
markup-carve/carve#2274 rulable rather than a three-way guess.
Section 463 no longer lags an engine. A bare closer inside a braced inline
(`~{/x/}{/y~/}`) used to close a span opened before the braces; markup-carve/carve#2027
ruled that it may not, and all three now match.
Section 464 lags no engine on HTML or on the canonical Carve spelling
(markup-carve/carve#2017).
Section 467 no longer lags an engine. A bare closer inside a link destination
or autolink used to close a span opened before the link; markup-carve/carve#2027
ruled that it may not, and all three now match.
Section 468 lags no engine on HTML; carve-rs leaves its split underscore pair
bare in Markdown (markup-carve/carve-rs#1653).
`12-inline-code-7` no longer lags an engine: all three drop the space before
the forced span's closer (markup-carve/carve#2051).
`84-single-line-headings-6` through `-10` no longer lag an engine on HTML or
Markdown; all three escape the heading's trailing hash run
(markup-carve/carve#2052).
`12-inline-code-8` and `-9` lag carve-js and carve-rs, which read a link after an
earlier construct's backtick as literal text (markup-carve/carve-js#1815,
markup-carve/carve-rs#1733).
`47-numbered-cross-references-10` lags carve-php, which numbers a `#` inside
emphasis (markup-carve/carve-php#2169); `-11` lags no engine, since all three
already number a caption that opens on the bare `#` (markup-carve/carve#2112).
Section 471 lags the engines on five of its eight rows, and the eighth lags
carve-rs alone, which nests a lone delimiter of the span's own kind
(markup-carve/carve-rs#1741). Two nest a forced
opener inside an open span of its kind (markup-carve/carve-js#1831,
markup-carve/carve-php#2111, markup-carve/carve-rs#1741), and three do not give
a braced span of another kind its own scope (markup-carve/carve-js#1841,
markup-carve/carve-php#2135, markup-carve/carve-rs#1747).
`tests/implementation-comparison-counts.test.mjs` reads this line and counts the
fixtures each category contributes, so the numbers cannot be asserted, only
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

The optional profile enables a shared adapter per feature where each
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
| `symbol-map` | pass | pass | skipped |
| `tabs` | pass | pass | pass |
| `tabs-aria` | pass | pass | pass |

carve-rs reaches every row except host resolver callbacks through its binary.
The callbacks remain library-only because command-line values cannot carry host
functions. `symbol-map` is the one row where carve-php is not reached.

| Implementation | Optional pass | Skipped | Mismatches | Errors | Avg CLI ms/file |
|----------------|---------------|---------|------------|--------|-----------------|
| Rust | `49 / 49` | `1` | `0` | `0` | `4.23` |
| JS | `50 / 50` | `0` | `0` | `0` | `94.35` |
| PHP | `49 / 49` | `1` | `0` | `0` | `59.80` |

Optional cross-implementation diffs: `0`

Read the `Skipped` column against a corpus of 50. carve-js reaches all 50 and
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

In the core corpus only `html` has expected-output fixtures. The other four are
compared **implementation against implementation**, because identical output
across the three engines is the invariant that matters there, and committing
four more expected files per corpus case would not add to it. The `Target
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
profile=optional/opt-in corpus=optional corpus_pairs=50 shard=0/1 targets=html,markdown,plain,ansi
target_note=optional corpus renders each case on the target its manifest entry pins (html unless stated); --targets filters that set
rust: pass=49/49 mismatch=0 error=0 skipped=1 runs=49 avg_ms=4.23
  mismatching documents: 0
js: pass=50/50 mismatch=0 error=0 skipped=0 runs=50 avg_ms=94.35
  mismatching documents: 0
php: pass=49/49 mismatch=0 error=0 skipped=1 runs=49 avg_ms=59.80
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=42 diffs=0 errors=0 fixtures=yes
markdown: compared=3 diffs=0 errors=0 fixtures=yes
plain: compared=3 diffs=0 errors=0 fixtures=yes
ansi: compared=2 diffs=0 errors=0 fixtures=yes
target_agreement_note=every optional case has an expected-output fixture on the target it pins; the counts here also assert that the implementations agree with each other.

Optional feature coverage
social-link-templates (html): rust, js, php
symbol-map (html): rust, js
smart-quotes-locale-de (html): rust, js, php
bare-url-autolink (html): rust, js, php
citations-numbered (html): rust, js, php
citations-author-date (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
code-callouts (html): rust, js, php
code-callouts (html): rust, js, php
code-callouts (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
citations-numbered (html): rust, js, php
details (html): rust, js, php
list-table (html): rust, js, php
spoiler (html): rust, js, php
tabs (html): rust, js, php
smart-typography-off (html): rust, js, php
symbol-map (markdown): rust, js
markdown-typography-source (markdown): rust, js, php
section-wrapper-off (html): rust, js, php
source-line-after-generated-id (html): rust, js, php
plain-typography-source (plain): rust, js, php
ansi-typography-source (ansi): rust, js, php
plain-typography-source (plain): rust, js, php
markdown-typography-source (markdown): rust, js, php
ansi-typography-source (ansi): rust, js, php
smart-typography-default (plain): rust, js, php
semantic-span (html): rust, js, php
semantic-span (html): rust, js, php
list-table (html): rust, js, php
citations-numbered (html): rust, js, php
list-table-columns-1344 (html): rust, js, php
list-table-local-headers-1248 (html): rust, js, php
tabs (html): rust, js, php
tabs-aria (html): rust, js, php
tabs-aria (html): rust, js, php
tabs (html): rust, js, php
social-link-resolvers (html): js, php

All optional cases reached at least two engines.

Extension capability matrix
rust: inline matcher, block matcher, after_parse, before_render, inline extension renderer, block extension renderer
js: inline matcher, block matcher, afterParse, beforeRender, inline extension renderer, block extension renderer
php: inline matcher, block matcher, parsed-document hook, before-render hook, render listeners, converter registration
extension_profile_note=optional Tier-2 cases run only where an implementation exposes the matching adapter.
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
