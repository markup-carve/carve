# Divergence from Djot

Carve and Djot share some visible forms but have different parsing and output contracts. Treat a Djot document as input to a conversion workflow, then review the result. The [0.2 block](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md), [inline](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md), and [HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md) chapters define Carve behavior.

## Strong and emphasis

Carve uses one bare star for strong and one bare slash for emphasis. Repeated bare delimiters are literal. Braced pairs can make a boundary explicit. Do not assume Djot emphasis syntax has the same meaning here.

## Lists and blocks

<a id="_7-block-openers-interrupt-paragraphs-markdown-like"></a>

### Paragraph interruption in 0.2

A heading or quote after an open paragraph is usually a lazy line of that paragraph. A list marker interrupts only under its list rules; a table row and a star thematic break have their own cases. Leave a blank line before a heading or quote that should start a new block. See [paragraphs and interrupters](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#paragraphs-and-interrupters).

Carve 0.2 uses `-` or `*` for bullets. `+` at the start of a line is text except for a table continuation row. Ordered markers have decimal, alphabetic, roman, and bare-dot forms, with context rules for ambiguous letters. A heading or quote after an open paragraph may be a lazy line, so put a blank line before a new block.

## Tables and HTML

Carve header cells use `|=`. A GFM-style separator row is data in 0.2. HTML output follows Carve's section, table, and URL rules, not Djot's. Raw HTML must be explicit and allowed by the host.

## Porting

Convert Djot to HTML with a trusted tool, then import the HTML into Carve with `carve2 import --from html`. Inspect diagnostics and compare the rendered page. The [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) contract describes what can be represented. The [Markdown migration guide](./migrate-from-markdown) explains the same hub workflow for Markdown.
