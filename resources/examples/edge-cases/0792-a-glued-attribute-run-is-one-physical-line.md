## A glued attribute run is one physical line

The section name is append-only and predates the superseding ruling on carve#4078. Two glued blocks on a line of their own are one attribute line (PART 4 `block_attributes`). Each block of the run wraps by a lone block's rule (PART 9 §15 A5, carve#4078), and a run that attaches to nothing renders nothing, like a lone block.

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
<p class="a b">p</p>
```

:::

::: compare

```carve
{.a
}{.b}
p
```

```html
<p class="a b">p</p>
```

:::

::: compare no-final-newline

```carve
{k=""}{c
}
```

```html

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
