## The empty block is a member of a bracketed span's attribute run

The blessed empty block `{}` (or `{ }`) is an ordinary member of a bracketed span's glued run and contributes no attribute, in any position (PART 9 §14 CARVE-P9-021, carve#4077). Emphasis and code spans still take no empty block.

::: compare

```carve
[a]{}{.b}
```

```html
<p><span class="b">a</span></p>
```

:::

::: compare

```carve
[a]{}{}{.b}
```

```html
<p><span class="b">a</span></p>
```

:::

::: compare

```carve
[a]{.b}{}
```

```html
<p><span class="b">a</span></p>
```

:::

::: compare

```carve
[a]{ }{.b}
```

```html
<p><span class="b">a</span></p>
```

:::

::: compare

```carve
[a]{.b}{}{#i}
```

```html
<p><span class="b" id="i">a</span></p>
```

:::

::: compare

```carve
[a]{}
```

```html
<p><span>a</span></p>
```

:::

::: compare

```carve
*x*{}{.b}
```

```html
<p><strong>x</strong>{}{.b}</p>
```

:::
