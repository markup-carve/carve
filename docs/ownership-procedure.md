---
description: Read Carve 0.1 container ownership as one procedure, with the clause that each step decides.
---

# Container ownership procedure

PART 0 of the grammar states container ownership as one procedure: five steps,
S1 to S5, and a transition table. This page follows that order and names the
clauses each step decides. It adds no rule. The source clauses in
`resources/spec/01-layout.ebnf` are authoritative, and the
[machine-readable map](https://github.com/markup-carve/carve/blob/main/resources/spec/ownership-procedure.json)
lists the Part 0 rule IDs with the checker helpers that implement each step.
Those helpers are implementation entry points, not a public parser API.

Older examples cite the retired step names O1 to O4 and the exceptions X1 to
X3. Ruling [#3885](https://github.com/markup-carve/carve/issues/3885) removed the
exceptions; the steps map to S1 to S5 below.

## Normalize source

Strip a leading byte order mark, and replace every NUL and every ill-formed
sequence with U+FFFD, before the first line is read. Columns are measured on the
result. Rules: CARVE-P0-001, CARVE-P0-002 and CARVE-P0-023.

## Block structure decision order

CARVE-P0-024 states the rule: a container's content column is fixed by the line
that opens it, a later line belongs to the deepest open container whose content
column it reaches, and otherwise it continues an open paragraph lazily or closes
containers. Each line runs S1 to S5 once, in order, and T applies at each
boundary. No family, depth or marker adds a second way to belong. The `parse`
entry point runs these decisions and `ownLines` walks the frames.
Rule: CARVE-P0-024.

## S1 Payload

An open code, raw or comment fence tests the line against its closer first. A
nonblank line that misses the fence's owner ends the fence. Comments are then
classified before S3 reads the visible residue, but a comment is still an
ordinary line for ownership: below a container's content column it closes that
container. Rule: CARVE-P0-005.

## S2 Owner

Walk the open frames from the outside in. A quote consumes its marker; any other
frame consumes indentation up to its content column. The owner is the deepest
frame the line reaches. Indentation never supplies a quote marker, a blank ends
an unmarked quote, and a later quote marker does not inherit the columns of a
quote that ended. A lone `+` reaches only the marker column of an open list
item, quote, definition body or footnote body (CARVE-P9-067). Marker bodies take
their content column from CARVE-P9-083. Rules: CARVE-P0-019, CARVE-P0-020 and
CARVE-P9-083.

## S3 Form

Classify the rest of the line in the owner's coordinates. An opener past the
owner's content column opens in the owner at every level, the document and
quotes included, and every line the new block owns moves left by the opener's
indentation. A block at the content column ends the paragraph above it and
leaves the container open, a definition registers only in the owner S2 selected,
and marker-attached attributes add no width to the content column. A term has no
ownership of its own. Rules: CARVE-P0-008, CARVE-P0-010 and CARVE-P0-011.

## S4 Lazy

A line that missed a frame folds into the deepest open paragraph, found by
following the last child container to its leaf, when the line is not blank and
its form does not interrupt. The test is the same at every depth and in every
family. Comments, attributes and definitions interrupt, so a below-column
invisible line closes the container (CARVE-P9-051, CARVE-P9-052). A heading
leaves no paragraph open. A fold closes nothing. Rules: CARVE-P0-006,
CARVE-P0-012 and CARVE-P0-015.

## S5 Apply

Otherwise close every missed frame and apply the form in the owner. A container
opener pushes a frame, a leaf opener starts a new leaf, and ordinary text starts
or extends a paragraph. Marker-line content is the container's first block. A
fenced body is not a paragraph, and neither fence kind nor container kind
changes reach. Colon fences share one frame (CARVE-P9-084). Rules:
CARVE-P0-007, CARVE-P0-013, CARVE-P0-014, CARVE-P0-017 and CARVE-P9-084.

## T Apply the transition

Once the line has an owner, the boundary it formed sets two separate facts in
every frame that contains it: whether the frame stays open, and whether a
paragraph is open. An ordinary line opens or continues a paragraph. Rows marked
`deepest P` or `deepest attached P` forward the corresponding leaf's state; an
empty or closed container supplies no open leaf. A surviving container alone
cannot admit a lazy line. Rule: CARVE-P0-003.

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
