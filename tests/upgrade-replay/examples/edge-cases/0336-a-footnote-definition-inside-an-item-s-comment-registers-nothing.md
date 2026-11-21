## A footnote definition inside an item's comment registers nothing

The footnote collector is a separate pass from the link-reference one in every implementation, so it is a separate place to drift and needs its own document. The rule is the same rule, and the symptom is worse: a collected footnote definition does not merely resolve a reference, it emits an endnotes section the author commented out.

::: compare

```carve
- item
  %%%
  [^f]: note body
  %%%

text[^f]
```

```html
<ul>
  <li>item</li>
</ul>
<p>text[^f]</p>
```

:::
