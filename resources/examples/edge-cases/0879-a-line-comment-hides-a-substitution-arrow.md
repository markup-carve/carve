## A line comment hides a substitution arrow

The first raw `~}` ends a line comment in a `{~` frame. An arrow in the comment cannot split the frame.

::: compare

```carve
{~a %% b~>c~} d
```

```html
<p>{~a d</p>
```

:::

::: compare

```carve
{~alpha %% hidden~>word~} tail
```

```html
<p>{~alpha tail</p>
```

:::

An arrow before the comment still splits the substitution.

::: compare

```carve
{~a~>b %% c~} d
```

```html
<p><del>a</del><ins>b</ins> d</p>
```

:::

Inline frames start content and literals close quotes.

::: compare

```carve
x{+"q"+}
```

```html
<p>x<ins>“q”</ins></p>
```

:::

::: compare

```carve
2{+--x+}
```

```html
<p>2<ins>--x</ins></p>
```

:::

::: compare

```carve
x:foo["q"]
```

```html
<p>x<span class="ext-foo">“q”</span></p>
```

:::

::: compare

```carve
!`(`"q"
```

```html
<p>(”q”</p>
```

:::

::: compare

```carve
`(`{=html}"q"
```

```html
<p>(”q”</p>
```

:::
