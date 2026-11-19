## A final tab does not change list ownership in a description

A line-final tab is dropped before the list marker is read. In a description body, a marker after a blank line at the residual column of the first item is a sibling item of the same list, and the blank makes that list loose.

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
