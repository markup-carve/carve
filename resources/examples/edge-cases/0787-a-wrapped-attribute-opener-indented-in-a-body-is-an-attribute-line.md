## A wrapped attribute opener indented in a body is an attribute line

A wrapped `{` ... `}` attribute whose opening line is indented in its owner, past a list item's or description's content column or below it, is an attribute line like the one-line form (PART 9 §15 A5, ruled on carve#4089). Its `}` line belongs to it at any column, and the line after it is not lazy. With nothing to attach to in the owner, the attribute is dropped (A4); the line after it is a document paragraph.

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
  <dd>d</dd>
</dl>
<p>a</p>
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
  <dd>d</dd>
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
  <li>d</li>
</ul>
<p>para</p>
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
  <li>a</li>
</ul>
<p>}</p>
```

:::
