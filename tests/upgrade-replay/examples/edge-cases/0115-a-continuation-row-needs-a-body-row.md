## A continuation row needs a body row

A `+` continuation row joins the row ABOVE IT IN THE SOURCE, and a delimiter
row is consumed: it produces no `<tr>` and is not a row of the table. So a `+`
line directly under one has no row to join and stays an ordinary paragraph.

The reason is the delimiter row and not the missing body row. A header row on
its own IS joinable - see *A continuation row joins the row above it, whatever
its cells hold* below - so "no body row yet" would answer that document wrongly
(markup-carve/carve#1354).

::: compare

```carve
| a | b |
| - | - |
+ cont |
```

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
  </thead>
</table>
<p>+ cont |</p>
```

:::
