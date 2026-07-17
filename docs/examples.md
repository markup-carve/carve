---
title: Examples
description: Side-by-side Carve source and the HTML it produces, split into core, extensions and edge cases.
---

# Examples

Each pair shows the Carve source on the left and the HTML it produces on the right; toggle the output to **Rendered** to see the result in place. The HTML rendering reflects the *intended* output: think of these as the contract every implementation must honor. Reference implementations already exist (carve-js, carve-rs, carve-php) and are tested against exactly these fixtures.

The examples are split into three pages:

- [**Core**](/examples/core) — the everyday syntax: emphasis, headings, links, images, lists, tables, code, attributes, frontmatter and more.
- [**Extensions**](/examples/extensions) — tier-2/3 features layered on the core language: admonitions, abbreviations, mentions and tags, inline extensions, symbols, and cross-reference numbering.
- [**Edge cases**](/examples/edge-cases) — precise boundary rules, table-alignment variants, lazy continuation, paragraph interruption, security hardening and other robustness guarantees.

Every pair on those pages is also part of the [conformance corpus](/validation): the HTML shown is generated from the same fixtures the reference implementations are tested against, so it cannot drift from real output.
