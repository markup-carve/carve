## An abbreviation at a list item's content column is still not a definition

`*[TERM]: expansion` is recognized only at document level - NORMATIVE, and already pinned inside a block quote and on a list item's MARKER line. The position that was missing is the one where the other definition kinds do the opposite: an item's CONTENT COLUMN, on a continuation line. There the line is item text and defines nothing, so the reference below it renders without an `<abbr>`.

::: compare

```carve
- a
  *[HTML]: Hyper Text

The HTML spec.
```

```html
<ul>
  <li>a
*[HTML]: Hyper Text</li>
</ul>
<p>The HTML spec.</p>
```

:::

The contrast is the point: a REFERENCE definition written at that same column IS the item's block, so it renders nothing and resolves. Three definition kinds, one column, two answers - and until now nothing measured the difference at this position.

::: compare

```carve
- a
  [r]: /u

see [t][r]
```

```html
<ul>
  <li>a</li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::
