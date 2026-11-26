---
title: Cheat Sheet
description: Every Carve construct on one scannable page.
---

# Cheat Sheet

This is a compact 0.2 authoring reference. The [block](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md) and [inline](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md) chapters decide edge cases. Separate blocks with a blank line when you want an unambiguous start.

## Inline

| Meaning | Write |
|---|---|
| Emphasis | `/word/` |
| Strong | `*word*` |
| Underline | `{_word_}` |
| Strike | `{~word~}` |
| Highlight | `{=word=}` |
| Superscript | `{^2^}` |
| Subscript | `{,2,}` |
| Code | `` `code` `` |
| Link | `[label](https://example.com)` |
| Image | `![alt](image.png)` |
| Cross-reference | `</#heading-id>` |
| Footnote reference | `[^note]` |
| Inline math | `` $`x + y` `` |

Bare `_`, `~`, and `=` no longer delimit underline, strike, and highlight. Use the braced spellings. See [inline delimiters](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md#emphasis-and-strong).

## Blocks

````crv
= Heading

A paragraph.

> A quotation.

- An item
- Another item

1. First
2. Second

***

```js
const answer = 42
```
````

The outer fence above is documentation markup; the inner `js` fence is Carve source. A `+` at the start of a line is text in 0.2. A thematic break is a run of stars, not `---` or `___`. See [block structure](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md).

## Tables and captions

```crv
|= Name |={>} Qty |
| Apples | 3 |
^ Inventory
```

`|=` marks a header cell. The brace prefix carries alignment. A GFM separator line is a data row in 0.2. See [tables](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#tables).

## Attributes and includes

```crv
{.lead}
An introduction paragraph.
```

For a section, an attribute line can carry an id, such as `{#intro}`, above its heading. An include directive looks like <code>&#123;&#123; chapter.crv #summary &#125;&#125;</code>.

An attribute line attaches to the next block only when its placement satisfies the block rules. Includes expand only with an enabled resolver and a permitted root. See [attributes](./blocks-and-attributes) and [includes](./include-files).

### CSV and TSV data

A `csv` or `tsv` code fence with a `table` attribute is a delimited table. Without that attribute it is a code block. The body is read as records; quoted fields can contain separators and line breaks. See [delimited tables](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#tables).
