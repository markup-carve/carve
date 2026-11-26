## A braced opener whose closers the spans inside it take stays text

A braced opener forms at the first closer of its mark at its level, past the spans that form inside it (PART 9 SS9 LINEAR TIME, carve#3987). When every later `X}` closes an inner span, the outer opener is text and the inner spans still form.

::: compare

```carve
{*a {*b *} {*a {*b *} {*a {*b *}
```

```html
<p>{*a <strong>b </strong> {*a <strong>b </strong> {*a <strong>b </strong></p>
```

:::

::: compare

```carve
{*a {*b *} c *} {*d {*e *}
```

```html
<p><strong>a <strong>b </strong> c </strong> {*d <strong>e </strong></p>
```

:::

::: compare

```carve
> {/a {/b /} {/c {/d /}
```

```html
<blockquote><p>{/a <em>b </em> {/c <em>d </em></p></blockquote>
```

:::

::: compare

```carve
- {_a {_b _} {_c {_d _}
```

```html
<ul>
  <li>{_a <u>b </u> {_c <u>d </u></li>
</ul>
```

:::
