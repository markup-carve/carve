## A comment under a nested item does not close it

A comment renders nothing, so it cannot decide which item the line after it belongs to. Remove the comment and `b` folds into the inner item; with it there, `b` must still fold into the inner item. An invisible construct has no structural effect - §28's `comment_line` makes the indentation part of the construct rather than a column measurement.

::: compare

```carve
- - a
 %% c
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
