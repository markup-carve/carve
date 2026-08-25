---
description: "Compatibility report for the ownership-first container state model."
---

# Container ownership experiment

This report records the compatibility gate for [carve#1730](https://github.com/markup-carve/carve/issues/1730). The experiment separates two facts that older prose and collectors sometimes represented with one boolean:

- whether a container frame remains available to own another line;
- whether that frame currently has a paragraph which accepts continuation text.

The executable oracle exposes the new transition table through `ownershipTransition()`. Its first phase is deliberately semantics-preserving. Existing block classification still feeds the same boundary kinds, while the transition result records `containerOpen` and `paragraphOpen` independently.

## Corpus comparison

The mandatory and optional corpora were regenerated before and after the state split and compared by source name.

| comparison | deltas |
|---|---:|
| mandatory AST | 0 |
| mandatory HTML | 0 |
| optional AST | 0 |
| optional HTML | 0 |
| formatter fixtures | 0 |
| source-layout fixtures | 0 |

This zero-delta result is required for the state split. It does not declare every possible ownership transition correct. It establishes a stable baseline from which #1731 can move comment classification without accidentally changing output, and #1729 can measure authored block bases independently.

## Historical boundary audit

The cases associated with #603, #618, #646, #655, #682, #932, #956 and #1350 fall into these explicit rows:

| previous ambiguity | boundary row | result |
|---|---|---|
| ordinary prose before a dedented line | ordinary | stored continuation ownership; paragraph stays open |
| blank before a dedented line | blank | frame remains open, paragraph closes; ancestor owns a below-column line |
| line or fenced comment | comment | frame remains open, paragraph closes; #1731 supplies lexical classification |
| link or footnote definition | definition | frame remains open for the definition extent, paragraph closes |
| heading, table, or closed fence | corresponding closed-leaf row | frame remains open, paragraph closes |
| nested quote or list | nested-container row | frame remains open; deepest leaf independently reports paragraph state |

The formerly unresolved closed-fence wording now has one answer: closing a code, raw, or colon fence does not close its containing item, quote, definition body, or footnote body. It closes the fenced leaf and leaves no paragraph open. The next visible line is then assigned by its column and any stored continuation ownership, not by searching the stack for a paragraph.

## Complexity

The transition is constant work per classified boundary. It adds no indentation scan, dedent probe, suffix parse, or ancestor search. Existing deep mixed-container work counters therefore retain their bounds.
