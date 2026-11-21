---
description: How extensions claim existing Carve forms without adding new syntax.
---

# Optional features and extensions

Carve 0.2 keeps core syntax fixed. An extension claims an existing inline `:name[content]`, a named div, or a fenced code block after core parsing. It cannot add a new delimiter or line shape. The [extension specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#registration-and-matching) defines registration, transformation, fallbacks, and rendering.

## What a document carries

A host can register a matcher for this core inline form:

```carve
:badge[Ready]
```

A qualified extension has a name such as `org.example.badge` and an exact version. A producer declares it at the document root or envelope. Its node has a same-role core fallback. A reader that does not know an optional extension keeps the declaration and uses the fallback; a reader refuses an unknown required extension. Unclaimed source forms remain core nodes. See [AST extension nodes](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources) and [matching](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#registration-and-matching).

## Enable a renderer

The JavaScript reference host accepts `extensions` for parser transforms and a `renderers` map for static HTML rendering. Match the qualified name and version. A renderer is trusted code; use the host's escaping and URL helpers for dynamic content. Without a matching renderer, HTML uses the fallback and reports a diagnostic. See [extension rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#resolution-rendering-and-equality).

The optional `carve.tabs` and `carve.tab` extensions demonstrate a standard extension, but the extension interface and catalog are provisional in the freeze candidate. Check [status](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md) before pinning an extension integration.

For implementation details, read the [contract map](./extension-contract.md) and [runnable tutorial](./extension-tutorial.md).

## Feature tiers (quick reference) {#feature-tiers-quick-reference}

The 0.2 extension catalog is provisional. Check the [status](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md) and [extension specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md) for the current set. The 0.1 tier table does not classify 0.2 features.

<a id="_9-headingnumbers-tier-3"></a>
<a id="_6-1-data-source"></a>

## Changed extension catalog

Older documentation linked to heading-number and bibliography integrations at these anchors. They are not part of the frozen 0.2 core or the provisional standard tabs catalog. Implement them as host extensions against the current [extension interface](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md), with a core fallback, after checking the [status](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md).
