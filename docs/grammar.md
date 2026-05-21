---
title: Formal grammar
description: The complete EBNF specification of Carve syntax.
---

# Formal grammar

This is the canonical EBNF specification of Carve. It defines block-level constructs first (frontmatter, headings, lists, tables, fenced code, captions), then inline constructs (emphasis, links, attributes, extensions, mentions, tags, CriticMarkup).

Implementations should match this grammar. The [case study](./case-study/) explains the design rationale, the [reference page](./edge-cases) covers parsing edge cases, and the [examples](./examples) show the expected HTML output for each construct.

The full grammar lives at [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf) in the repository.

<<< ../resources/grammar.ebnf{ebnf}
