## A wrapped attribute line leaves no paragraph open

A wrapped block-attribute line is one interrupter only when every continuation
passes its opening column. The examples below retain closers or continuations
at that column, so the brace runs are paragraph text under CARVE-P2-035. The
one-line spelling remains the control.

::: compare

```carve
- {.a
  .b}
tail
```

```html
<ul>
  <li>{.a
.b}
tail</li>
</ul>
```

:::

After visible item prose the refused run joins that prose; it supplies no
floating attributes.

::: compare

```carve
- prose
  {.a
  .b}
tail
```

```html
<ul>
  <li>prose
{.a
.b}
tail</li>
</ul>
```

:::

The one-line spelling is the control.

::: compare

```carve
- {.a}
tail
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
```

:::
