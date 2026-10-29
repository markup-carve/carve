## A wrapped attribute opener indented in a body is paragraph text

A wrapped `{` ... `}` attribute whose opening line is indented in its owner, past a list item's or description's content column or below it, is paragraph text, as the same lines are at document level. Its `}` line and a following line below the column fold into that paragraph lazily (PART 0 S4, PART 9 §15 A5, carve#4081). Nothing is dropped (carve#3421).

::: compare

```carve
:: t
: d
   {c
}
a
```

```html
<dl>
  <dt>t</dt>
  <dd>d
{c
}
a</dd>
</dl>
```

:::

::: compare

```carve
:: t
: d
 {c
}
```

```html
<dl>
  <dt>t</dt>
  <dd>d
{c
}</dd>
</dl>
```

:::

::: compare

```carve
- d
   {.c
}
para
```

```html
<ul>
  <li>d
{.c
}
para</li>
</ul>
```

:::

::: compare

```carve
- a
   {.c
}
}
```

```html
<ul>
  <li>a
{.c
}
}</li>
</ul>
```

:::
