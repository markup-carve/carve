---
title: Case Study
description: A case study in post-Markdown markup design.
---

# Case Study

How Carve was designed: the landscape it grew out of, the principles that guided it, the syntax it ended up with, and the parsing / implementation considerations that fall out of those choices.

The full case study was split into themed chapters so each one stands on its own.

## Chapters

- [Background](./background) — the landscape of lightweight markup, what each existing format teaches us, and what observation of non-technical users reveals.
- [Design](./design) — Carve's core principles, anti-patterns to avoid, and a reflection on why we don't just patch Markdown.
- [Syntax Specification](./syntax) — the spec proper. Every construct, every delimiter, every rule.
- [Parsing & AST](./parsing-ast) — block-then-inline parsing strategy and the shape of the AST it produces.
- [Compatibility, Comparison & Open Questions](./compatibility) — migration paths from other formats, feature-by-feature comparison matrix, and what's still being debated.
- [Implementation & Reflection](./implementation) — practical concerns for implementers, and what success looks like.
- [Appendices](./appendices) — quick reference card, full example document, influences and acknowledgments.

## Related

- [Examples](../examples) — side-by-side Carve source and the HTML it produces.
- [Formal grammar](../grammar) — EBNF specification.
- [Reference implementation](https://github.com/markup-carve/carve-js) — `@markup-carve/carve` on TypeScript.
