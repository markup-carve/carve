---
title: Examples
description: Side-by-side Carve source and the output it produces, split by what is always on, what you switch on, and what only shows up at the boundaries.
---

# Examples

Each example shows Carve source and its HTML output. Select **Rendered** to see
the result. The JavaScript, PHP, and Rust implementations are tested against
these expected outputs.

The examples are grouped by whether a feature is always available, must be
enabled, or applies only to unusual input.

| Page | What is on it | Pinned in |
|---|---|---|
| [**Core**](/examples/core) | Syntax available without configuration and supported by every implementation. | Required input/output tests |
| [**Optional features**](/examples/extensions) | Features shared by all implementations but disabled initially, plus application-specific extensions. | Shared optional tests or application tests |
| [**Parser and output settings**](/examples/processor-options) | Typography settings, heading-section wrappers, and non-HTML output. | Shared optional tests |
| [**Edge cases**](/examples/edge-cases/) | Unmatched, incomplete, or intentionally literal syntax. | Required input/output tests |

Every comparison on the Core and Edge Cases pages comes from the same
[input/output tests](/grammar) used by the JavaScript, PHP, and Rust
implementations. The displayed HTML is generated from those tests.

The Optional Features and Settings pages show saved output because the result
depends on configuration that this site does not enable.
