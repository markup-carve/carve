---
page: edge-definitions
---

## A column-zero description is a sibling after an indented description's refused plus

A first-block `: +` written past its term refuses a block at column zero and reads as a letter (carve#4409), and a `: ` line at that column is still the next description (carve#4408).

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
  <dd></dd>
</dl>
<p>l
: b</p>
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
  <dd></dd>
</dl>
<blockquote><p>q
: b</p></blockquote>
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
  <dd></dd>
</dl>
<p>l
: b</p>
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
  <li><p>x</p>
    <dl>
      <dt>t</dt>
      <dd></dd>
    </dl>
    <p>l
: b</p>
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
    <dd></dd>
  </dl>
  <p>l
: b</p>
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
  <dd></dd>
</dl>
<p>l
: b
p</p>
```

::::
