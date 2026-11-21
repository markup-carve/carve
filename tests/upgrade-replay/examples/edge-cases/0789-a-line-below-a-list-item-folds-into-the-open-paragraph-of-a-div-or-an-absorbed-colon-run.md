## A line below a list item folds into the open paragraph of a div or an absorbed colon run

PART 0 S4 asks the same lazy question at every depth: a line that misses a nested item folds into the open paragraph inside its div, a line block's included (CARVE-P0-015). A bare colon run after an invalid opener opens a div, so no paragraph is left for the line below (carve#4863).

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
    <div>

    </div>
  </li>
</ul>
<p>l</p>
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
      <div>

      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
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
        <div>

        </div>
      </li>
    </ul>
  </li>
</ul>
<p>l</p>
```

:::::
