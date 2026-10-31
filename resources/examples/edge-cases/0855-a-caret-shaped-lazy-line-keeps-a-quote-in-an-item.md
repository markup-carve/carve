---
page: edge-lists
---

## A caret-shaped lazy line keeps a quote in an item

A caption attaches only to a quote directly under the line's owner. Past an item the caret line is a lazy line, and the quote stays open.

::: compare

```carve
- > a
^ J
   > b
```

```html
<ul>
  <li>
    <blockquote><p>a
^ J
b</p></blockquote>
  </li>
</ul>
```

:::

::: compare

```carve
:: t
: > a
^ J
   > b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>a
^ J
b</p></blockquote>
  </dd>
</dl>
```

:::
