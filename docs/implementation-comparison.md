---
description: How the reference engines compare on conformance, and how the cross-implementation sweep is run.
---

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
    <strong>735 / 755</strong>
    <span>Rust corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>735 / 755</strong>
    <span>JS corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>737 / 755</strong>
    <span>PHP corpus pass</span>
  </div>
  <div class="impl-summary-card">
    <strong>0</strong>
    <span>cross-implementation diffs</span>
  </div>
</div>

| Implementation | Commit | Corpus | Mismatches | Errors | Avg CLI ms/file |
|----------------|--------|--------|------------|--------|-----------------|
| Rust | `5b03787` | `735 / 755` | `0` | `0` | `3.01` |
| JS | `8105210` | `735 / 755` | `0` | `0` | `76.02` |
| PHP | `a5f18fb` | `737 / 755` | `0` | `0` | `68.54` |

Spec commit: `2cde4a1`, plus the three corpus cases this change adds

<details>
<summary>Corpus changes and engine windows since this snapshot</summary>

Corpus added since this run: `254-colon-fence-separator-must-be-a-space`,
`255-colon-fence-metadata-slots-must-be-a-space-too`,
`256-table-cell-padding-must-be-a-space`,
`257-link-and-image-title-slots-must-be-a-space`,
`258-code-fence-metadata-slots-must-be-a-space-too`,
`259-a-tab-continues-a-list-item-just-as-two-spaces-do`,
`260-an-absorbed-colon-fence-leaves-a-block-quote-s-paragraph-open`,
`261-a-blank-line-holds-spaces-and-tabs-and-nothing-else`,
`262-a-link-title-takes-exactly-one-space`,
`263-a-code-fence-opener-takes-exactly-one-space`,
`264-a-frontmatter-opener-takes-exactly-one-space`,
`265-a-reference-definition-s-metadata-slots-take-exactly-one-space`,
`266-a-reference-definition-is-anchored-at-end-of-line`,
`267-a-definition-marker-s-separator-is-a-space-and-it-is-a-run`,
`268-trailing-whitespace-on-a-content-line-is-dropped`,
`269-a-definition-body-continuation-indented-past-its-column-is-lazy-text`,
`270-a-real-div-in-a-container-and-the-flush-left-line-after-it`,
`271-the-flush-left-line-after-a-container-a-quoted-line-opened`,
`272-an-autolink-body-admits-non-ascii-and-excludes-format-characters`,
`273-the-inline-attribute-interior-is-space-only-the-attribute-line-is-not`,
`274-a-quoted-attribute-value-stops-at-the-newline`,
`275-a-collapsed-reference-reaches-a-heading-by-the-heading-s-rendered-text`,
`276-a-fence-opened-on-a-list-marker-line-body-below-the-content-column`,
`277-a-below-column-marker-after-a-comment-where-no-paragraph-is-open`,
`278-a-list-marker-at-the-content-column-inside-an-open-fence`,
`279-a-boundary-line-inside-an-open-fence-does-not-end-the-container`,
`280-a-container-a-lazy-line-folded-into-is-still-open`,
`281-a-caption-attaches-across-one-blank-line`,
`282-two-blank-lines-detach-a-caption`,
`283-an-empty-footnote-body-is-written-with-the-empty-sentinel`,
`289-a-structural-attribute-leads-the-author-s-own`,
`290-adjacent-sibling-lists-survive-the-round-trip`,
`291-a-fence-keeps-the-blank-line-at-the-end-of-its-content`,
`292-a-boolean-and-a-key-value-of-the-same-name-are-one-attribute`,
`293-a-semantic-name-renames-the-span-and-the-leftovers-ride-the-element`,
`294-a-language-attribute-is-exact-sugar-for-lang`,
`295-a-malformed-language-tag-leaves-the-whole-block-literal`,
`296-a-language-attribute-and-lang-are-one-key`,
`297-the-language-sigil-takes-no-padding`,
`298-a-boolean-lang-is-the-third-spelling-of-the-same-key`,
`299-the-semantic-registry-holds-no-element-carve-already-spells`,
`45-inline-extensions-7`,
`45-inline-extensions-8`,
`45-inline-extensions-9`,
`45-inline-extensions-10`; `97-boolean-attributes` changed its expected HTML
under the same semantic-span rule,
`302-a-math-span-s-base-class-keeps-the-class-slot-in-place`,
`304-an-angle-bracket-is-escaped-only-where-it-opens-markup`,
`305-an-abbreviation-expands-inside-an-inline-container`,
`306-a-captioned-quote-holds-more-than-one-block`,
`307-an-empty-inline-note-is-literal`,
`308-a-multi-letter-ordered-marker-opens-no-list`,
`309-a-note-s-content-recognizes-no-note`,
`310-a-footnote-in-link-text-nests-the-anchors`,
`311-a-footnote-in-reference-link-text-nests-the-anchors-too`,
`312-a-note-body-s-own-references-resolve`,
`313-a-reference-link-s-text-survives-its-own-frame`,
`314-a-footnote-in-an-unresolved-reference-is-not-a-reference`,
`315-an-inline-note-s-content-resolves-after-the-note`,
`316-an-image-s-alt-text-closes-where-a-link-s-text-closes`,
`317-an-editorial-comment-s-bracket-is-content-not-the-close`,
`318-composite-figures`,
`319-cell-attributes-bind-after-the-kind-and-alignment-markers`,
`320-the-canonical-writer-glues-a-code-fence-to-its-info-string`,
`321-delimited-comments`,
`322-an-attribute-block-reaches-the-nested-list-it-precedes`,
`323-a-block-attached-after-an-invisible-line-leaves-the-item-tight`,
`324-an-abbreviation-definition-in-an-item-body-is-paragraph-text`,
`325-an-attribute-line-after-a-continuation-marker-attributes-the-attached-block`,
`326-a-column-0-line-after-a-container-s-last-block-when-that-block-left-no-paragraph-open`,
`327-a-continuation-marker-attaches-one-block-and-the-boundary-is-that-block-s-extent`,
`328-an-unclosed-verbatim-run-in-a-row-stops-at-the-closing-pipe`,
`329-a-floating-attribute-is-scoped-to-the-container-that-holds-it`,
`330-a-tab-after-a-fence-or-a-frontmatter-opener-depends-on-where-it-sits`,
`331-an-unclosed-inline-run-in-a-line-block-reaches-the-end-of-the-block`,
`332-which-inline-content-a-heading-id-is-derived-from`,
`333-a-continuation-row-s-open-run-and-an-escaped-closing-pipe`,
`334-a-label-beginning-with-an-at-sign-is-not-a-reference-label`,
`335-a-comment-fence-at-an-item-s-content-column-registers-nothing-either`,
`336-a-footnote-definition-inside-an-item-s-comment-registers-nothing`,
`337-a-comment-fence-opened-on-an-item-s-marker-line-hides-its-body-too`,
`338-a-comment-fence-one-item-deeper-registers-nothing-either`,
`339-a-wider-comment-fence-inside-an-item-hides-its-body-the-same-way`,
`340-an-abbreviation-inside-a-comment-defines-nothing`,
`341-a-comment-fence-inside-a-colon-container-registers-nothing`,
`342-url-list-attributes-are-probed-token-wise`,
`343-an-escaped-hash-keeps-its-escape-at-a-container-s-content-position`,
`344-a-comment-only-line-in-a-line-block-is-removed-before-any-inline-run`,
`345-a-line-block-s-hard-break-keeps-its-backslash`,
`346-a-line-block-s-last-body-line-keeps-its-backslash`,
`347-a-comment-fence-reached-through-a-quote-registers-nothing-either`,
`348-a-closed-inline-construct-spanning-a-verse-boundary`,
`349-a-container-whose-table-ends-on-a-continuation-row`,
`350-a-definition-at-a-container-s-content-column`,
`351-a-bracketed-construct-spanning-a-line-boundary`,
`352-a-bracketed-construct-s-identifiers-stay-on-one-line`,
`353-a-bracketed-construct-spanning-a-verse-boundary`,
`354-a-continuation-row-joins-the-row-above-it-whatever-its-cells-hold`,
`355-a-container-whose-table-ends-on-a-joined-header-row`,
`356-a-quote-inside-a-quote-is-asked-what-it-ends-on`,
`357-a-block-at-a-container-s-content-column-ends-the-paragraph-whatever-it-renders`,
`358-what-a-content-column-block-does-not-reach`,
`359-a-footnote-definition-s-block-runs-to-the-end-of-its-body`,
`360-a-definition-behind-an-alternating-container-prefix-registers-at-the-innermost-content-column`,
`361-a-paragraph-opened-after-a-block-in-an-item-is-still-open-for-a-lazy-line`,
`362-an-unterminated-container-does-not-extend-the-item-past-a-blank-line`,
`363-a-task-item-s-checkbox-is-not-decided-by-its-first-block`,
`364-only-lazy-folding-demotes-a-marker-line-colon-opener`,
`365-a-blank-line-before-a-sibling-marker-separates-the-items-whatever-consumed-it`,
`366-a-raw-block-keeps-the-blank-line-at-the-end-of-its-payload-too`,
`367-an-unterminated-fence-at-a-content-column-opens-no-block-so-the-paragraph-stays-open`,
`369-a-quote-is-reached-by-its-marker-and-a-column-never-reaches-into-one`,
`372-an-all-blank-raw-payload-still-emits-its-line`,
`374-a-collected-definition-closes-the-item-paragraph`,
`382-a-marker-line-link-definition-is-collected-where-no-paragraph-is-open`,
`383-a-lazy-marker-line-s-definition-defines-nothing-in-any-container`,
`384-a-continuation-marker-attaches-only-a-flush-left-block`,
`393-an-engine-written-shape-says-what-it-is-called`,
`394-a-leading-escaped-caret-keeps-its-escape`,
`397-a-null-byte-is-replaced-before-the-document-is-read`,
`398-a-container-s-span-ends-at-its-last-placed-child`,
`399-a-definition-list-ends-at-its-last-placed-child-too`,
`400-a-container-starts-at-its-opening-markup-even-where-its-first-child-is-unplaced`,
`401-a-marker-at-an-item-content-column-opens-a-sublist-first-in-the-item-or-not`,
`402-a-container-ends-at-the-markup-that-closes-it-even-where-its-last-child-is-unplaced`,
`403-an-idle-escape-does-not-spread-from-the-occurrence-that-needed-one`,
`404-a-caption-s-marker-separator-is-a-run-and-none-of-it-is-content`,
`405-a-quote-holding-a-captioned-block-indents-it-like-any-other-nested-block`,
`406-a-heading-s-marker-separator-is-a-run-and-none-of-it-is-content`,
`407-one-consumed-boolean-spells-the-looseness-no-blank-line-can`,
`408-the-writer-spells-looseness-only-where-a-blank-line-cannot`,
`409-a-blank-line-loosens-an-item-only-when-a-paragraph-follows-it`,
`410-a-footnote-continuation-survives-a-blank-run`,
`411-a-lone-indented-image-is-a-paragraph-and-its-html-cannot-say-so`,
`412-a-lone-reference-image-at-column-0-in-every-spelling`,
`413-an-item-s-attribute-block-moves-its-content-column-its-checkbox-does-not`,
`05-lists-25`,
`05-lists-26`,
`05-lists-27`,
`05-lists-28`.

Every category up to and including `334` landed on a host that could not retake
the run above, so its numbers describe the corpus WITHOUT them. The alternative
was to edit the denominators by hand, which would have published a
three-engine measurement nobody took - and one that is knowably wrong: all three engines still accept a
tab in every table-cell padding slot (measured on carve-js, carve-php and
carve-rs main under carve#904 - every tab form renders byte-identical to its
space form), and carve-js and carve-php still read a title after a tab at every
form of the `link_title` slot (measured under carve#907 on carve-js `3d95e94`
and carve-php `876e312`).

`335` THROUGH `341` ARE A SECOND KIND OF LAG, and they are declared for a
different reason than every category before them. The host that added them HAD
all three checkouts and could have retaken the run. It did not, because two of
the engines failed six of the seven ON PURPOSE: those documents pin a rule
carve-rs and carve-php had drifted from (carve#1309, markup-carve/carve-rs#1047,
markup-carve/carve-php#1349), so a retaken snapshot's mismatch counts would
describe a window two open fixes were closing, and would go stale the day either
one landed. Naming the window is what the declaration is for, and here it is the
honest line where a fresh measurement would be the misleading one.

ONE OF THOSE TWO FIXES HAS SINCE LANDED, so the window is now narrower than the
paragraph above described it. markup-carve/carve-rs#1052 merged, and carve-rs
main renders all seven byte-exact - re-measured here on `71318e91`, whose parent
still failed `335` through `339`, which is what makes the seven documents
load-bearing rather than trivially green. **carve-php is the only engine still
behind**, on `335` through `340` (markup-carve/carve-php#1349); `341` never
failed on any engine. The declaration is kept rather than deleted because the
run above still predates all seven, but it now names one engine, not two: a
declared lag that keeps naming an engine somebody has since fixed reads as
verified while being false, which is the failure this device exists to prevent.

`404` AND `405` ARE DECLARED ON ONE MEASURED ENGINE, which is less than `394`
had and is said plainly rather than rounded up. Both documents pin the ORACLE
against the engines - the executable spec kept a caption's marker-separator run
as content, and put a quoted figure's three lines on the quote's own line - so
what the pair asserts is the reading all three engines already had. It was
verified on the carve-js this repository pins and on carve-js `main`, and not on
carve-php or carve-rs, which is why they are declared and not counted
(carve#1575).

`406` IS DECLARED ON THE PINNED ENGINE ALONE, which is one measurement fewer
than `404` and `405` carry and is said rather than rounded up to match them.
Its pair pins the ORACLE against the engines - the executable spec kept a
heading's marker-separator run as content - so what the pair asserts is the
reading all three engines already had. Both documents render byte-identically
in the carve-js this repository pins (`d9cb2c7`); carve-js `main`, carve-php and
carve-rs were not measured, which is why the category is declared and not
counted (carve#1581).

`409` AND `410` ARE THE SECOND KIND OF LAG, like `335` through `341` and unlike
everything between: the engines that fail them fail them on purpose, because
both categories pin a ruling made after those builds shipped. `409-2` is the
shape carve#1622 ruled tight, which carve-php reads loose, and every `410`
document is the shape carve#1620 ruled stays in the note, which carve-php and
carve-rs eject. Both rulings have engine work behind them - carve-rs#1294 landed
the narrowed tightness rule - so a retaken snapshot's mismatch counts would
describe a window that is being closed rather than a disagreement. All seven
documents render byte-identically in the carve-js this repository pins
(`71add23f`); carve-php and carve-rs were not measured here, and the run above
predates all seven either way.

`394` IS DECLARED THOUGH ITS ENGINES WERE MEASURED, because measuring three
engines is not retaking the run. Its one document renders byte-identically in
carve-js `d9cb2c7`, carve-php `49e3e34` and carve-rs `54f596f2`, and all three
write it back unchanged (carve#1472) - but those are three builds of a host's
own choosing, not the three this page quotes, and the five-target transcript
above was not retaken. Editing the denominators on that evidence would publish
a run nobody made, which is the objection stated two paragraphs up. So the
category is declared and the numbers stand as measured.

`411` IS DECLARED FOR A WINDOW THE HTML COLUMN CANNOT SHOW, which is a first on
this page and worth stating plainly. carve#1660 ruled that an indented lone
image is a paragraph holding an inline image and not a block image, against the
engine split two to one: `docs/divergence-from-djot.md` section 15 says a
top-level block opener must start at column 0, so an indented one cannot be a
block image whatever two engines do. carve-js is right, and carve-rs and
carve-php promote it (markup-carve/carve-rs#1341,
markup-carve/carve-php#1681).

The two documents in this category nevertheless PASS on all three engines and
on the oracle. A paragraph whose whole content is one image renders as a bare
`<img>` with no `<p>` wrapper, so the indented reading and the promoted one emit
the same bytes; what differs is the tree, `paragraph > image` against a
top-level `image`. So the mismatch counts above would not move even if the run
were retaken today, and the reader that fails is `npm run ast:check`'s SHAPE
comparison, which is where this window is visible.

The declaration is kept for the ordinary reason - the quoted run predates the
category - and it names the two engines rather than the corpus, so it fails from
both sides: it goes red here if either category stops contributing fixtures, and
whoever retakes the run has to delete the line. The engine half closes when
those two tickets land, and `ast:check` is what says so; a line still naming an
engine somebody has fixed reads as verified while being false, which is the
failure this device exists to prevent.

`412` IS DECLARED FOR THE ORDINARY REASON - the quoted run predates the category -
and it is worth saying what it does NOT mean. All four of its documents pass on
all three engines and on the oracle, so the mismatch counts above would not move
if the run were retaken; the declaration is about which corpus the numbers
describe, not about an engine owing anything.

The category exists because nothing in the corpus held a lone reference image at
column 0, so what the reference spellings do there was unpinned while the direct
spelling was pinned many times over (carve#1663). The three engines agree, and
`412` is the record of that agreement. Three of its four pairs are invisible to
this page by construction - a paragraph whose whole content is one image renders
as a bare `<img>` with no `<p>` wrapper, so they pass whatever the tree holds -
and the reader that can tell those trees apart is `npm run ast:check`'s SHAPE
comparison.

`413` IS DECLARED THE SAME WAY, and it is the one place on this page where the
declaration hides a real movement rather than none. The quoted run predates the
category, so its numbers describe a corpus without it - but unlike `412`, the
three engines did NOT agree when it was written: each read exactly one of its two
spellings as an item continuation and they disagreed about which (carve#1692).
carve-rs and carve-php moved to carve-js's reading in the same release, so a
retaken run would find all four documents conformant; a run taken BEFORE those
two landed would have found two of them failing on two engines each. The
declaration says which corpus the numbers describe and nothing about which
engines were right, which is exactly why the movement has to be stated here in
words.

A CATEGORY THAT ALREADY EXISTED CAN GO STALE TOO, and the declaration above
cannot say so - it names categories ADDED since the run, and its count is
derived by listing their files, so adding an older category to it would subtract
pairs the quoted denominator still counts. Corpus 252's three documents were
REWRITTEN under carve#906, from a tab being an attribute-block separator to a
tab disqualifying the block, and all three engines still produce the old answer
(measured on carve-js `0c71c7d`, carve-php `d993758` and carve-rs `2d5de72`).
So the `pass=690/690` above is stale by three documents in a way the
declaration mechanism has no slot for; `resources/engine-pin-drift.txt` carries
them per document, which is where a rewritten expectation is visible.

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

Category 260 is the same window for a different reason, and the reason is
measured rather than assumed. Its four documents were rendered through the
oracle, carve-js `3d95e94`, carve-php `876e312` and carve-rs `83ab9c1` while it
was written: the oracle, carve-js and carve-php agree byte for byte on all four,
and carve-rs main ends the quote at the absorbed fence on all four. That is
markup-carve/carve-rs#727, whose fix markup-carve/carve-rs#738 is open and not
merged - built from that PR, carve-rs reproduces all four exactly. So the gap is
one engine and one open PR, and it closes when that PR lands rather than on any
pin bump. The pinned JS build reproduces all four, so nothing is declared for it
in `resources/engine-pin-drift.txt`.

Categories 262 through 265 are a different window again, and the difference is
worth naming: they are NOT pin lag. carve#912 ruled that the four productions
spelling a padding slot as exactly one `space` are right and that the artifacts
accepting a run are lax - and the artifacts accepting a run were all three
engines AND the executable spec, measured on carve-js `68ea9ba`, carve-php
`1664ee1` and carve-rs `2ec3c1c`. So there is nothing here that a pin bump
clears. The six two-space documents close when the engines ship the rule
(markup-carve/carve-js#819, markup-carve/carve-php#972,
markup-carve/carve-rs#744); each category's one-space CONTROL is reproduced by
the pinned build today and is not declared anywhere, which is what separates
"the rule is not implemented yet" from "the fixture matches no engine at all".

Category 266 is the same window and the same reason: carve#911 ruled that
`reference_definition` is anchored at end of line, and all three engines read
trailing junk as part of a definition on main (carve-js `68ea9ba`, carve-php
`1664ee1`, carve-rs `2ec3c1c`). It closes with markup-carve/carve-js#821,
markup-carve/carve-php#973 and markup-carve/carve-rs#746.

That ruling also moved one PRE-EXISTING golden, `16-reference-link-5`, which
pinned `[r]: a b c` resolving the label to `a`. It is declared in
`resources/engine-pin-drift.txt` alongside the new categories rather than
here, because it is not new corpus and the declared-lag line names categories
that the quoted run could not have covered.

Category 267 is the third of the same kind. carve#892 corrected
`footnote_definition` and `abbreviation_definition` to spell their separator
`space+`, and ruled that the run is ASCII spaces so the first other character
is CONTENT. Every engine changes somewhere: measured under that ticket on
carve-js `b3f49d7`, carve-rs `0a613b2` and carve-php `c15991f`, no engine gave
the same answer for all three markers and no two agreed on all three. It closes
with markup-carve/carve-js#822, markup-carve/carve-php#974 and
markup-carve/carve-rs#747.

Category 268 is the fourth, and the one where the ORACLE was already right.
carve#926 made PART 2's trailing-whitespace rule general - it holds on every
content line, not only a paragraph's last - and all three engines keep the run
before a soft break, measured on carve-js `6647523`, carve-php `3de1184` and
carve-rs `fcb879d`. It closes with markup-carve/carve-js#829,
markup-carve/carve-php#980 and markup-carve/carve-rs#751.

Category 362 is declared for the narrowest reason on this page: the snapshot was
not retaken, and nothing else. Its three documents were rendered through the
oracle, carve-js `7cd66e0`, carve-php `8a28c20` and carve-rs `16a1b83` while
they were written, and all four agree byte for byte on all three - the engines
were already right and the ORACLE was the odd reader, folding a flush-left line
into an unterminated `:::` div across a blank line where every engine ends the
item (carve#1379). So there is no engine window here to close and no pin bump
that changes anything; the declaration exists only because the quoted
denominator above predates the category, and it should be deleted by whoever
next runs `npm run compare:impls`.

Category 363 is declared with an OPEN engine window, unlike 362 above. Its one
document was rendered through the oracle, carve-js `7cd66e0`, carve-php
`8a28c20` and carve-rs `16a1b83` while it was written. carve-js and carve-php
reproduce it byte for byte; carve-rs emits the same checkbox but writes it BELOW
the `<li>` opener, on a line of its own at column 0, rather than on the opener
line. That is a placement difference and not the dropped-checkbox defect the
document is about (markup-carve/carve-rs#1102), so this category will not match
carve-rs until that lands. The declaration exists to name that window as well as
the stale denominator.

Category 364 is declared for the narrowest reason, like 362 and unlike 363. Both
its documents were rendered through the oracle, carve-js `7cd66e0`, carve-php
`8a28c20` and carve-rs `16a1b83` while they were written, and all four agree
byte for byte on both - the engines were already right and the ORACLE was the
odd reader, demoting a marker-line `:::` opener to literal text when a blank
line followed it (carve#1382). There is no engine window here to close; the
declaration exists only because the quoted denominator above predates the
category.

Category 365 is declared with an OPEN engine window, like 363. Its three
documents were rendered through the oracle, carve-js `7cd66e0`, carve-php
`8a28c20` and carve-rs `16a1b83` while they were written. carve-js and carve-rs
reproduce all three byte for byte. carve-php reproduces the `:::` div document
and the different-axis control and misses the code-fence one, where it keeps the
list tight: it already loosens the same shape under a div, an admonition, a raw
block and a comment fence, and a code or tilde fence is the only place it does
not (markup-carve/carve-php#1445). This category will not match carve-php until
that lands.

Category 366 is declared with an OPEN engine window for the same reason. Its
three documents were rendered through the oracle, carve-js `020c73e`, carve-php
`f30ebd1` and carve-rs `a33c42a` while they were written. carve-js and carve-rs
reproduce all three byte for byte. carve-php reproduces the no-blank control and
misses the two that carry a blank: it drops a raw block's trailing blank line
from the payload, at document level and inside an item alike, while keeping the
same blank in a code fence - which is what category 291 pins, and which it
reproduces. This category will not match carve-php until that lands.

Category 367 is declared with an OPEN engine window on two engines. Its six
documents were rendered through the oracle, carve-js `020c73e`, carve-php
`f30ebd1` and carve-rs `a33c42a` while they were written. carve-js reproduces
all six byte for byte. carve-php and carve-rs reproduce the block quote
document and all three controls, and miss the list-item and definition-body ones:
each ends the container on an unterminated fence at its content column while
rendering that fence line as paragraph text, and each already folds the same
shape under a block quote. This category will not match those two until that
lands.

Category 369 is declared with an OPEN engine window on two engines. Its four
documents were rendered through the oracle, carve-js `020c73e`, carve-php
`f30ebd1` and carve-rs `a33c42a` while they were written. carve-rs reproduces
all four byte for byte. carve-js and carve-php reproduce both controls and miss
the two that carry the rule: each DROPS the definition-shaped line at the
quote's content column, rendering nothing and defining nothing, which is the
outcome carve#624 forbids. This category will not match those two until that
lands.
</details>

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
`pass=690/690` under `corpus_pairs=675`. What it drops is the rest of the
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
profile=default/no-opt-in corpus=core corpus_pairs=755 targets=html,markdown,plain,carve,ansi
rust: pass=690/690 mismatch=0 error=0 skipped=0 runs=3375 avg_ms=3.01
  mismatching documents: 0
js: pass=690/690 mismatch=0 error=0 skipped=0 runs=3375 avg_ms=76.02
  mismatching documents: 0
php: pass=690/690 mismatch=0 error=0 skipped=0 runs=3375 avg_ms=68.54
  mismatching documents: 0
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=692 diffs=0 errors=0 fixtures=yes
markdown: compared=692 diffs=0 errors=0 fixtures=1
plain: compared=692 diffs=0 errors=0 fixtures=1
carve: compared=692 diffs=0 errors=0 fixtures=13
ansi: compared=692 diffs=0 errors=0 fixtures=none
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

<details>
<summary>Optional corpus changes since this snapshot</summary>

Optional corpus added since this run: `42-list-table-header-rows-cols`,
`43-citations-at-label-in-reference-position`, `46-tabs-css-panel-name`,
`47-tabs-aria-panel-binding`, `48-tabs-aria-single-selection`,
`49-tabs-css-single-selection`.

The first pins `{header-rows}` / `{header-cols}` on a list table; the second is
the citations-side control for the core rule that a label beginning with an at
sign is not a reference label. The next two are the two halves of extensions
§13.2 and §13.3 - a `css`-mode panel named by its tab, and an `aria`-mode panel
bound rather than named. The last two are §13.5 under both modes: two marked
items select one tab, and the same one in each. All six landed after the run
above was taken, so the corpus is six cases ahead of it. The
declaration is the same device the core block uses: it names the cases and
carries no count, so there is nothing in it to fabricate, and
`tests/implementation-comparison-counts.test.mjs` fails both when a named case
stops existing and when the run is retaken without deleting the line.

</details>

Timings are from one machine and mean nothing across rows; the counts are the
point. `tests/implementation-comparison-counts.test.mjs` fails if the
`corpus_pairs` quoted here stops matching the corpus, which is how this block
came to say 4 when the corpus held 33.

```text
Implementation summary
profile=optional/opt-in corpus=optional corpus_pairs=43 targets=html,markdown,plain,ansi
rust: pass=12/12 mismatch=0 error=0 skipped=29 runs=12 avg_ms=5.21
js: pass=42/42 mismatch=0 error=0 skipped=0 runs=42 avg_ms=157.43
php: pass=39/39 mismatch=0 error=0 skipped=2 runs=39 avg_ms=103.44
cross_impl_diffs=0

Target agreement (implementations compared against each other)
html: compared=33 diffs=0 errors=0 fixtures=yes
markdown: compared=3 diffs=0 errors=0 fixtures=yes
plain: compared=3 diffs=0 errors=0 fixtures=yes
ansi: compared=2 diffs=0 errors=0 fixtures=yes

Optional feature coverage
social-link-templates (html): rust, js, php
symbol-map (html): rust, js
smart-quotes-locale-de (html): rust, js, php
bare-url-autolink (html): js, php
citations-numbered (html): js, php
code-callouts (html): js, php
...

All optional cases reached at least two engines.
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
  `scripts/lib/converter-formats.mjs` with the reason (today: carve-rs has no
  BBCode importer). A format an engine can
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
