## A block opener past a nested footnote definition opens in the item

A footnote definition is invisible at its authored location. Its body reaches two columns past the marker, while a below-column line may continue an open note paragraph under §24 C3. The fixture name preserves the former owner reading; the new output follows the shared marker-body rule.

::: compare

```carve
- body

  [^g]: n
   # h

after
```

```html
<ul>
  <li>body
    <h1 id="h">h</h1>
  </li>
</ul>
<p>after</p>
```

:::

A quote marker opens its blockquote the same way.

::: compare

```carve
- body

  [^g]: n
   > z

after
```

```html
<ul>
  <li>body
    <blockquote><p>z</p></blockquote>
  </li>
</ul>
<p>after</p>
```

:::

A line that opens nothing is the control. `prose` is below the note's body
column, but its open paragraph claims the line lazily. It adds no second
paragraph to the item, which stays tight.

::: compare

```carve
- body

  [^g]: n
   prose

after
```

```html
<ul>
  <li>body</li>
</ul>
<p>after</p>
```

:::

A list marker opens a sublist, which is what makes the rule about MARKERS and
not about the column: the same column that carries a heading, a quote and a
sublist carries plain text as a paragraph.

::: compare

```carve
- body

  [^g]: n
   - item

after
```

```html
<ul>
  <li>body</li>
</ul>
<p>after</p>
```

:::
