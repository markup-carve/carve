## A final tab does not change list ownership in a description

A line-final tab is dropped before the list marker is read. The blank and the residual column put the second marker in a separate tight list.

::: compare

```carve
:: term
: - a

   - c	
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <ul>
      <li><p>a</p></li>
      <li><p>c</p></li>
    </ul>
  </dd>
</dl>
```

:::
