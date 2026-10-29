## Tight list item keeps trailing text after a block bare

In a tight list item, text that follows a closed block (a fenced code block, a
div, or an admonition) is part of the item's inline content and is not wrapped
in a `<p>`, matching the item's tightness. Only a blank-separated (loose) item
wraps its paragraphs.

::: compare

````carve
- item
  ```
  c
  ```
  tail
````

```html
<ul>
  <li>item
    <pre><code>c
</code></pre>
    tail
  </li>
</ul>
```

:::

The same holds after a div body, and for an ordered item.

:::: compare

```carve
- item
  :::note
  body
  :::
  tail
```

```html
<ul>
  <li>item
:::note
body
:::
tail</li>
</ul>
```

::::

A blank line makes the item loose, so its leading text and the trailing text
are each wrapped.

::: compare

````carve
- item

  ```
  c
  ```

  tail
````

```html
<ul>
  <li><p>item</p>
    <pre><code>c
</code></pre>
    <p>tail</p>
  </li>
</ul>
```

:::
