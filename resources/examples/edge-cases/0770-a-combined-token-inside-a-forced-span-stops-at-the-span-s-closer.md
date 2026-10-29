## A combined token inside a forced span stops at the span's closer

A forced span's closer is paired before bare resolution, so a combined `/*` token inside the span cannot take a character of that closer or close past it.

::: compare

```carve
{*a*/*} b*/
```

```html
<p><strong>a*/</strong> b*/</p>
```

:::

::: compare

```carve
{/a /*b/} c*/
```

```html
<p><em>a /*b</em> c*/</p>
```

:::

::: compare

```carve
{_x /*a {_b_} c*/ y_}
```

```html
<p><u>x <strong><em>a <u>b</u> c</em></strong> y</u></p>
```

:::

::: compare

```carve
/*{*a*/*} b*/
```

```html
<p><strong><em><strong>a*/</strong> b</em></strong></p>
```

:::
