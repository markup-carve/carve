## A marker separator is a space, never a tab

Every marker that takes a separator takes the space character: a tab after the
marker leaves ordinary paragraph text. The definition term is shown because it
was the last construct to agree - carve-js and carve-php read a tab as a term
until carve#532.

::: compare

```carve
::	term
:  d
```

```html
<p>::	term
:  d</p>
```

:::

A space opens the same document as written.

::: compare

```carve
:: term
:  d
```

```html
<dl>
  <dt>term</dt>
  <dd>d</dd>
</dl>
```

:::
