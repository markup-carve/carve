---
page: edge-lists
---

## A spaced thematic break is tested before a list marker on every line

CARVE-P9 thematic break clause in `03-blocks-core.ebnf` (carve#4814, carve#4880): "the thematic break is tested before a list marker". No line is exempt for following a list item or a description body.

A spaced run under a same-bullet item is a break, and the list ends.

::: compare

```carve
- x
- - -
```

```html
<ul>
  <li>x</li>
</ul>
<hr>
```

:::

Under another bullet it opens no sibling list.

::: compare

```carve
- x
* * *
```

```html
<ul>
  <li>x</li>
</ul>
<hr>
```

:::

A longer run is the same break.

::: compare

```carve
- x
* * * *
```

```html
<ul>
  <li>x</li>
</ul>
<hr>
```

:::

A blank line changes nothing.

::: compare

```carve
- x

- - -
```

```html
<ul>
  <li>x</li>
</ul>
<hr>
```

:::

Inside an item the break belongs to the item.

::: compare

```carve
- - x
  - - -
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
    <hr>
  </li>
</ul>
```

:::

Below a description note it ends the description, as `***` does.

::: compare

```carve
:: t
: ::: note
  para
* * *
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <aside class="admonition note" aria-label="Note">
      <p>para</p>
    </aside>
  </dd>
</dl>
<hr>
```

:::

A marker with text after it stays an item.

::: compare

```carve
- x
- - y
```

```html
<ul>
  <li>x</li>
  <li>
    <ul>
      <li>y</li>
    </ul>
  </li>
</ul>
```

:::
