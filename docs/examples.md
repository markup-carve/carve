---
title: Examples
description: Side-by-side Carve source and the output it produces, split by what is always on, what you switch on, and what only shows up at the boundaries.
---

# Examples

Each pair shows the Carve source on the left and the HTML it produces on the right; toggle the output to **Rendered** to see the result in place. The HTML rendering reflects the *intended* output: think of these as the contract every implementation must honor. Reference implementations already exist (carve-js, carve-rs, carve-php) and are tested against exactly these fixtures.

The examples are split by **what it takes to get the output**, not by which file holds the case:

| Page | What is on it | Pinned in |
|---|---|---|
| [**Core**](/examples/core) | Everything Tier-1: always on, not disableable, identical in every implementation. | `tests/corpus` (mandatory) |
| [**Extensions**](/examples/extensions) | Tier-2 features that ship off, Tier-1 syntax whose *resolution* you configure, and Tier-3 app extensions. | Tier-2: `tests/corpus-optional`; Tier-3: snapshot test only |
| [**Processor options**](/examples/processor-options) | Renderer switches, not extensions: typography modes, section wrapping, non-HTML targets. | `tests/corpus-optional` |
| [**Edge cases**](/examples/edge-cases/) | Boundary rules: what happens when a construct is unmatched, malformed, or deliberately not special. | `tests/corpus` (mandatory) |

Every `::: compare` pair on the Core and Edge cases pages is part of the [conformance corpus](/grammar): the HTML shown is generated from the same fixtures the reference implementations are tested against, so it cannot drift from real output.

The Extensions and Processor options pages show their output as static comparisons rather than live renders, because that output depends on configuration this site does not apply.
