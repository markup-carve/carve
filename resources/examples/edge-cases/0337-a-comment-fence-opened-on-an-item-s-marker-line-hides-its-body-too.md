## A comment fence opened on an item's marker line hides its body too

The fence may open on the marker line itself. `- %%%` is a bullet whose content begins with a comment fence, the closer sits at the content column, and the item is empty of everything between them. This is the spelling a container-aware reader is most likely to miss, because the fence's own line carries the marker rather than the indentation.

::: compare

```carve
- %%%
  [r]: /url
  %%%

[r][]
```

```html
<ul>
  <li></li>
</ul>
<p>[r][]</p>
```

:::
