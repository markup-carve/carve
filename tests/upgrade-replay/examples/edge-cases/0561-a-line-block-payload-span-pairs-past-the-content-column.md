## A line-block payload span pairs past the content column


Since markup-carve/carve#4860 a list marker opens a list in a list item, description body or footnote body and closes a body it misses, so the rows below that show a marker in such a body read that way.

Two fence-shaped runs written past the content column in a line-block payload.
The payload is inline content, so the runs pair as one span and the colon run
between them is payload, exactly as at the content column (ruled on
markup-carve/carve-php#3137). The line block closes at the second `:::`, and
the lines after it read as they do in the content-column spelling: `:::bad` is
text and the bare `:::` opens a div (carve#4863).

::::: compare

````carve
> - ::: |
>     ```
>   :::
>     ```
>   :::
>   :::bad
>   :::
- tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="line-block">
        <p>&nbsp;&nbsp;<code>
:::
&nbsp;&nbsp;</code></p>
      </div>
      :::bad
      <div>

      </div>
    </li>
  </ul>
</blockquote>
<ul>
  <li>tail</li>
</ul>
```

````carve
- ::: |
    ```
  :::
    ```
  :::
  para
tail
````

```html
<ul>
  <li>
    <div class="line-block">
      <p>&nbsp;&nbsp;<code>
:::
&nbsp;&nbsp;</code></p>
    </div>
    para
tail
  </li>
</ul>
```

:::::

The control. A lone run pairs with nothing, so the first `:::` closes the line
block.

::::: compare

````carve
- ::: |
    ```
  :::
  para
tail
````

```html
<ul>
  <li>
    <div class="line-block">
      <p>&nbsp;&nbsp;<code></code></p>
    </div>
    para
tail
  </li>
</ul>
```

:::::
