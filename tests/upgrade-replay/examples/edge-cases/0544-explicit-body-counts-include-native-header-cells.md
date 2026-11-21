## Explicit body counts include native header cells

:::: compare

```carve
{body-rows=2}
|= A |= B |
| c | d |
```

```html
<table>
  <tbody>
    <tr><th scope="row">A</th><th scope="row">B</th></tr>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

::::
