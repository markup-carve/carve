---
page: edge-lists
---

## A span's closer after a blank keeps the list tight

A blank inside a list item's `%%%` span is payload, and the span's closer is the item's (PART 0 S1, PART 9 §28). When only that closer stands between the blank and the next sibling marker, something of the item follows the blank, so the blank is interior, like a code fence's (PART 9 §17 L1c, carve#5030). The list stays tight wherever the span opens: on the marker line, on its own line, in a nested item, after a nested marker, or on a description lead. The last case is the control: with no closer, the sibling marker ends the span (PART 0 S1), nothing of the item follows the blank, and the list is loose.

::: compare

```carve
- %%%

  %%%
- d
```

```html
<ul>
  <li></li>
  <li>d</li>
</ul>
```

:::

::: compare

```carve
- a
  %%%

  %%%
- d
```

```html
<ul>
  <li>a</li>
  <li>d</li>
</ul>
```

:::

::: compare

```carve
- a
  - b
    %%%

    %%%
- c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

::: compare

```carve
- a
  :: u
  : %%%

    %%%
- c
```

```html
<ul>
  <li>a
    <dl>
      <dt>u</dt>
      <dd></dd>
    </dl>
  </li>
  <li>c</li>
</ul>
```

:::

::: compare

```carve
- a
  - %%%

    %%%
- c
```

```html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

::: compare

```carve
- a
  %%%

- d
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>d</p></li>
</ul>
```

:::
