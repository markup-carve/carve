---
description: How Carve treats blank lines, quote markers, tabs, trailing spaces and line endings, so a document survives an editor save and reads the same in Djot where the syntax overlaps.
---

# Portable Whitespace

Whitespace decides where a block starts and which container owns a line in
Carve 0.2. The habits on this page keep a document readable and keep an edit
from changing the blocks around it. Most of them are also what `carve fmt`
writes, and lint reports the cases where whitespace changes the meaning.

Carve is not Djot, and a Carve document is not Djot source: emphasis, headings
and several other forms are spelled differently (see
[Divergence from Djot](./divergence-from-djot)). Where the two languages share
syntax, though, the forms below read the same in both, so a document that
keeps to them is easier to move between the two. The Djot behavior quoted here
was measured with djot.js.

## Leave a blank line before a block

A paragraph takes every following line that is not blank, unless that line
interrupts it. A heading, a quote, an attribute line, a definition and a list
marker do not interrupt a paragraph: below a paragraph line they are lazy text
of that paragraph. Lint reports the heading, quote and definition cases as
`block-opener-without-blank-line` and the list case as
`list-marker-without-blank-line`:

<!-- carve-sample {"lint":"the heading folds into the paragraph on purpose"} -->
::: compare
```crv
Some text
= A heading
```

```html
<p>Some text
= A heading</p>
```
:::

Djot reads the same lines the same way. The blank line makes the heading a
heading in both:

::: compare
```crv
Some text

= A heading
```

```html
<p>Some text</p>
<section id="A-heading">
  <h1>A heading</h1>
</section>
```
:::

Three lines do interrupt a Carve paragraph: a fence line (backticks, `:::` or
`%%%`), a table row and a `***` thematic break. Djot does not interrupt for
any of them and folds the line into the paragraph as text:

````
Some text
```
code
```
````

Carve renders a paragraph and a code block; Djot renders one paragraph with an
inline code span. `carve fmt` writes a blank line before the fence, which gives
the same blocks in both.

The same holds one level in, where the paragraph is a list item's text:

```
- a
  - b
```

Carve nests the second bullet without a blank line; Djot reads `- b` as a
continuation line of the first item. A blank line between them nests in both,
but `carve fmt` removes that blank line again, since it writes a nested list
directly below its parent item. Keep the blank line by hand only if the file
has to be read by Djot too.

## Indent the lines that continue a block

Only a paragraph takes unindented lines. Every other block continues only on
lines indented past its marker, so indent the second line of a heading, a
caption or a term past its marker:

::: compare
```crv
= A long heading
  that goes on

Text.
```

```html
<section id="A-long-heading-that-goes-on">
  <h1>A long heading
that goes on</h1>
  <p>Text.</p>
</section>
```
:::

An unindented line below a heading starts the next block, so two headings, or
a heading and its first paragraph, need no blank line between them; `carve fmt`
still writes one.

A line that repeats a marker, such as `>` or a table row, is read by that
marker. A fenced block (code, div, comment block) is the exception: its body
runs to the closing fence or the end of its container (C2-B-111). A blank line
ends every block but a fenced one. After it, only a list item, a description or
a footnote goes on, and only with blocks indented to its content:

::: compare
```crv
- First item

  A second paragraph of the item.
```

```html
<ul>
  <li>First item
    <p>A second paragraph of the item.</p>
  </li>
</ul>
```
:::

Three or more blank lines before a list marker end the list, and the marker
starts a new one:

::: compare
```crv
- a



- b
```

```html
<ul>
  <li>a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```
:::

## Put a space after every `>`

The quote marker is `>` followed by a space or by the end of the line, so
`>quote` is text. Lint reports a marker without its space as
`blockquote-marker-without-space`:

<!-- carve-sample {"lint":"the marker has no space on purpose"} -->
::: compare
```crv
>quote
```

```html
<p>&gt;quote</p>
```
:::

There is no `>>` shorthand; write each marker with its space:

::: compare
```crv
> > q
```

```html
<blockquote>
  <blockquote><p>q</p></blockquote>
</blockquote>
```
:::

Every marked line of the quote needs the space, not just the first one.
Below, `>bad` is a lazy line of the quoted paragraph, not a quote marker:

<!-- carve-sample {"lint":"the second marker has no space on purpose","fmtSkip":"fmt writes the lazy line with its own marker"} -->
::: compare
```crv
> ok
>bad
```

```html
<blockquote><p>ok
&gt;bad</p></blockquote>
```
:::

A bare `>` line inside a quote separates two paragraphs of the quote. A blank
line without the marker ends the quote, so two quotes separated by a blank line
are two quotes. Lazy lines with no marker and extra spaces after the marker
are valid, but `carve fmt` writes one space and a marker on every line.

A tab after the marker is not a space. The line is text, marker and all, and
lint reports it; Djot opens a quote there. A list marker follows the same rule:
it needs one space and content, so `-` followed by a tab is text too.

## Tabs

A leading tab moves the column to the next multiple of 4, counted from the
start of the line, not from the container's content column. The tab is only
counted this way: the bytes stay as written, also in code. When indentation is
stripped, a tab that straddles the strip column is kept whole (C2-B-004 to
C2-B-007).

So a tab can indent the continuation of a list item, but the result depends on
where the marker stands. Spaces make the columns visible. `carve fmt` writes
spaces for the indentation of blocks and keeps tabs inside code blocks, raw
blocks and comment blocks, where they are data.

## Trailing spaces

Spaces and tabs at the end of a line are not part of the content
(C2-I-002), and they never make a hard break (C2-I-103). An editor that strips
them on save changes nothing. For a hard break, end the line with a backslash:

::: compare
```crv
one
two\
three
```

```html
<p>one
two<br>
three</p>
```
:::

`carve fmt` removes trailing spaces outside verbatim content, and writes a line
that holds only spaces as an empty line (C2-W-021, C2-W-022).

## Line endings and the byte order mark

A line ends at a line feed. A carriage return directly before it is not part of
the line, so CRLF files read the same as LF files. A lone carriage return is no
line end and stays content (C2-B-010). A byte order mark at the start of the
file is skipped and does not shift the columns of line 1 (C2-B-165).

`carve fmt` writes LF line endings and ends the output with one line ending.
Configure `.gitattributes` or the editor to keep `.crv` files at LF, so that a
checkout on Windows does not turn every line into a diff.

## Keep openers at the margin

A block opener indented past its container's content column still opens its
block, measured from its own line, but lint reports it as
`block-opener-overindented`. Djot also accepts an indented opener, so this is
not a portability issue; it keeps the structure visible:

<!-- carve-sample {"lint":"the heading is indented on purpose","fmtSkip":"fmt removes the indent this sample shows"} -->
::: compare
```crv
  = H
```

```html
<section id="H">
  <h1>H</h1>
</section>
```
:::

## Format the result

`carve fmt --check file.crv` checks whether the source is in the writer's
canonical form, and `carve fmt --write` rewrites it. Formatting does not
replace a render check when you change indentation or blank lines by hand:
compare the HTML of representative pages after such a change.

## What this page does not cover

Constructs Carve deliberately spells differently from Djot, such as
`/emphasis/`, `*strong*`, `=` headings and `{_underline_}`, are on
[Divergence from Djot](./divergence-from-djot). No whitespace habit recovers
them.

**Specification (external):** [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md), clauses C2-B-001 to C2-B-034 (lines, columns, interrupters and container ownership), C2-B-052, C2-B-111, C2-B-154, C2-B-165 and C2-B-234; [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md), clauses C2-I-002, C2-I-102 and C2-I-103; [Writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md), clauses C2-W-021 and C2-W-022.
