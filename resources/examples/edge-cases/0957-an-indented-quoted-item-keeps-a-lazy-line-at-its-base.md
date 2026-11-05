## An indented quoted item keeps a lazy line at its base

A list item indented one column opens a quote. The next line, at the item's base column, is a lazy continuation of the quote's paragraph.

::: compare

```carve
 - > a
 b
```

```html
<ul>
  <li>
    <blockquote><p>a
b</p></blockquote>
  </li>
</ul>
```

:::
