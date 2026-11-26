## Non-row pipe keeps lazy plus in a nested item

The nested item's open paragraph also owns the flush-left plus line.

::: compare

```carve
- a
  - b
  | x | y | Ω
+ c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
| x | y | Ω
+ c</li>
    </ul>
  </li>
</ul>
```

:::
