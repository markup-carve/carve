## A line-block payload span pairs past the content column

Two fence-shaped runs written past the content column in a line-block payload.
The payload is inline content, so the runs pair as one span and the colon run
between them is payload, exactly as at the content column (ruled on
markup-carve/carve-php#3137). The line block closes at the second `:::`, and
the lines after it read as they do in the content-column spelling.

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
:::
- tail
    </li>
  </ul>
</blockquote>
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
