---
title: Case Study
description: Early Carve design notes, kept as a historical record.
---

# Case Study

::: info Historical document
This case study records early influences, design goals, and syntax proposals.
It is **not the normative specification** and is not kept in lockstep with the
language. Its references to the formal grammar, `resources/grammar.ebnf` and
the [0.1 corpus](https://github.com/markup-carve/carve/tree/0.1/tests/corpus)
describe the historical 0.1 line. For current rules, read the
[Carve 0.2 specification index](../grammar).
:::

The chapters cover the original design from background through implementation.

## Chapters

- [Background](./background): formats considered and early readability assumptions.
- [Design](./design): design principles and reasons for a separate format.
- [Syntax Walkthrough](./syntax): early syntax proposals. The current rules are in the [Carve 0.2 specification](../grammar).
- [Parsing & AST](./parsing-ast): the proposed parsing strategy and AST shape.
- [Compatibility, Comparison & Open Questions](./compatibility): migration and compatibility notes.
- [Implementation & Reflection](./implementation): implementation notes and original goals.
- [Appendices](./appendices): quick reference card, examples, and influences.

## Related

- [Examples](../examples): Carve source and HTML output.
- [Carve 0.2 specification](../grammar): the ten documents that define current behavior.
- [Reference implementation](https://github.com/markup-carve/carve-js): `@markup-carve/carve` in TypeScript.
