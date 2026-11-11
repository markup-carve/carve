---
page: edge-attributes
---

## A column after an astral character is one code point

A column is counted in code points, never in UTF-16 units or bytes (CARVE-P7-001 item 1). A glued block's continuation passes its opening `{` when it stands one column right of it, whatever characters an earlier block holds (carve#5984). A tab in a line block after such a character advances to the next stop from the same count.

::: compare

```carve
{title="😀"}{.b
            .c}
p
```

```html
<p title="😀" class="b c">p</p>
```

:::

::: compare

```carve
> {.a}{title="𝒜𝒜"}{.b
>                   .c}
> p
```

```html
<blockquote><p class="a b c" title="𝒜𝒜">p</p></blockquote>
```

:::

::: compare

```carve
{title="😀"}{.b
           .c}
p
```

```html
<p>{title=“😀”}{.b
.c}
p</p>
```

:::

:::: compare

```carve
::: |
😀	x
:::
```

```html
<div class="line-block">
  <p>😀&nbsp;&nbsp;&nbsp;x</p>
</div>
```

::::
