## A description marker followed by a no-break space has content

The content test after a description marker ignores a space and a tab and
nothing else (`CARVE-P2-027`). A no-break space after the separator is
content, so the line opens a description that holds it, alone or before text.

::: compare

```carve
:: t
:  x
```

```html
<dl>
  <dt>t</dt>
  <dd>&nbsp;x</dd>
</dl>
```

```carve
:: t
:  
```

```html
<dl>
  <dt>t</dt>
  <dd>&nbsp;</dd>
</dl>
```

:::

The control. A marker followed by spaces only has no content and folds into
the term.

::: compare

```carve
:: t
:   
```

```html
<dl>
  <dt>t
:</dt>
</dl>
```

:::
