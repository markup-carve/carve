## A mention or tag keeps its full spelling in a strong child

The inert carrier holds one strong child containing the sigil and the name.
The same child structure applies inside other inline content.

::: compare

```carve
@ann #tag
```

```html
<p><span class="mention"><strong>@ann</strong></span> <span class="tag"><strong>#tag</strong></span></p>
```

:::

::: compare

```carve
*hi @ann* and [#tag]{.x}
```

```html
<p><strong>hi <span class="mention"><strong>@ann</strong></span></strong> and <span class="x"><span class="tag"><strong>#tag</strong></span></span></p>
```

:::
