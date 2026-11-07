---
page: edge-lists
---

## An unclosed attached colon ends at its first blank

### The item takes the line after the note (carve#5359)

::::: compare

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

:::::

### A nested item takes the block after the note (carve#5359)

::::: compare

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
        <ul>
          <li>q</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::::

### A blank inside an attached note loosens ordered siblings (carve#5356)

::::: compare

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

:::::

### A closer in the host keeps an attached line block open past its blank (carve#5405)

::::: compare

```carve
- +
::: |

  ::: x
  :::
```

```html
<ul>
  <li>
    <div class="line-block">
      <p>::: x</p>
    </div>
  </li>
</ul>
```

:::::

### A closer in the host keeps an attached div open past its blank (carve#5405)

::::: compare

```carve
- +
::: x

  a
  :::
```

```html
<ul>
  <li>
    <div class="x">
      <p>a</p>
    </div>
  </li>
</ul>
```

:::::
