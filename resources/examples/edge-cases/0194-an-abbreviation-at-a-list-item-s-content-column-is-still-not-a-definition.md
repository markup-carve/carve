## An abbreviation at a list item's content column is still not a definition

At an item's content column, on a continuation line, the line is a definition like the other definition kinds (carve#4865). The section title names the reading carve#4865 replaced and stays as the corpus id.

::: compare

```carve
- a
  *[HTML]: Hyper Text

The HTML spec.
```

```html
<ul>
  <li>a</li>
</ul>
<p>The <abbr title="Hyper Text">HTML</abbr> spec.</p>
```

:::

A reference definition at that same column reads the same way.

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
