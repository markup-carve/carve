---
description: Locate Carve 0.1 container ownership decisions, their qualifications, and the limits of current proof coverage.
---

# Container ownership procedure map

This guide collects the existing ownership decisions in reading order. It adds
no parsing rule and selects no new behavior. The source clauses remain
authoritative. The [machine-readable map](https://github.com/markup-carve/carve/blob/main/resources/spec/ownership-procedure.json)
covers all 22 Part 0 rule IDs and names the executable checker's relevant helpers.
Those helpers are implementation entry points, not a public parser API.

A frame's survival, its paragraph openness, its ordinary-line continuation
claim and a list item's below-column comment retention are separate facts.
Combining them into a single “open” flag loses existing distinctions. Part 0's
transition table updates state after a classified boundary; it does not classify
source text or select the owner by itself.

## Normalize source

Normalize line endings under the lexical `newline` production, apply the
leading-BOM rule and replace every NUL before measuring columns. Tabs advance
visual columns; source positions count under their own
coordinate contract. Rules: CARVE-P0-001 and CARVE-P0-002.

## Decode prefixes and honor payloads

Respect an active code, raw or other opaque payload before recognizing its
contents as blocks or comments. The host's prefix and extent still matter:
an opaque leaf does not acquire an indentation prefix that the line omitted.
Decode prefixes in the coordinates produced by each enclosing strip. Indentation
alone supplies no quote marker. Marker-attached attributes contribute no width
to the item's content column.

A newly marked quote after a blank cannot inherit columns from a quote that
ended. Rules: CARVE-P0-008, CARVE-P0-013 and CARVE-P0-019.

## Classify comments

After payload handling and prefix decoding, distinguish a line comment from a
matched fenced span. An unmatched percent fence takes the line-comment form.
Classification removes comments from visible layout, while a conforming public
AST and source map retain their authored extent.

A list item must first be available to consume a below-column comment. A prior
ordinary-line claim or retained ownership can admit it; a missing prefix without
either ends the item before comment classification in the enclosing context.
A comment at or above the content column clears earlier below-column retention,
as does a blank.
A matched comment fence at the enclosing context's opener column can end the item. Rules: CARVE-P0-005 and
CARVE-P9-053, with the list qualifications in CARVE-P9-051.

## Select the surviving owner

Use prefix matching, the stored claim and the applicable list-item
qualifications to select ownership before applying lazy continuation or accepting
a block. Candidate opener classification is needed to decide claim eligibility;
this is not permission to accept an opener before its owner is known.

A sibling marker takes precedence over ordinary-line retention. After a blank,
a below-content-column line leaves the item. A retained marker in the band
between base and content columns stays paragraph text. With an item or body open, definitions register in the deepest surviving
context whose content column they reach. With no item or body open, registration is at
the context's exact content column or document column zero; extra indentation
creates no registration site. A definition reached only by lazy folding into a
quote is text and registers nothing. A below-column definition that folds as text
also registers nothing. A quote's open paragraph and
the host's content column also qualify which apparent openers fold in the band.
A code fence interrupts an open paragraph only when an eligible closer exists.
The closer search passes below-column lines without accepting a closer on them.
The selected container's reach still depends on an open paragraph, not fence
kind. Rules: CARVE-P0-006, CARVE-P0-007, CARVE-P0-010, CARVE-P0-014, CARVE-P0-020, CARVE-P0-021,
CARVE-P9-051 and CARVE-P9-052.

## Establish the authored block base

Once ownership and opener eligibility are known, a recognized opener past the
selected container's minimum establishes a base for that complete block.
Ordinary over-indented text establishes none. An inner block does not withhold
columns below its own content column from a surviving ancestor. An opener at a nested body's own content column belongs to that body,
not to a fresh ancestor base.

When a code or raw fence opens in a quote on an item's marker line, the band remains
text while the fence is open or remains the quote's last block. A quote marker
there supplies no prefix. A later open code or raw fence in the same quote keeps this
condition; closing that later fence restores authored-base behavior. A blank
permits a new base, and a later quoted paragraph ends the fence-tail condition.
A line at the item's content column still opens there. A heading, table or
thematic-break quote head retains authored-base behavior. Comment fences keep
their separate Part 9 comment-span rules.
Rules: CARVE-P0-004 and CARVE-P0-022. The list content-column and quote-band qualifications above remain
part of this decision.

## Consume the block or attachment extent

A block at the body's content column closes the paragraph beneath it without
closing its container. A footnote definition's extent includes its own continuations and interior
blanks. A link definition is one line; the following blank is outside it.
CARVE-P0-012 does not decide nested definition extent. Container reach follows paragraph state and
prefix ownership rather than a shortcut based on fence or host kind.

The standalone continuation marker consumes one complete attached block. Its
extent and local base belong to that attachment, including the first-block
form in list items and definition descriptions. That form does not apply to
quote or footnote bodies. Rules: CARVE-P0-011, CARVE-P0-012, CARVE-P0-016, CARVE-P0-017,
CARVE-P0-018, CARVE-P9-033 and CARVE-P9-067.

## Update paragraph state and stored ownership

Apply the boundary transition after the line or block has an owner. Ordinary
lines can store an ownership claim; blank, comment, definition, heading, table
and closed-fence boundaries do not create one. For a quote, nested list or
attachment, paragraph state comes from the deepest relevant leaf. A lazy fold
keeps its container available for following lines. EOF closes both states.
Rules: CARVE-P0-003, CARVE-P0-009 and CARVE-P0-015.

The list collector uses `afterCommentTransition` for its after-comment flag.
The helper consumes classified line and span facts; it does not recognize
comments or select their owner. Paragraph closure and frame availability remain
separate decisions. The helper preserves the flag across blank lines, opaque payloads and
marker-line span closers.

## Evidence and proof boundary

`npm test` checks that the map covers every current Part 0 rule, names existing
checker helpers and retains the two reviewed fixture populations: 472 ownership cases
and 15 boundary cases. The existing container-ownership test checks their reviewed HTML unchanged. They cover concrete
examples, not every composition of the phases or invisible AST slots. The
checker itself is a partial layout oracle rather than the public interchange AST.

The [Rocq ownership model](https://github.com/markup-carve/carve-proofs/blob/54e6da4eac738cfc980ca8cb1cfedf6cba1c6589/proofs/layout/Ownership.v)
checks transitions, measured-prefix consumption and selection over supplied
quote, list-item, definition-body and footnote-body frame inputs. Source boundary classification, surviving-frame construction and
attachment recognition still need a correspondence to production parsing.
The [candidate-stack experiment](https://github.com/markup-carve/carve-proofs/blob/54e6da4eac738cfc980ca8cb1cfedf6cba1c6589/proofs/layout/STACK.md)
uses a prefix-first policy that is not established as Carve's normative selector.
Its successful proofs cannot substitute for that missing correspondence.

The next consolidation should extract the candidate inputs from the existing
collectors and compare ownership, public ASTs, positions and canonical output
before moving normative prose. Keep the 0.1 interruption contract separate from
0.2 no-interruption. A newly chosen interpretation requires its own language
decision rather than being folded into this map.
