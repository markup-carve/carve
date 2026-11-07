---
page: edge-lists
---

## An ended definition list releases its marker boundary

### A paragraph ends an unquoted term-only list (carve#5368)

::: compare

```carve
- a
  :: t
  x
: d
```

```html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
    </dl>
    x
: d
  </li>
</ul>
```

:::

### A paragraph ends a quoted term-only list (carve#5368)

::: compare

```carve
- a
  > +
  :: t
  x
: d
```

```html
<ul>
  <li>a
    <blockquote>
      <dl>
        <dt>t</dt>
      </dl>
    </blockquote>
    x
: d
  </li>
</ul>
```

:::

### A released description-shaped paragraph stays a paragraph (carve#5373)

::: compare

```carve
- a
  :: m
  : d

  p

  : x
: l
```

```html
<ul>
  <li><p>a</p>
    <dl>
      <dt>m</dt>
      <dd>d</dd>
    </dl>
    <p>p</p>
    <p>: x</p>
  </li>
</ul>
<p>: l</p>
```

:::

### A child list ends a term-only list (carve#5373)

::: compare

```carve
- a
  :: t

  - n
  - n

  : u
: z
```

```html
<ul>
  <li><p>a</p>
    <dl>
      <dt>t</dt>
    </dl>
    <ul>
      <li>n</li>
      <li>n</li>
    </ul>
    <p>: u
: z</p>
  </li>
</ul>
```

:::

### A sublist takes the deepest lazy paragraph (carve#5379)

::: compare

```carve
- a
  :: m
  - i
: l
```

```html
<ul>
  <li>a
    <dl>
      <dt>m</dt>
    </dl>
    <ul>
      <li>i
: l</li>
    </ul>
  </li>
</ul>
```

:::

### A quote ends a term-only list (carve#5365)

::: compare

```carve
- a
  :: t
  > q

  w
: z
```

```html
<ul>
  <li><p>a</p>
    <dl>
      <dt>t</dt>
    </dl>
    <blockquote><p>q</p></blockquote>
    <p>w
: z</p>
  </li>
</ul>
```

:::

### A quote with definitions releases its later paragraph (carve#5365)

::: compare

```carve
- a
  > +
  :: t
    : d

    q
: d
```

```html
<ul>
  <li><p>a</p>
    <blockquote>
      <dl>
        <dt>t</dt>
        <dd>d</dd>
      </dl>
    </blockquote>
    <p>q
: d</p>
  </li>
</ul>
```

:::
