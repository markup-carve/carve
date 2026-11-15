---
page: edge-lists
---

## An empty comment span is written as adjacent delimiters

A `%%%` span with no payload is written as its opener directly followed by its closer. An empty payload line between them would be a blank inside the list item, and before a sibling marker that blank loosens the list on the next read (§17 L1c), so the writer could not keep the document the same or settle (PART 11 §1, §1a; carve#5022). Each case carries a `.fmt` fixture. The first is a description lead in a list item, the second a span on a list marker line, the third a span inside an item.

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
- %%%
  %%%
- c
```

```html
<ul>
  <li></li>
  <li>c</li>
</ul>
```

:::

::: compare

```carve
- a
  %%%
  %%%
- c
```

```html
<ul>
  <li>a</li>
  <li>c</li>
</ul>
```

:::
