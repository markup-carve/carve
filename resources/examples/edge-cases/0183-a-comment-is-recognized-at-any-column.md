## A comment is recognized at any column

Every other construct below an item's content column folds as text (§24 C3), but a comment is invisible by nature and authors indent one freely, so it is found wherever it sits. Folding it would make `%% c` visible, which is the one outcome a comment may never have. The item stays open, so a following line still belongs to it.

::: compare

```carve
- a
 %% c
b
```

```html
<ul>
  <li>a</li>
</ul>
<p>b</p>
```

:::
