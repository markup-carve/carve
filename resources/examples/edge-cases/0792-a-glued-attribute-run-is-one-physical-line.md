## A glued attribute run is one physical line

The section name is append-only. Two glued blocks on a line of their own are one attribute line (PART 4 `block_attributes`), but a continuation that fails CARVE-P2-035 refuses its opener and leaves later text to ordinary inline and block rules.

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

::: compare no-final-newline

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
<p>{.a
}
p</p>
```

:::
