## Sublist marker interrupts a continuation paragraph

A list marker reaching a list item's **content column** always starts a sublist, even when the item holds an open continuation paragraph (PART 0 S3, PART 9 §24 C3). The general rule that list markers never interrupt a paragraph applies to markers *below* the content column (lazy continuation) and at the top level — not to a correctly indented sublist marker.

::: compare

```carve
- first

  second
  - nested
```

```html
<ul>
  <li><p>first</p>
    <p>second</p>
    <ul>
      <li>nested</li>
    </ul>
  </li>
</ul>
```

:::

Ordered markers behave identically (the symmetric list rule): an ordered marker at the content column nests.

::: compare

```carve
- first

  second
  1. nested
```

```html
<ul>
  <li><p>first</p>
    <p>second</p>
    <ol>
      <li>nested</li>
    </ol>
  </li>
</ul>
```

:::
