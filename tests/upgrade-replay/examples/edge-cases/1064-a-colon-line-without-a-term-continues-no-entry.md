---
page: edge-definitions
---

## A colon line without a term continues no entry

A `: ` line is a description only while its definition list has an open term or body. A `: ` line with no term above it, or under an entry a deeper line has ended, is paragraph text, so a later `: %%%` is text with an inline comment and opens no span (PART 0 S3, carve#5841).

::: compare

```carve
- a
  : 

  : %%%
%%%
c
```

```html
<ul>
  <li><p>a
:</p>
    <p>:</p>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  : x

  : %%%
%%%
c
```

```html
<ul>
  <li><p>a
: x</p>
    <p>:</p>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  :: t
    deep
  : d

  : %%%
%%%
c
```

```html
<ul>
  <li><p>a</p>
    <dl>
      <dt>t</dt>
    </dl>
    <p>deep
: d</p>
    <p>:</p>
  </li>
</ul>
```

:::
