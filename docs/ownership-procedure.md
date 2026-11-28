---
description: Reading container ownership decisions in the 0.2 block specification.
---

# Container ownership

An implementation first decides which open container owns a source line, then reads the line's block form. The 0.2 block specification states this as clauses spread over its preliminaries, the paragraph and interrupter section, and the section on container ownership and stripping. This page reads those clauses as one procedure, in the order a scanner applies them, and names the clause each step decides. It adds no rule: where this page and the specification differ, the specification wins.

## From the 0.1 procedure to 0.2

In 0.1, PART 0 of the grammar stated ownership as one procedure of steps S1 to S5 (step 2 held S2, the owner, and S3, the form), a transition table T, eight layout rules and local family guards. The source clauses lived in [`resources/spec/01-layout.ebnf` on branch `0.1`](https://github.com/markup-carve/carve/blob/0.1/resources/spec/01-layout.ebnf), and a [machine-readable map on that branch](https://github.com/markup-carve/carve/blob/0.1/resources/spec/ownership-procedure.json) listed the PART 0 rule ids with the checker helpers that implemented each step. Older examples cite the retired step names O1 to O4 and the exceptions X1 to X3; ruling [#3885](https://github.com/markup-carve/carve/issues/3885) removed the exceptions.

0.2 has no PART 0 and no step ids. The headings below keep the 0.1 step names so that older notes still map, but each step now cites C2-B clauses. Three changes matter most:

- One paragraph rule. An open paragraph takes every nonblank line that is not one of six interrupters, at any column. In 0.1 each block kind had its own answer to whether it interrupted a paragraph.
- `+` is text. The 0.1 continuation marker that let a block attach to a list item, quote, definition or footnote body is gone (C2-B-059). Indent the block to the owner's content column instead.
- Attribute lines and footnote definitions no longer interrupt a paragraph. They are lazy lines of it (C2-B-024).

See [What's new in 0.2](./whats-new-0-2) and [Upgrading to 0.2](./upgrade-0-2) for the rewrites.

## Normalize source

Before the first line is read, skip a byte-order mark at the start of the source (C2-B-165). Read U+0000 as U+FFFD, and decode a byte source as UTF-8 with each maximal ill-formed subpart read as one U+FFFD (C2-B-218). Offsets still count the source bytes. A line ends at LF; a CR directly before the LF is not part of the line, and a lone CR is not a line end (C2-B-010).

Columns count code points from 0, starting behind the quote marks of the open quotes (C2-B-003). A leading tab advances to the next multiple of 4 for counting only, tab stops count from the start of the line, and stripping removes whole characters, so a tab that straddles the strip column is kept (C2-B-004, C2-B-005, C2-B-007).

## Decision order

The role of a line depends only on that line, the stack of open blocks, and five facts about the lines directly above: whether this is line 1, the pending attribute lines, the number of blank lines directly above, the block that closed directly above, and the blank lines held back at the end of an opaque body (C2-B-001). A pending attribute line is the only block fact that waits for a later line. Each line goes through the steps below once, in order. No family, depth or marker adds a second way to belong.

## S1 Payload

An open code fence, div or comment block tests the line against its closer first. A code fence or div closes on a run of its opener's character of at least its length, on a line owned by the same container, with no further column test. A comment block closes at a bare run of `%` of at least the opener's length on any line, whatever its indent and also where the line lacks the marks of the quotes around it, and that line closes no container (C2-B-109, C2-B-110). An unclosed fence ends with its container and never turns back into text (C2-B-111).

Comments are then classified. A comment-only line, a line that holds nothing but a `%%` comment while no opaque body is open, is not a line for block structure: it closes no container, heading or table, adds nothing to a count of blank lines, and a pending attribute line waits across it (C2-B-137). Its comment becomes a child of the open leaf, or of the innermost open container (C2-B-138). A region marker line is the exception: it belongs to the innermost container that owns it, so it closes every container that does not and ends every open paragraph.

A comment-only line at column 0 does not close the list item around it:

<!-- carve-sample {"fmtSkip":"shows the authored column; fmt indents the comment into the item"} -->
::: compare
```crv
- a

%% note

  b
```
```html
<ul>
  <li>a
    <p>b</p>
  </li>
</ul>
```
:::

## S2 Owner

Read the prefixes outside in, in the order the containers were opened (C2-B-008). A quote consumes its mark, `>` followed by a space or the end of the line (C2-B-031). An item, a description or a footnote body consumes indentation, at most up to its content column (C2-B-027). In a task item the content column is the column of the task mark.

With no paragraph open, the owner is the innermost open item, description or footnote body whose marker the line is indented past, measured from that item's own marker column, and a quote when the line carries its mark (C2-B-025). Indentation never supplies a quote mark. A blank line belongs to no container: the next nonblank line decides which containers stay open, so an indented line belongs to its item after any number of blank lines (C2-B-009). A quote is the exception, since a blank line without its mark ends it at once (C2-B-032).

::: compare
```crv
- a

  b

> q

> r
```
```html
<ul>
  <li>a
    <p>b</p>
  </li>
</ul>
<blockquote><p>q</p></blockquote>
<blockquote><p>r</p></blockquote>
```
:::

The 0.1 rule that a lone `+` reached only the marker column of an open container has no 0.2 counterpart, since `+` is text (C2-B-059).

## S3 Form

Classify the rest of the line in the owner's coordinates. Indent that remains after the prefixes is skipped before the shape is tested, so a heading, a quote, a table row or a list marker may stand at any indent; only a definition and a frontmatter opener are pinned to column 0 (Preliminaries, C2-B-081, C2-B-161). The first line of a nested block sets that block's base column (C2-B-028). The body of a code fence or comment block is stripped by at most the indent of its opener, or by the opener's column where it stands left of its item's content column (C2-B-029).

A marker left of the list's column, directly after item text, is a sibling item, so right-aligned ordered markers form one list (C2-B-030). A marker between the columns of two open lists is read at the column of the deeper list (C2-B-055).

## S4 Lazy

An open paragraph takes every line that is not blank, whatever its indent or prefix (C2-B-012). It closes only at a blank line, at an interrupter, or with its container (C2-B-013). The interrupters are:

- a fence line of backticks, colons or percent signs (C2-B-014);
- a list marker that continues an open list or opens a nested one under the list rules (C2-B-015);
- a description or term mark at an open description list's column, or a definition line at column 0 while a definition is open (C2-B-016);
- a caption line below a paragraph that is exactly one block image line or one display math line (C2-B-017, C2-B-018);
- a table row (C2-B-019).

List and description interrupters count only on a line that carries the quote mark of every quote the list sits in (C2-B-020). Everything else is a lazy line: a heading, a quote, an attribute line, a definition, an include directive and a `%%` comment that is no region marker (C2-B-024). The test is the same at every depth and in every family. A fold closes nothing.

<!-- carve-sample {"fmtSkip":"shows a lazy line as authored; fmt adds the quote mark"} -->
::: compare
```crv
> a
b
```
```html
<blockquote><p>a
b</p></blockquote>
```
:::

## S5 Apply

Otherwise close every container that does not own the line, with every container inside it (C2-B-026), and apply the form in the owner. An interrupter first closes the open paragraph, and the line is then read as a line with no paragraph open, so an item, description or footnote body whose marker it is not indented past closes with every block inside it, lists included (C2-B-228). A container opener pushes a frame, a leaf opener starts a new leaf, and ordinary text starts a paragraph (C2-B-011). Marker-line content is the container's first block.

::: compare
```crv
- a
  - b

c
```
```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
<p>c</p>
```
:::

## T Apply the transition

In 0.1 a transition table set, at each boundary, whether every enclosing frame stayed open and whether a paragraph stayed open. 0.2 has no table. The same two facts follow from S4 and S5: a paragraph stays open across a lazy line and nowhere else, and a container stays open exactly while it owns the next nonblank line. Some facts are only known when a block closes and are not roles of a line: block image promotion, a math block, caption attachment, list tightness and table footer rows (C2-B-191). A streaming writer therefore buffers one paragraph, one captioned block, one list or one table.

## Evidence

For 0.2, the examples and clause cases of the conformance suite are the test population, and the JavaScript, PHP and Rust engines run against them. The block chapter's examples include the ownership cases shown above.

On the 0.1 branch, `npm test` checked that the map covered every PART 0 rule, that each step named checker helpers that existed, and that two reviewed fixture populations kept their size: 472 ownership cases and 15 boundary cases (measured on the 0.1 grammar). Those fixtures covered concrete examples, not every composition of the steps, and the checker was a partial layout oracle, not the public interchange AST.

The [Rocq ownership model](https://github.com/markup-carve/carve-proofs/blob/54e6da4eac738cfc980ca8cb1cfedf6cba1c6589/proofs/layout/Ownership.v) checks transitions, measured-prefix consumption and selection over supplied frame inputs. It models the 0.1 frames and does not tie source boundary classification to production parsing.

**Specification (external):** [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (Preliminaries and C2-B-001 to C2-B-032, C2-B-055, C2-B-059, C2-B-109 to C2-B-111, C2-B-137, C2-B-138, C2-B-165, C2-B-191, C2-B-218, C2-B-228), [0.2 conformance examples and clause cases](https://github.com/markup-carve/carve/blob/main/spec/0.2/conformance/README.md).
