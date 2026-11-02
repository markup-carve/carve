---
page: edge-lists
---

## A refused plus is escaped when the block below would attach

CARVE-P11-042 and CARVE-P9-085 (carve#4868). The blank refuses the `+` in each source, so the inner item holds the letter and the block belongs to the outer item. The `.fmt` beside each row spells the letter `\+` and writes the block at the outer item's content column with no blank line.

:::::: compare

`````carve
- - +

  > q
`````

```html
<ul>
  <li>
    <ul>
      <li>+</li>
    </ul>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

::::::

:::::: compare

`````carve
- - +

  ```
  x
  ```
`````

```html
<ul>
  <li>
    <ul>
      <li>+</li>
    </ul>
    <pre><code>x
</code></pre>
  </li>
</ul>
```

::::::

:::::: compare

`````carve
- - +

  # H
`````

```html
<ul>
  <li>
    <ul>
      <li>+</li>
    </ul>
    <h1 id="H">H</h1>
  </li>
</ul>
```

::::::

:::::: compare

`````carve
- - +

  {.c}
  > q
`````

```html
<ul>
  <li>
    <ul>
      <li>+</li>
    </ul>
    <blockquote class="c"><p>q</p></blockquote>
  </li>
</ul>
```

::::::

:::::: compare

`````carve
- foo
  1. +
   > b
`````

```html
<ul>
  <li>foo
    <ol>
      <li>+</li>
    </ol>
    <blockquote><p>b</p></blockquote>
  </li>
</ul>
```

::::::
