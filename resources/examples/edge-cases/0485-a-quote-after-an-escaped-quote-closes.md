## A quote after an escaped quote closes

A smart quote takes its side from the character before it (PART 3). An escaped
quote renders as the straight character, which is not an opening context, so
the quote after it closes, whichever quote came before the escape
(markup-carve/carve#2158).

::: compare

```carve
"a\""

"\""
```

```html
<p>“a"”</p>
<p>“"”</p>
```

:::

The same for the single quote.

::: compare

```carve
'a\''
```

```html
<p>‘a'’</p>
```

:::

The escape and the quote after it need not be the same character.

::: compare

```carve
"a\''

'a\""
```

```html
<p>“a'’</p>
<p>‘a"”</p>
```

:::

An apostrophe after an escaped quote inside a quotation closes too.

::: compare

```carve
"\"'q'"
```

```html
<p>“"’q’”</p>
```

:::

CONTROL. After an unescaped opening quote a quote opens, so quotations nest.

::: compare

```carve
"'q'"
```

```html
<p>“‘q’”</p>
```

:::
