## Adjacent block openers in an attached run stay separate

Two adjacent blocks can each be valid at a list item's content column and still
be invalid as a sequence there. Adjacent quote lines become one quote, so the
canonical writer keeps the continuation marker on both attached quotes.

::: compare

```carve
- x
+
> q
+
> q
```

```html
<ul>
  <li>x
    <blockquote><p>q</p></blockquote>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

Tables have the same sequence rule. Without the second boundary, the next
header row becomes part of the first table's body.

::: compare

```carve
- x
+
| a |
|---|
| b |
+
| a |
|---|
| b |
```

```html
<ul>
  <li>x
    <table>
      <thead>
        <tr><th scope="col">a</th></tr>
      </thead>
      <tbody>
        <tr><td>b</td></tr>
      </tbody>
    </table>
    <table>
      <thead>
        <tr><th scope="col">a</th></tr>
      </thead>
      <tbody>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::
