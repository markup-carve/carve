## Outer item with an internal blank before an attached block is loose

An over-indented recognized block after a nested list remains an attached block.
Its authored quote column is temporary; it does not turn the quote into a
paragraph or make the outer item loose.

::: compare

```carve
- a
  - b

   > q
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::
