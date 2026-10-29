## Table as a block opener in a list item

A `|`-delimited table row is a block opener under the same content-column rule: it nests at the content column and folds as lazy text below it.

::: compare

```carve
- one
  |= H |
  | x |
```

```html
<ul>
  <li>one
    <table>
      <thead>
        <tr><th scope="col">H</th></tr>
      </thead>
      <tbody>
        <tr><td>x</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::

::: compare

```carve
- one
 |= H |
 | x |
```

```html
<ul>
  <li>one</li>
</ul>
<table>
  <thead>
    <tr><th scope="col">H</th></tr>
  </thead>
  <tbody>
    <tr><td>x</td></tr>
  </tbody>
</table>
```

:::
