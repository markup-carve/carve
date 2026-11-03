## A wrapped attribute opener indented in a body is an attribute line

A wrapped `{` ... `}` attribute can open at any column in its owner, but its continuation must pass that opening column (CARVE-P2-035). The historical examples below close at column 0, so the whole run is paragraph text. The one-line form and a deeper closer remain attribute lines under PART 9 §15 A5.

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
