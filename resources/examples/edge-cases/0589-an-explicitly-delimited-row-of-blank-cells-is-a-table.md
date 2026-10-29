## An explicitly delimited row of blank cells is a table

A standard row needs an opening pipe, a closing pipe and at least one cell
slot between them (PART 9 §5 T2). Empty content fills a slot like any other
content, so a row of blank cells opens a table, interrupts a paragraph, and
stays a row inside a table, under one predicate (markup-carve/carve#2879). This
replaces the all-blank rejection of markup-carve/carve#1950, whose sections 113
and 453 now carry the new expectations. A blank cell is an empty children list;
nothing is synthesized to fill it.

One empty data cell, padded and unpadded:

::: compare

```carve
| |
```

```html
<table>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
||
```

```html
<table>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

Two empty data cells, and three. Every slot between two delimiters is a cell:

::: compare

```carve
|||
```

```html
<table>
  <tbody>
    <tr><td></td><td></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| | |
```

```html
<table>
  <tbody>
    <tr><td></td><td></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
||||
```

```html
<table>
  <tbody>
    <tr><td></td><td></td><td></td></tr>
  </tbody>
</table>
```

:::

An empty marked cell keeps the marker run and the space that ends it (T11).
`|= |` is an empty header cell; `|=|` has no run, so its content is a literal `=`:

::: compare

```carve
|= |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th></tr>
  </thead>
</table>
```

:::

::: compare

```carve
|=|
```

```html
<table>
  <tbody>
    <tr><td>=</td></tr>
  </tbody>
</table>
```

:::

The alignment run follows the same rule, `|> |` against `|>|`:

::: compare

```carve
|> |
```

```html
<table>
  <tbody>
    <tr><td style="text-align: right;"></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|>|
```

```html
<table>
  <tbody>
    <tr><td>&gt;</td></tr>
  </tbody>
</table>
```

:::

The whole run in its one order, kind, alignment, attributes, then the space:

::: compare

```carve
|=~{.x} |
```

```html
<table>
  <thead>
    <tr><th scope="col" class="x" style="text-align: center;"></th></tr>
  </thead>
</table>
```

:::

A cell attribute block needs the space too. Without it there is no run, and
the block is cell content:

::: compare

```carve
|{#x} |
```

```html
<table>
  <tbody>
    <tr><td id="x"></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|{#x}|
```

```html
<table>
  <tbody>
    <tr><td>{<span class="tag"><strong>#x</strong></span>}</td></tr>
  </tbody>
</table>
```

:::

A row attribute block glued to the closing pipe stays on the row, not on the
blank cell (T8):

::: compare

```carve
| |{.row}
```

```html
<table>
  <tbody>
    <tr class="row"><td></td></tr>
  </tbody>
</table>
```

:::

A malformed row attribute block leaves content after the last pipe, so the
line is prose, as it is for a row with content. A malformed cell attribute
block is cell content:

::: compare

```carve
| |{bad!!}
```

```html
<p>| |{bad!!}</p>
```

:::

::: compare

```carve
|{bad!!} |
```

```html
<table>
  <tbody>
    <tr><td>{bad!!}</td></tr>
  </tbody>
</table>
```

:::

A lone pipe has no closing delimiter and no slot, so it stays paragraph text.
A missing closer keeps its existing reading, with no blank-row exception:

::: compare

```carve
|
```

```html
<p>|</p>
```

:::

::: compare

```carve
| a | b
```

```html
<p>| a | b</p>
```

:::

Escaped pipes and pipes inside a code span are content, never delimiters
(T1). An escaped opener keeps the whole line literal:

::: compare

```carve
| \| |
```

```html
<table>
  <tbody>
    <tr><td>|</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
\| |
```

```html
<p>| |</p>
```

:::

::: compare

```carve
| `|` |
```

```html
<table>
  <tbody>
    <tr><td><code>|</code></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| `a|b` | |
```

```html
<table>
  <tbody>
    <tr><td><code>a|b</code></td><td></td></tr>
  </tbody>
</table>
```

:::

Only ASCII spaces are padding. A tab between the pipes is cell content, not
an empty cell (PART 7). Trailing whitespace after the closing pipe changes
nothing:

::: compare

```carve
|	|
```

```html
<table>
  <tbody>
    <tr><td>	</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| |   
```

```html
<table>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

A blank row interrupts a paragraph, because opening and interruption share
the predicate:

::: compare

```carve
text
| |
```

```html
<p>text</p>
<table>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
text
|||
```

```html
<p>text</p>
<table>
  <tbody>
    <tr><td></td><td></td></tr>
  </tbody>
</table>
```

:::

Blank rows before and after rows with content, and consecutive blank rows,
are rows of their own. None disappears and none merges with its neighbor:

::: compare

```carve
| |
| a |
| |
```

```html
<table>
  <tbody>
    <tr><td></td></tr>
    <tr><td>a</td></tr>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| | |
|||
| | |
```

```html
<table>
  <tbody>
    <tr><td></td><td></td></tr>
    <tr><td></td><td></td></tr>
    <tr><td></td><td></td></tr>
  </tbody>
</table>
```

:::

Inside a quote and inside list items, under the hosts' usual content columns:

::: compare

```carve
> text
> | |
> | |
```

```html
<blockquote>
  <p>text</p>
  <table>
    <tbody>
      <tr><td></td></tr>
      <tr><td></td></tr>
    </tbody>
  </table>
</blockquote>
```

:::

::: compare

```carve
- | |
- |||
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td></td></tr>
      </tbody>
    </table>
  </li>
  <li>
    <table>
      <tbody>
        <tr><td></td><td></td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::

A caption attaches to a table of blank rows like any other:

::: compare

```carve
| |
^ A caption
```

```html
<table>
  <caption>A caption</caption>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

Empty header rows before and after a body row keep the existing header-region
and scope rules:

::: compare

```carve
|= |= |
| a | b |
|= |= |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th><th scope="col"></th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><th scope="row"></th><th scope="row"></th></tr>
  </tbody>
</table>
```

:::

A blank first row followed by a GFM delimiter row is promoted to an empty
header row (T7):

::: compare

```carve
| | |
|---|---|
| a | b |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th><th scope="col"></th></tr>
  </thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

A continuation row creates no row. It fills the blank row above it, and an
empty continuation appends nothing and does not become a blank row (T6):

::: compare

```carve
| | |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>x</td><td>y</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| |
+ |
| |
```

```html
<table>
  <tbody>
    <tr><td></td></tr>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

A table still cannot begin with a continuation row, blank or not:

::: compare

```carve
+ | |
```

```html
<p>+ | |</p>
```

:::

Span markers keep their existing walk. A blank cell can be the origin a
marker extends, and no rule fills blank cells (T5):

::: compare

```carve
| | < |
| ^ | ^ |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2" colspan="2"></td></tr>
    <tr></tr>
  </tbody>
</table>
```

:::
