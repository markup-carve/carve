---
page: edge-lists
---

## Block reading uses only Carve whitespace

Whitespace is exactly U+0020, U+0009, U+000A and U+000D, and every other character is content (PART 11 `whitespace`). A U+2028, U+2029, U+000B, U+000C or U+00A0 on a block line therefore changes nothing about how the line is read: it does not end a marker's content, it is not blank, and no trim removes it (carve#4252).

:::: compare

```carve
- a 
```

```html
<ul>
  <li>a </li>
</ul>
```

::::

:::: compare

```carve
# 
```

```html
<section id="s">
  <h1></h1>
</section>
```

::::

:::: compare

```carve
- +
> q
```

```html
<ul>
  <li>+</li>
</ul>
<blockquote><p>q</p></blockquote>
```

::::

:::: compare

```carve
:: term
:  the definition
```

```html
<dl>
  <dt>term</dt>
  <dd> the definition</dd>
</dl>
```

::::

:::: compare

```carve
- [ ] outer 
  - inner
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="outer "> outer 
    <ul>
      <li>inner</li>
    </ul>
  </li>
</ul>
```

::::
