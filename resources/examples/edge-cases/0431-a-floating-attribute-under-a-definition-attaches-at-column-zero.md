## A floating attribute under a definition attaches at column zero

Column 0 is not below a column - it is the surrounding document's own opener
column, which is where a definition is collected and where a floating attribute
block lives (§10 I5). So the description ends and the attribute floats forward
at document level onto the next visible block, exactly as it does under a list
item or a block quote.

::: compare

```carve
:: t
:  d
{.k}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p class="k">tail</p>
```

:::

A blank line above the attribute is not what makes pending metadata exist (§15
A2 FLOAT FORWARD says pending SURVIVES a blank line). The two spellings agree.

::: compare

```carve
:: t
:  d

{.k}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p class="k">tail</p>
```

:::

The list-item host is the control, and it answers the same. Both rows are here
because it was their disagreement that was the defect, and one row cannot record
a disagreement.

::: compare

```carve
- d
{.k}
tail
```

```html
<ul>
  <li>d</li>
</ul>
<p class="k">tail</p>
```

:::

A definition at the same column is the other half of the same band: it ends the
description too, and being at the document's opener column it REGISTERS, so the
reference below it resolves.

::: compare

```carve
:: t
:  d
[r]: /u

See [text][r].
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>See <a href="/u">text</a>.</p>
```

:::
