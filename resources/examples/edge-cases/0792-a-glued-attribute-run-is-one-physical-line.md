## A glued attribute run is one physical line

Two glued blocks on a line of their own are one attribute line (PART 4 `block_attributes`). Only a lone block may wrap across lines (PART 9 §15 A5, carve#4078): a line break inside or after any block of a longer run leaves the lines paragraph text, so no source disappears.

::: compare

```carve
{.a}{.b}
p
```

```html
<p class="a b">p</p>
```

:::

::: compare

```carve
{.a}{.b
}
p
```

```html
<p>{.a}{.b
}
p</p>
```

:::

::: compare

```carve
{.a
}{.b}
p
```

```html
<p>{.a
}{.b}
p</p>
```

:::

::: compare

```carve
{k=""}{c
}
```

```html
<p>{k=““}{c
}</p>
```

:::

::: compare

```carve
{.a
}
p
```

```html
<p class="a">p</p>
```

:::
