---
description: Choose and enable optional Carve features without losing readable fallback output.
---

# Optional features and extensions

Carve documents remain readable when an optional feature is unavailable. The
syntax still parses; only the richer behavior may be missing. Use this page to
choose features for an application and understand their fallback.

For the API rules used to implement an extension, read the
[extension contract](./extension-contract). For a complete worked example, see
[Write an extension](./extension-tutorial).

## What is available {#feature-tiers-quick-reference}

| Availability | What it means | Default |
|---|---|---|
| **Core** | Every conforming Carve processor supports it. | On |
| **Standard optional** | The reference implementations provide it, but applications enable it explicitly. | Off |
| **Application extension** | A particular implementation or host supplies it. Check that application. | Off |

These are availability groups, not quality levels. “Optional” means that a
document has a useful fallback when the feature is not enabled.

## Frequently used optional features

| Feature | Availability | What it adds | Without the feature |
|---|---|---|---|
| Citations | Standard optional | `[@key]` and locators | Citation source remains visible |
| List tables | Standard optional | Block content, row spans, and column spans in table cells | The containing list remains readable |
| Details | Standard optional | Native `<details>` and `<summary>` disclosure | A normal details container |
| Spoiler | Standard optional | Hidden content with an accessible reveal control | A visible generic span or container |
| Tabs | Standard optional | A set of named panels | Panels remain ordinary document content |
| Code callouts | Standard optional | Numbered explanations attached to code | Code and explanation list remain |
| Semantic spans | Standard optional | `samp`, `var`, `cite`, and `dfn` elements | A span carrying the semantic attribute |

The [feature availability](./native-features-analysis) page includes core
syntax and features that are available by default with an opt-out.

## Features supplied by applications

These depend on a renderer, data source, or user-interface environment and may
not exist in every implementation:

- Mermaid and other diagram renderers
- bibliography formatting from CSL-JSON data as an option on citations
- glossary and index generation
- table-of-contents placement
- heading numbers and permalinks
- tabbed code groups
- external-link policies
- wikilinks and references to headings in the current document
- color swatches and other presentation helpers
- sanitized SVG image fences

Check the documentation for your chosen implementation before designing a
workflow around one of these features.

## Enable a feature

Extensions are registered on a processor or renderer. The exact constructor
names differ by language, but the workflow is the same:

1. Create the extension or choose a supplied one.
2. Register it when creating the processor.
3. Render a representative document and inspect its fallback with the extension
   disabled.
4. For interactive output, also test the [static-output fallback](./graceful-degradation).

Implementation-specific setup is linked from [Implementations and
tooling](./ecosystem).

## Unknown extension names

The inline form `:name[text]` and block form `::: name` are core syntax. If no
handler recognizes `name`, Carve uses a generic span or container. This keeps
the content present and gives applications a stable place to add behavior.

```carve
:product[Trail shoes]{sku=TR-42}

::: product-card
Trail shoes are available in three sizes.
:::
```

An application can later attach meaning to `product` and `product-card`; a
plain processor still preserves their words and attributes.

## Choosing between document syntax and an extension

Prefer core syntax when the meaning belongs in the document and should work in
every processor. Prefer an extension when the behavior needs external data,
application state, a third-party renderer, or an interactive interface.

Good extension behavior has three properties:

- the source remains understandable without the extension;
- disabling the extension does not silently discard authored words;
- unavailable interaction degrades to useful static output.

## Technical reference

The [extension contract](./extension-contract) defines matcher purity,
transforms, rendering hooks, generated identifiers, configuration, feature
tiers, and the normative behavior of the standard extensions. It is intended
for extension and engine authors rather than readers choosing a feature.
