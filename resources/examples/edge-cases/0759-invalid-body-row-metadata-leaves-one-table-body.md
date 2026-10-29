## Invalid body row metadata leaves one table body

:::: compare

```carve
{body-rows=x}
|= A |
```

```html
<table body-rows="x">
  <tbody>
    <tr><th scope="row">A</th></tr>
  </tbody>
</table>
```

::::
