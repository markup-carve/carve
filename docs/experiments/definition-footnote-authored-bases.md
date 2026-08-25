---
description: "Compatibility report for authored block bases in definition and footnote bodies."
---

# Definition and footnote authored-base experiment

This report records the decision gate for [carve#1729](https://github.com/markup-carve/carve/issues/1729). The executable oracle exposes `parse(source, { authoredBodyBases: true })` while the released reading remains available with `false` during the experiment commit.

Lines are first stripped to the container body's minimum column: 3 for a definition description and 2 for a footnote. A recognized opener farther right establishes a local `block_base`. Lines at or beyond that base are stripped relative to it until the source returns left of the base. Payload indentation beyond the opener is retained.

## Corpus deltas

The complete mandatory and optional corpora were parsed with the switch off and on.

| body | fixture | AST | HTML | reason |
|---|---|---:|---:|---|
| footnote | `218-a-footnote-body-s-own-column-is-two-and-a-third-column-is-its-text` | changed | changed | an over-indented table becomes structural |
| footnote | `220-a-definition-past-a-footnote-body-s-column-is-the-body-s-own-text` | changed | changed | an over-indented link definition registers |
| definition | `269-a-definition-body-continuation-indented-past-its-column-is-lazy-text` | changed | changed | an over-indented quote becomes structural |

No other mandatory fixture changed. No optional fixture changed. The three changes are direct instances of the proposed rule, not distinct semantic blockers.

The affected sources carry no formatter or source-layout sidecar, so the existing sidecar set has zero deltas. No source-position fixture changes. The normalizer preserves input order, payload bytes relative to the authored opener, and the existing definition/reference registration scope.

## Construct matrix

Executable tests compare exact-column and over-column spellings in both definition and footnote bodies, with and without a preceding blank, for:

- headings and quotes;
- code, raw and colon fences;
- tables and definition lists;
- attributes followed by their target;
- comments;
- nested lists;
- tab indentation that reaches past the minimum column.

The tests also pin payload indentation after rebasing and retain the old reading behind the experiment switch.

## Complexity

The normalizer measures each leading run once and carries one active base forward. It does not probe candidate dedents. On an adversarial body containing 1,000 over-indented headings, both modes recorded 2,003 line visits and 15,000 indentation-scan columns. The enabled mode added 1,001 constant-time suffix views. Work remains linear.

## Decision

Adopt the shared rule. The corpus found three intended reinterpretations and no separate blocker:

> A recognized block opener at or beyond a container body's minimum content column belongs to that body. Its authored column is the local base of that block; canonical output uses the minimum column.

Migration tooling should report the three ambiguous old shapes and offer either structural dedent or escaping the opener to preserve literal text.
