---
page: edge-definitions
---

## A description at a pulled block's column ends it below an indented plus

A first-block `: +` written past its term pulls a block at column zero (CARVE-P9-067), and a `: ` line at that same column is the next description, as it is below a `: +` at column zero (carve#4407).

:::: compare

```carve
:: t
 : +
l
: b
```

```html
<dl>
  <dt>t</dt>
  <dd>l</dd>
  <dd>b</dd>
</dl>
```

::::

:::: compare

```carve
:: t
 : +
> q
: b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>q</p></blockquote>
  </dd>
  <dd>b</dd>
</dl>
```

::::

:::: compare

```carve
:: t
  :  +
l
: b
```

```html
<dl>
  <dt>t</dt>
  <dd>l</dd>
  <dd>b</dd>
</dl>
```

::::

:::: compare

```carve
- x

  :: t
   : +
  l
  : b
```

```html
<ul>
  <li>x
    <dl>
      <dt>t</dt>
      <dd>l</dd>
      <dd>b</dd>
    </dl>
  </li>
</ul>
```

::::

:::: compare

```carve
> :: t
>  : +
> l
> : b
```

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>l</dd>
    <dd>b</dd>
  </dl>
</blockquote>
```

::::

:::: compare

```carve
:: t
 : +
l
: b
  p
```

```html
<dl>
  <dt>t</dt>
  <dd>l</dd>
  <dd>b
p</dd>
</dl>
```

::::
