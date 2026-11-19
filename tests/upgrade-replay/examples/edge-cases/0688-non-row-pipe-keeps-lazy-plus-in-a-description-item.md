## Non-row pipe keeps lazy plus in a description item

A pipe line with text after its closing pipe stays paragraph text, so a flush-left plus line continues that item.

::: compare

```carve
:: term
: - a
    | x | y | Ω
+ c
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <ul>
      <li>a
| x | y | Ω
+ c</li>
    </ul>
  </dd>
</dl>
```

:::
