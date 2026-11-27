---
title: Technical rationale
description: Why 0.2 separates syntax, trees, rendering and writing.
---

# Technical rationale

Carve is for documents that need predictable parsing and an explicit interchange tree. It grew from Djot's approach to block and inline parsing, but uses its own spellings and rules. This page explains the design; the [0.2 specification](./grammar) decides behavior.

## Separate the stages

The [block chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) decides line ownership and block nodes. The [inline chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) reads the text inside them. Definitions can resolve after parsing without changing the token boundaries already read. The [HTML chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) then defines output from the resolved tree. This separation makes a rendering difference traceable to a stage and clause.

## Reduce punctuation collisions

In 0.2 an authored heading begins with `=`, while a thematic break is `***`. That leaves a line of hyphens to be read by its own rule instead of treating the same line as several unrelated constructs. See [Headings](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#headings) and [Thematic break](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#thematic-break). Likewise, underline, strike and highlight use braced forms rather than bare delimiter runs. The [inline chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#braced-delimiters) defines their pairing.

The goal is a rule that remains readable when prose, code-like identifiers and markup meet. A parser still has to follow the exact boundary clauses; familiarity with Markdown or 0.1 is not enough to predict a 0.2 result.

## Make the tree portable

[AST 2.0](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md) defines node types, fields, equality, positions, reader checks and migration. Author spelling that should not affect tree equality belongs in the [source-layout sidecar](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md). The [writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md) produces canonical source from a tree and reports when a supplied tree has no faithful source spelling. This gives editors and converters a clear boundary between meaning and source layout.

## Keep a single output contract

HTML is the specified rendering target. The [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md) mapping defines the path back into a tree, including losses. Markdown, plain text and ANSI writers are outside 0.2.0. [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md) and [extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md) have explicit boundaries so a host can decide what it permits. The extension interface is still provisional for this candidate.

## Make claims testable

The ten documents have numbered clauses and a [shared corpus](https://github.com/markup-carve/carve/blob/main/spec/0.2/conformance/README.md) of examples, extra clause cases and refused trees. Data tables state finite sets such as options and lint codes. The specification checks internal consistency, while each engine tests its own result against those cases. A passing case is narrow evidence, not proof for every possible document.

For specific syntax choices, see [Feature design notes](./native-features-analysis). For 0.1 design history, see [Specification decision history](./spec-history).
