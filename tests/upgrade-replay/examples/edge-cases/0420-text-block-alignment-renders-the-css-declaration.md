## Text-block alignment renders the CSS declaration

On a paragraph, div, or heading, the three text-alignment values render the
modern CSS declaration. An existing style is kept in the same attribute.

::: compare

```carve
{align=right}
Aligned text.
```

```html
<p style="text-align: right;">Aligned text.</p>
```

:::

:::: compare

```carve
{align=center}
::: box
Aligned text.
:::
```

```html
<div class="box" style="text-align: center;">
  <p>Aligned text.</p>
</div>
```

::::

::: compare

```carve
{align=right style="color: red"}
Aligned text.
```

```html
<p style="color: red; text-align: right;">Aligned text.</p>
```

:::

The rewrite is deliberately narrow. A table's `align` controls placement, not
cell text, and an unrecognized value remains an ordinary authored attribute.

::: compare

```carve
{align=right}
| a |
```

```html
<table align="right">
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
{align=justify}
Aligned text.
```

```html
<p align="justify">Aligned text.</p>
```

:::
