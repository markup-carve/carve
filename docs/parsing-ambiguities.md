---
description: How Carve reads syntax that could otherwise have more than one interpretation.
---

# Syntax Edge Cases

> **Non-normative.** This page is an authoring guide. The 0.2 block and inline chapters are normative; the 0.1 grammar in `resources/grammar.ebnf` does not describe 0.2.

The 0.2 block and inline chapters give explicit priorities when a character has more than one possible role. This page is an authoring guide to those choices. Use the [block chapter](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md) and [inline chapter](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md) for exact cases.

## A block opener in paragraph text

A heading, quote, attribute line, definition, or include directive can be a lazy line of an open paragraph. Leave a blank line before a new block. A table row and a star thematic break have their own interruption rules. See [paragraphs and interrupters](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#paragraphs-and-interrupters).

## A line below a block

Only a paragraph takes unindented lines. Every other block continues only on lines indented past its marker: a heading, a caption and a description term hold the indented lines below them, a link definition takes an indented title or attribute block, and an abbreviation definition takes indented expansion lines. An unindented line ends each of them. A line that repeats a marker, such as `>` or a table row, is read by that marker. A fenced block (code, div, comment block) is the exception: its body runs to the closing fence. A blank line ends every block but a fenced one; after it, only a list item, a description or a footnote goes on, and only with blocks indented to its content. See [labels](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#labels).

## A slash or star in a word

Bare `/` and `*` need boundary conditions to become emphasis or strong text. A run of two or more of the same bare delimiter is literal text, so Markdown `**bold**` does not make strong text. Use a braced pair when a boundary needs to be explicit. See [emphasis and strong](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md#emphasis-and-strong).

## A brace at inline position

A valid attribute block takes priority over a braced comment, editorial comment, or braced delimiter. An invalid attribute candidate continues through the remaining brace rules. See [the opening brace](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md#the-opening-brace).

## A pipe in a table

A table row needs its closing pipe. `|=` marks a header only under the cell prefix rules; a glued letter can make it cell text. Span marks join cells backward, and a blocked span mark stays text with a diagnostic. See [tables](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#tables).

## An open fence

An opener is decided on its own line. An unclosed code, div, or comment fence remains a block and reports an error; it does not revert to paragraph text. A code body is opaque. See [fences and comments](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#fences-divs-and-comment-blocks).
