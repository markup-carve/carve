## Glued attribute blocks on an inline element merge

An inline element takes a run of attribute blocks glued one after another, and
the run attaches as one list. The blocks merge the way stacked block-attribute
lines do (§15 A3), so classes accumulate.

::: compare

```carve
*x*{.k}{.j}
```

```html
<p><strong class="k j">x</strong></p>
```

:::

The same merge on any inline element: an id or a key keeps its last value, a
repeated class appears once, and each attribute stays where it first appeared.

::: compare

```carve
`c`{#a .k}{#b k=1}{.k k=2}
```

```html
<p><code id="b" class="k" k="2">c</code></p>
```

:::

A run ends at the first thing that is not an attribute block: a space, a brace
group that is not a valid block, or a glued construct, which stays content.

::: compare

```carve
*a*{.k} {.j}

*b*{.k}{???}

*c*{.k}{*d*}
```

```html
<p><strong class="k">a</strong> {.j}</p>
<p><strong class="k">b</strong>{???}</p>
<p><strong class="k">c</strong><strong>d</strong></p>
```

:::
