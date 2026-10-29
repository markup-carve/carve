## A block glued to a split combined token or a forced span's own delimiter

A combined `/*` that cannot open is read as its two delimiters, so a block after its `*` attaches to the span that `*` closes (PART 4), even when the block holds the `*/` the token would have ended at. Inside a forced span the span's own delimiter is literal (PART 9 SS22), so a block after it attaches to nothing, is text, and cannot hide the span's closer.

::: compare

```carve
b *//*{c_}*/
```

```html
<p>b <strong c_="">//</strong>*/</p>
```

:::

::: compare

```carve
//*a*{c_}*/
```

```html
<p>//<strong c_="">a</strong>*/</p>
```

:::

::: compare

```carve
b *///*{t="*/"}
```

```html
<p>b <strong t="*/">///</strong></p>
```

:::

::: compare

```carve
{*x *b*{t=a*}
```

```html
<p><strong>x *b*{t=a</strong></p>
```

:::

::: compare

```carve
{_x _b_{t=a_}
```

```html
<p><u>x _b_{t=a</u></p>
```

:::
