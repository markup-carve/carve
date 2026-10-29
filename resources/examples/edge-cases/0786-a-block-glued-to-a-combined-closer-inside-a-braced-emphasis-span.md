## A block glued to a combined closer inside a braced emphasis span

Inside `{/` ... `/}` the span's own `/` is literal, but it can still end a combined token's closer `*/` (PART 9 SS9 THE COMBINED TOKEN). A block glued to that closer attaches to the combined span (R3 ATTACH), as it does inside `{*` ... `*}`. Where the token does not form, the block stays text (carve#4072).

::: compare

```carve
{/a /*b*/{.k} c/}
```

```html
<p><em>a <strong class="k"><em>b</em></strong> c</em></p>
```

:::

::: compare

```carve
{/a /*b*/{.k}{#i}/}
```

```html
<p><em>a <strong class="k" id="i"><em>b</em></strong></em></p>
```

:::

::: compare

```carve
*x {/a /*b*/{k="v w"} c/}
```

```html
<p>*x <em>a <strong k="v w"><em>b</em></strong> c</em></p>
```

:::

::: compare

```carve
{*x {/a /*b*/{.k} c/} y*}
```

```html
<p><strong>x <em>a <strong class="k"><em>b</em></strong> c</em> y</strong></p>
```

:::

::: compare

```carve
{/a /*b */{.k} c/}
```

```html
<p><em>a /*b */{.k} c</em></p>
```

:::
