## A marker at an item content column opens a sublist, first in the item or not

PART 9 §24 C3 is the rule: "AT content_column: dedented to the body's column 0,
a block opener nests and a list marker opens a sublist", and it holds "whether or
not a blank line precedes the child". §10 I2 defers to it by name rather than
competing with it - "TIGHT NESTED LISTS UNAFFECTED: an indented marker inside an
open list ITEM opens a sublist with no blank line - that is §24 C3 (content
column), not this relation" - and the clause closes by calling the content-column
model's minimum-column boundary while deeper block bases now follow Djot-style
leniency.

All three engines applied it to the FIRST marker in an item and no other. Each
hands the sub-list off to the list parser and the rest of the body back as a
further chunk, so the first marker met no open paragraph while every later one
met §10 I2 with one open and folded. Two documents differing only by a sub-list
that had already been closed then disagreed about what their shared last line
was - and no answer can depend on a container that has already ended
(markup-carve/carve#1517).

The `- z` below is closed by the blank line long before `- s1` is read. The
ticket's own spelling put a table there instead, which made the cause look like
something about tables; the blank line isolates it.

::: compare

```carve
- o
  - z

  para
  - s1
```

```html
<ul>
  <li><p>o</p>
    <ul>
      <li>z</li>
    </ul>
    <p>para</p>
    <ul>
      <li>s1</li>
    </ul>
  </li>
</ul>
```

:::

One line shorter is the other half of the pair, and it always opened a sublist -
`- s1` is the item's first marker there. The two now agree, which is the whole
point.

::: compare

```carve
- o

  para
  - s1
```

```html
<ul>
  <li><p>o</p>
    <p>para</p>
    <ul>
      <li>s1</li>
    </ul>
  </li>
</ul>
```

:::

Column 0 does not move. §24 C3 is a divergence for a container's CONTENT column,
and the top level is §10 I2, where a marker still folds into an open paragraph.

::: compare

```carve
| a |
para
- s1
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p>para
- s1</p>
```

:::
