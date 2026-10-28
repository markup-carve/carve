---
description: Read Carve 0.1 container ownership as one procedure, with the clause that each step decides.
---

# Container ownership procedure

PART 0 of the grammar states container ownership as one procedure: four steps,
a transition table and three named exceptions. This page follows that order and
names the clauses each step decides. It adds no rule. The source clauses in
`resources/spec/01-layout.ebnf` are authoritative, and the
[machine-readable map](https://github.com/markup-carve/carve/blob/main/resources/spec/ownership-procedure.json)
lists the Part 0 rule IDs with the checker helpers that implement each step.
Those helpers are implementation entry points, not a public parser API.

Some examples and historical material cite the earlier step names: S1 is O1,
S2 is O1's opaque-body rule, S3 is O4 on a line that supplied every prefix,
S4 is O2 to O4 on a line that did not, and S5 is O4's push. The layout grammar
uses O1 to O4.

## Normalize source

Strip a leading byte order mark, and replace every NUL and every ill-formed
sequence with U+FFFD, before the first line is read. Columns are measured on the
result. Rules: CARVE-P0-001, CARVE-P0-002 and CARVE-P0-023.

## Block structure decision order

CARVE-P0-024 gives the order for each line: identify blanks, match prefixes,
let an opaque body take its payload, then classify comments. For a visible
line, select an owner, recognize its form in that owner's coordinates and
decide interruption or lazy continuation. If it does not fold, close missed
frames and classify it in the owner. The `parse` entry point runs these
decisions. Rule: CARVE-P0-024.

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

Follow the last child container to its deepest leaf. If that leaf has an open
paragraph and its continuation claim, a noninterrupting line folds into it
whatever prefixes it missed. T supplies the paragraph state; an ancestor's
earlier paragraph cannot supply a missing claim. Recognition uses O2's owner,
coordinates and scope, including the fence's valid metadata and closer guard.
A new paragraph at an enclosing list item's content column stores its own
claim after an ended descendant; it can take the next lazy line.
A fold closes nothing. Definition-term continuation follows CARVE-P2-028.
Rules: CARVE-P0-006, CARVE-P0-007, CARVE-P0-009, CARVE-P0-014, CARVE-P0-015,
CARVE-P9-084, CARVE-P0-017 and CARVE-P9-083.

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
paragraph is open. An ordinary line opens or continues a paragraph. Rows marked
`deepest P` or `deepest attached P` forward the corresponding leaf's state; an
empty or closed container supplies no open leaf. The rows that close a paragraph
leave no continuation claim. A surviving container alone cannot admit a lazy
line. Rule: CARVE-P0-003.

## X1 to X3 Named exceptions

X1, comment retention: a line comment or matched comment span consumed below
the content column can retain a list item, definition body or footnote body
when a claim or earlier retention admits it. A blank or an at/above-column
comment clears retention. A noninterrupting follower uses the retained owner
to start a paragraph; retention itself supplies no paragraph claim. X1 defines
the limits, including sibling markers and enclosing-context comment fences.
CARVE-P9-053 links comment visibility to X1; CARVE-P9-051 and CARVE-P9-052
cover the other invisible lines.

X2, the quote band: under a quote holding an open paragraph, a line supplying
no `>` folds if it is a list marker at any column, or a code/raw fence, heading,
thematic break or table row away from the host's content column.
Rule: CARVE-P0-021.

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
