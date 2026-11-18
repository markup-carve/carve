---
description: The design choices behind Carve 0.2's native syntax and optional behavior.
---

# Feature design notes

Carve 0.2 keeps common document structures in core syntax. Optional behavior is described in [Extensions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md), whose interface is provisional. The examples here use the 0.2 [block](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md) and [inline](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md) rules.

## Visible structure

A heading, a caption and a table have distinct source forms. The native table header uses `|=` cells. A separator row of hyphens is not needed to identify the header.

```crv
= Inventory

|= Name |= Qty |
| Apple | 12 |
```

The source above renders as a section with a heading and a table. The [HTML rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#tables) decide its exact elements and attributes.

A caption belongs to the block it follows. The tree stores it on that block, while HTML can wrap a captioned image in a figure.

```crv
![Sunset](sun.jpg)
^ Figure 1: Sunset
```

## Inline roles

`*strong*` and `/emphasis/` give the two familiar emphasis roles. The 0.2 forms for underline, strike and highlight are braced: `{_text_}`, `{~text~}` and `{=text=}`. Bare `_text_`, `~text~` and `=text=` no longer mark those roles. See [Inline syntax, Braced delimiters](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md#braced-delimiters) and the [upgrade guide](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md).

## Optional behavior

An extension can claim a core node and give it a richer tree form. The only standard extension currently listed is tabs. The core source and fallback remain meaningful to a reader without that extension. The [extension contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#transformation-and-carriage) governs this boundary; applications may register their own behavior without adding a core sigil.

These choices reflect a preference for source an author can identify locally and for an AST that preserves meaning across implementations. The [0.2 conformance corpus](./conformance) supplies concrete expected results.
