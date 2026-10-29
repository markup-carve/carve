## A table row ends a description body and a lone plus folds into a term

A table row interrupts a paragraph (PART 9 §10 I1), so at column 0 under a
description it ends the body and the list; the table follows the list
(markup-carve/carve#3145):

::: compare

```carve
:: t
: a
| t |
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<table>
  <tbody>
    <tr><td>t</td></tr>
  </tbody>
</table>
```

:::


A term holds no blocks, so a lone `+` under it attaches nothing. It is a plain
line, and a term folds a plain line (CARVE-P2-028):

::: compare

```carve
:: term
+
: d
```

```html
<dl>
  <dt>term
+</dt>
  <dd>d</dd>
</dl>
```

:::


The same after a wrapped term:

::: compare

```carve
:: A term that
   wraps
+
: d
```

```html
<dl>
  <dt>A term that
   wraps
+</dt>
  <dd>d</dd>
</dl>
```

:::
