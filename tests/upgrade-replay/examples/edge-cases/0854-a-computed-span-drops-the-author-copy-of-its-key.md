---
page: edge-tables
---

## A computed span drops the author copy of its key

PART 5: a computed rowspan or colspan is authoritative (carve#4456).

:::: compare

````carve
|={colspan=3} a | < | b |
| c | d | e |
````

```html
<table>
  <tbody>
    <tr><th scope="row" colspan="2">a</th><td>b</td></tr>
    <tr><td>c</td><td>d</td><td>e</td></tr>
  </tbody>
</table>
```

::::
