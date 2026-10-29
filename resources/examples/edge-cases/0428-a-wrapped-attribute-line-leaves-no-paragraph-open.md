## A wrapped attribute line leaves no paragraph open

A block-attribute line is one interrupter even when its braces span physical
lines. Its continuation is not paragraph text and cannot keep a list item open
for a later below-column lazy line. The result is identical to the one-line
attribute spelling.

::: compare

```carve
- {.a
  .b}
tail
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
```

:::

The same rule applies after visible item prose. The floating attributes remain
scoped to the item and become dangling when the item closes; they do not escape
onto the top-level paragraph.

::: compare

```carve
- prose
  {.a
  .b}
tail
```

```html
<ul>
  <li>prose</li>
</ul>
<p>tail</p>
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
