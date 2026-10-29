## Fence folds as lazy inline code above the content column

A fenced code block indented past the content column remains a block opener. Its opener column is the temporary block base, so structural over-indent is removed while payload indentation beyond that base survives. Canonical output writes the fence at the content column.

:::: compare

````carve
- one

   ```
   c
   ```
````

```html
<ul>
  <li>one
    <pre><code>c
</code></pre>
  </li>
</ul>
```

::::
