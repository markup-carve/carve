## An abbreviation definition in an item body is paragraph text

An abbreviation definition in an item body is a definition (PART 12 §7, carve#4865), so it adds no paragraph and on its own leaves the list tight. The section title names the reading carve#4865 replaced and stays as the corpus id.

::: compare

```carve
- a

  *[A]: a
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

A sublist after it is a block after the blank, so the item is loose (PART 9 §17 L1b):

::: compare

```carve
- a

  *[A]: a
  - b
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

A sibling item reads the same way:

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
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A link reference definition inside the item reads the same way.

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
