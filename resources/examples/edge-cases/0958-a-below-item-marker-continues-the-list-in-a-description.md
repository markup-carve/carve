## A below-item marker continues the list in a description

In a description body, a marker after a blank line at the residual column of the first item is a sibling item of the same list. The blank makes the list loose.

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
