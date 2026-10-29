## Escaped table hyphens stay literal

Escaped hyphens in a data cell do not form a typographic dash.

::: compare

```carve
|a|b|
|---|---|
|\-\-\-|x|
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>---</td><td>x</td></tr>
  </tbody>
</table>
```

:::
