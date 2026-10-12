---
description: Read Carve 0.1 container ownership as one procedure, with the clause that each step decides.
---

# Container ownership procedure

PART 0 of the grammar states container ownership as one procedure: four steps,
a transition table and three named exceptions. This page follows that order and
names the clauses each step decides. It adds no rule. The source clauses in
`resources/spec/01-layout.ebnf` are authoritative, and the
[machine-readable map](https://github.com/markup-carve/carve/blob/main/resources/spec/ownership-procedure.json)
lists all 22 Part 0 rule IDs with the checker helpers that implement each step.
Those helpers are implementation entry points, not a public parser API.

Other parts of the grammar still cite the steps by their earlier names. S1 is
O1, S2 is O1's opaque-body rule, S3 is O4 on a line that supplied every prefix,
S4 is O2 to O4 on a line that did not, and S5 is O4's push.

## Normalize source

Strip a leading byte order mark and replace every NUL before the first line is
read. Columns are measured on the result. Rules: CARVE-P0-001 and CARVE-P0-002.

## O1 Strip prefixes

Walk the open containers from the document inward and consume each one's prefix:
a `>` for a quote, indentation to the content column for a list item, a
definition body or a footnote body. Stop at the first prefix the line does not
supply. Indentation never supplies a quote marker, and a quote marker written
after a blank does not inherit the columns of a quote that ended.

An opaque body (code, raw, a matched comment span) takes its line before any
other step. If the line misses the prefix of the body's host, the body does not
get it. Comments are then classified as layout-transparent tokens, before an
owner is selected. Rules: CARVE-P0-005, CARVE-P0-013 and CARVE-P0-019.

## O2 Select the owner

The innermost frame whose prefix the line supplied owns it. A line at or past
an indentation container's content column supplied the prefix. A line below it
did not: its owner is the nearest surviving ancestor whose content column it
reaches. A definition registers in the deepest container whose content column
it reaches, and a container it does not reach neither owns nor withholds it.
Rules: CARVE-P0-010 and CARVE-P0-020.

## O3 Fold into the open paragraph

If a paragraph is open at the deepest frame and the line does not interrupt, it
folds into that paragraph whatever prefixes it missed. The deepest frame is
found by following the last child container to its leaf. A heading, a table, a
thematic break, a closed fence, an empty or closed colon container, a comment
and a definition leave no paragraph open, so no line folds after one. A fold
closes nothing, and the same test holds for every host and every fence kind.
Rules: CARVE-P0-006, CARVE-P0-007, CARVE-P0-009, CARVE-P0-014, CARVE-P0-015,
CARVE-P0-016, CARVE-P0-017 and CARVE-P0-018.

## O4 Classify in the owner

Otherwise the frames deeper than the owner close and the line is read in the
owner: a blank, a block opener, a list marker or a new paragraph. A list item,
a definition body and a footnote body read a recognized opener at or past their
content column, on the base it was written at. The document and a quote need
the exact column. A block at the content column ends the paragraph above it and
leaves the container open. Marker-attached attributes add no width to the
content column. The `+` continuation marker attaches one complete block under
CARVE-P9-033 and CARVE-P9-067. Rules: CARVE-P0-004, CARVE-P0-008, CARVE-P0-011
and CARVE-P0-012.

## T Apply the transition

Once the line has an owner, the boundary it formed sets two separate facts in
every frame that contains it: whether the frame stays open, and whether a
paragraph is open. Only an ordinary line leaves a paragraph open. Rule:
CARVE-P0-003.

## X1 to X3 Named exceptions

X1, comment retention: after a line comment consumed below the content column
of a list item, a definition body or a footnote body, a following line that
does not interrupt stays in the container and starts a new paragraph. The
limits are in CARVE-P9-051 and CARVE-P9-053, and CARVE-P9-052 covers the other
invisible lines, which fold as text.

X2, the quote band: under a quote holding an open paragraph, a list marker
folds at every column, and a block opener folds at every column but the host's
content column. Rule: CARVE-P0-021.

X3, the opaque marker-line quote: when a code or raw fence opens in a quote on
an item's marker line, an over-indented follower stays text while that fence is
open or is the quote's last block. Rule: CARVE-P0-022.

## Evidence

`npm test` checks that the map covers every Part 0 rule, that each step names
checker helpers that exist, and that the two reviewed fixture populations keep
their size: 472 ownership cases and 15 boundary cases. The container-ownership
test checks their reviewed HTML. The fixtures cover concrete examples, not every
composition of the steps, and the checker is a partial layout oracle, not the
public interchange AST.

The [Rocq ownership model](https://github.com/markup-carve/carve-proofs/blob/54e6da4eac738cfc980ca8cb1cfedf6cba1c6589/proofs/layout/Ownership.v)
checks transitions, measured-prefix consumption and selection over supplied
frame inputs. It does not yet tie source boundary classification to production
parsing.
