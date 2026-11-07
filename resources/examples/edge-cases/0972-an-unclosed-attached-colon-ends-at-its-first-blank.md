---
page: edge-lists
---

## An unclosed attached colon ends at its first blank

### The item takes the line after the note (carve#5359)

::: compare

```carve
- +
::: note

  tail
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">

    </aside>
    <p>tail</p>
  </li>
</ul>
```

:::

### A nested item takes the block after the note (carve#5359)

::: compare

```carve
- a
  * +
  ::: note

    - q
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <aside class="admonition note" aria-label="Note">

        </aside>
      </li>
    </ul>
    <ul>
      <li>q</li>
    </ul>
  </li>
</ul>
```

:::

### A blank inside an attached note loosens ordered siblings (carve#5356)

::: compare

```carve
1. a
  1. +
  :::: note

     p
```

```html
<ol>
  <li><p>a</p></li>
  <li>
    <aside class="admonition note" aria-label="Note">

    </aside>
    <p>p</p>
  </li>
</ol>
```

:::
