---
page: edge-lists
---

## A descendant comment span closes between its own column and its item's

A closer written at the item's column but below a note's or a sublist's column still closes the span that note or sublist holds (PART 9 §28), and a blank inside that span is payload (PART 0 S1): it neither ends the note nor separates the item's paragraphs. The line after the closer is read in the owner its column reaches (carve#4996). The last case, a description in a sublist, is the control.

::: compare

```carve
- a

  [^n]: %%%
  %%%
  c
```

```html
<ul>
  <li><p>a</p>
    <p>c</p>
  </li>
</ul>
```

:::

::: compare

```carve
- a

  [^n]: %%%
%%%
    c
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

::: compare

```carve
- a
  - %%%

  %%%
  c
```

```html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
    c
  </li>
</ul>
```

:::

::: compare

```carve
- a
  - b
    :: u
    : %%%

  %%%
  c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <dl>
          <dt>u</dt>
          <dd></dd>
        </dl>
      </li>
    </ul>
    c
  </li>
</ul>
```

:::
