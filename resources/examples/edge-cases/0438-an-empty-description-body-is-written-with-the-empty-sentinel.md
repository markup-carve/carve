## An empty description body is written with the empty sentinel

PART 11 §7d (markup-carve/carve#1827) pins the canonical spelling for a
`definition_description` that holds no blocks: the marker, its separator space,
and the sentinel attribute block `{empty}`. §7b already spells an empty footnote
definition body the same way, and this is the same shape one construct over.

The sentinel is an attribute block, so PART 9 §15 A4 drops it - a block-attribute
line with no following block inside its own container reaches nothing - and the
description is left empty. It claims NO line below it at any column, which is
what separates it from the accepted wider-separator `:  +`: the first-block marker attaches a following
flush-left block, so it spells an empty body only when a blank line follows.

::: compare

```carve
:: t
: {empty}

flush
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>flush</p>
```

:::

At end of input, where there is no following block at all.

::: compare

```carve
:: t
: {empty}
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
```

:::

The line below it is not claimed even at column 0, which is the whole reason the
sentinel needs no blank line after it. The same document spelled with the
accepted wider-separator `:  +` puts
`flush` inside the `dd`.

::: compare

```carve
:: t
: {empty}
flush
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>flush</p>
```

:::

An entry AFTER the empty one. The empty description is spelled where it stands,
so this is ONE list and the second term keeps its own description rather than
the first term inheriting it (markup-carve/carve#1636).

::: compare

```carve
:: t1
: {empty}
:: t2
: d2
```

```html
<dl>
  <dt>t1</dt>
  <dd></dd>
  <dt>t2</dt>
  <dd>d2</dd>
</dl>
```

:::

Two empty descriptions in a row, so neither reads as a term sharing the other's
body.

::: compare

```carve
:: t1
: {empty}
:: t2
: {empty}
```

```html
<dl>
  <dt>t1</dt>
  <dd></dd>
  <dt>t2</dt>
  <dd></dd>
</dl>
```

:::
