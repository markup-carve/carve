## A line below a list item folds into the open paragraph of a div or an absorbed colon run

PART 0 S4 asks the same lazy question at every depth: a line that misses a nested item folds into the open paragraph inside its div, a line block's included (CARVE-P0-015). An invalid opener keeps the bare colon run after it as paragraph text, written past the content column or not (PART 0 S3, CARVE-P9-016), so the paragraph stays open for the line below.

::::: compare

```carve
- a
  - b
    ::: e
    x
y
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <div class="e">
          <p>x
y</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

:::::

::::: compare

```carve
- m
   :::e
  :::
l
```

```html
<ul>
  <li>m
:::e
:::
l</li>
</ul>
```

:::::

::::: compare

```carve
> - x
>    :::d
>   :::
- tail
```

```html
<blockquote>
  <ul>
    <li>x
:::d
:::
- tail</li>
  </ul>
</blockquote>
```

:::::

::::: compare

```carve
- a
  - m
    :::e
    :::
l
```

```html
<ul>
  <li>a
    <ul>
      <li>m
:::e
:::
l</li>
    </ul>
  </li>
</ul>
```

:::::
