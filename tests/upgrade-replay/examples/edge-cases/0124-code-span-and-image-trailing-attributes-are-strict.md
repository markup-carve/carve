## Code span and image trailing attributes are strict

A trailing `{...}` on a code span or an image obeys the same attribute rule as
any other inline attribute (PART 9 §14): digit-leading ids/classes are valid,
while a digit-leading key or otherwise invalid payload stays literal.

::: compare

```carve
`x`{2=v}
```

```html
<p><code>x</code>{2=v}</p>
```

:::
