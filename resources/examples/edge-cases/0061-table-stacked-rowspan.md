## Table stacked rowspan

Consecutive `^` cells extend the same origin cell; two stacked `^`
markers produce `rowspan="3"`.

::: compare

```carve
|= Tier |= User |
| Gold   | Ann  |
| ^      | Bo   |
| ^      | Cy   |
```

```html
<table>
  <thead>
    <tr><th scope="col">Tier</th><th scope="col">User</th></tr>
  </thead>
  <tbody>
    <tr><td rowspan="3">Gold</td><td>Ann</td></tr>
    <tr><td>Bo</td></tr>
    <tr><td>Cy</td></tr>
  </tbody>
</table>
```

:::
