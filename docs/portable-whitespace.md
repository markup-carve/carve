---
description: How Carve treats tabs, trailing spaces and line endings so a document survives an editor save.
---

# Portable Whitespace

Whitespace determines block starts and container ownership in Carve 0.2. These habits make a document easier to read and keep edits from changing nearby blocks. The exact rules are in [paragraphs and interrupters](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#paragraphs-and-interrupters) and [container ownership](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#container-ownership-and-stripping).

## Separate a new block

```crv
A paragraph ends here.

= A heading

> A quote.
```

A heading or quote without the blank line can be a lazy paragraph line. List markers have their own interruption rules. When a list should be separate, leave the blank line.

Only a paragraph takes unindented lines. Every other block continues only on lines indented past its marker, so indent the second line of a heading, a caption or a term past its marker. A fenced block (code, div, comment block) is the exception: its body runs to the closing fence. A blank line ends every block but a fenced one; after it, only a list item, a description or a footnote goes on, and only with blocks indented to its content.

## Keep container prefixes clear

```crv
> First quoted line.
> Second quoted line.
```

A quote marker needs a following space or the end of its line. Use the marker on each line whose ownership should be clear. For list items, indent continued blocks past the item marker's content column. A line with `+` does not continue a container in 0.2.

## Format the result

`carve fmt --check file.crv` checks whether the source is in the writer's canonical form. It does not replace a render check when changing indentation or blank lines; compare the HTML of representative pages after a migration. See [writer and fmt](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md).
