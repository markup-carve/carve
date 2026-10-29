## A marker attribute may hold a quoted brace

A list marker's attribute block is glued to the marker (`1.{…}`), and a quoted value inside it may contain `}` - the quote ends the value, not the first brace that comes along.

::: compare

```carve
1.{title='a}b'} item
```

```html
<ol>
  <li title="a}b">item</li>
</ol>
```

:::
