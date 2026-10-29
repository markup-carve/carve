## An abbreviation definition in an item body is paragraph text

PART 12 §7 says an `abbreviation_definition` is one only as a direct child of the
document: written inside a block quote, a list item or a div, "the line is not a
definition at all: it is ordinary paragraph text, it defines nothing, and it is
preserved as the text the author typed". So the looseness question §17 L1 asks -
does the item hold a blank-line-separated second paragraph - has an answer that
follows from §7 rather than from a rule about abbreviations: the line renders, so
it IS that paragraph, and the item is loose.

::: compare

```carve
- a

  *[A]: a
```

```html
<ul>
  <li><p>a</p>
    <p>*[A]: a</p>
  </li>
</ul>
```

:::

Nothing changes when a sublist follows it. The definition-shaped line is already
the second paragraph, and §17 L2's attached sub-block cannot take that back:

::: compare

```carve
- a

  *[A]: a
  - b
```

```html
<ul>
  <li><p>a</p>
    <p>*[A]: a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

Looseness is a property of the LIST, so a sibling item is wrapped too:

::: compare

```carve
- a

  *[A]: a
  - b
- c
```

```html
<ul>
  <li><p>a</p>
    <p>*[A]: a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

The control is the definition kind that IS collected at that column. A link
reference definition inside the item renders nothing, resolves for the rest of
the document, and leaves the item tight - which is what makes the abbreviation's
answer a consequence of §7 rather than an inconsistency:

::: compare

```carve
- a

  [r]: /u

See [x][r].
```

```html
<ul>
  <li>a</li>
</ul>
<p>See <a href="/u">x</a>.</p>
```

:::

At document level the abbreviation is collected, renders nothing of its own, and
expands its term - the behavior the container position does not get:

::: compare

```carve
*[A]: alpha

A here
```

```html
<p><abbr title="alpha">A</abbr> here</p>
```

:::
