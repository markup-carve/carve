## A comment inside a split combined token is removed before pairing

A `%%` comment inside a `/*` ... `*/` shape ends at the shape's closer token, and the delimiter stack reads the region as if the comment were absent (PART 9 SS9 P1, SS21a, carve#4042). With a bare `/` or `*` open, the combined token does not form, and each row renders exactly like the same line with the comment deleted.

::: compare

```carve
/x /*a %% b*/ y
```

```html
<p><em>x /<strong>a</strong></em> y</p>
```

:::

::: compare

```carve
*x /*a %% b*/ y*
```

```html
<p><strong>x /*a</strong>/ y*</p>
```

:::

::: compare

```carve
p /q /*a b %% c d*/ e
```

```html
<p>p <em>q /<strong>a b</strong></em> e</p>
```

:::

::: compare

```carve
/x /*a %% b*/{.c} y
```

```html
<p><em class="c">x /<strong>a</strong></em> y</p>
```

:::

::: compare

```carve
/x
/*a %% b*/ y
```

```html
<p><em>x
/<strong>a</strong></em> y</p>
```

:::

::: compare

```carve
- /x /*a %% b*/ y
```

```html
<ul>
  <li><em>x /<strong>a</strong></em> y</li>
</ul>
```

:::

::: compare

```carve
/x /*a %% `b*/ c` d
```

```html
<p><em>x /<strong>a</strong></em> c<code> d</code></p>
```

:::

::: compare

```carve
> /x /*a
> b %% c*/ y
```

```html
<blockquote><p><em>x /<strong>a
b</strong></em> y</p></blockquote>
```

:::
