## A comment fence under a nested item does not close it either

The fence form behaves as the `%%` line does: it is invisible, it leaves the item open, and the line after it folds into the inner item exactly as it would with no comment between.

::: compare

```carve
- - a
 %%% c
 x
 %%%
 b
```

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
</ul>
<p>b</p>
```

:::
