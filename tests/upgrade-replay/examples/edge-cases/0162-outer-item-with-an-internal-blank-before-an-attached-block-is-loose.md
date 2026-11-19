## Outer item with an internal blank before an attached block is loose

An over-indented recognized block after a nested list remains an attached block.
Its authored quote column is temporary; it does not turn the quote into a
paragraph. The blank before it stands between two of the outer item's blocks,
so the outer item is loose (PART 9 §17 L1).

::: compare

```carve
- a
  - b

   > q
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::
