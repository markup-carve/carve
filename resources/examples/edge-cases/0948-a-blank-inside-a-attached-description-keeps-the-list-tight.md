---
page: edge-lists
---

## A blank inside a `+`-attached description keeps the list tight

A `+` changes where a block is written, not how it is read (CARVE-P9-067). A blank between a description's paragraphs is the description's, so it loosens the enclosing list no more than it does when the description list is indented into the item (PART 9 §17 L1, carve#5056). The line after the blank stands at the description's body column, which a `+` puts at the item's content column. The rows cover the reproduction, a second description followed by a sibling marker, and a nested item. The last row is the control: a blank ends a quote, so the line after it is the item's own second paragraph and the list is loose.

::: compare

```carve
- a
+
:: term
: d

  x
```

```html
<ul>
  <li>a
    <dl>
      <dt>term</dt>
      <dd>
        <p>d</p>
        <p>x</p>
      </dd>
    </dl>
  </li>
</ul>
```

:::

::: compare

```carve
- a
+
:: t
: d
: e

  x
- b
```

```html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
      <dd>d</dd>
      <dd>
        <p>e</p>
        <p>x</p>
      </dd>
    </dl>
  </li>
  <li>b</li>
</ul>
```

:::

::: compare

```carve
- a
  - b
  +
  :: t
  : d

    x
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <dl>
          <dt>t</dt>
          <dd>
            <p>d</p>
            <p>x</p>
          </dd>
        </dl>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- a
+
> q

  x
```

```html
<ul>
  <li><p>a</p>
    <blockquote><p>q</p></blockquote>
    <p>x</p>
  </li>
</ul>
```

:::
