## Nested term after a list in a description

A term at the description's content column starts a nested definition list after the list item.

::: compare

```carve
:: term
: - a
   :: sub
: def
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
    <dl>
      <dt>sub</dt>
    </dl>
  </dd>
  <dd>def</dd>
</dl>
```

:::
