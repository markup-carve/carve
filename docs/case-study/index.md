---
title: Case Study
description: Early Carve design notes, kept as a historical record.
---

# Case Study

::: info Historical document
This case study records early influences, design goals, and syntax proposals.
It is **not the normative specification** and is not kept in lockstep with the
language. For current rules, read the
[formal grammar](../grammar), the [extensions contract](../extensions), and the
[conformance corpus](https://github.com/markup-carve/carve/tree/main/tests/corpus).
:::

The chapters cover the original design from background through implementation.

## Chapters

- [Background](./background): formats considered and early readability assumptions.
- [Design](./design): design principles and reasons for a separate format.
- [Syntax Walkthrough](./syntax): early syntax proposals. The current rules are in the [formal grammar](../grammar).
- [Parsing & AST](./parsing-ast): the proposed parsing strategy and AST shape.
- [Compatibility, Comparison & Open Questions](./compatibility): migration and compatibility notes.
- [Implementation & Reflection](./implementation): implementation notes and original goals.
- [Appendices](./appendices): quick reference card, examples, and influences.

## Related

- [Examples](../examples): Carve source and HTML output.
- [Formal grammar](../grammar): EBNF specification.
- [Reference implementation](https://github.com/markup-carve/carve-js): `@markup-carve/carve` in TypeScript.
