## A comment fence one item deeper registers nothing either

Nothing in §24 S2 counts containers, so a second level of nesting is not a second rule. The fence sits at the inner item's content column and hides its body exactly as it does at the outer one.

::: compare

```carve
- a
  - b
    %%%
    [r]: /url
    %%%

[r][]
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
<p>[r][]</p>
```

:::
