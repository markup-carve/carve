---
page: edge-lists
---

## An unpaired fence folds in an outer item

After the unclosed fence attached by the stacked marker-line `+` ends at its blank, the later unpaired fence line stays in the paragraph of the surviving outer item (PART 9 §17 L3, carve#5606).

:::::: compare

`````carve
- - - +
    ```

  tail
     ~~~
`````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </li>
    </ul>
    <p>tail
~~~</p>
  </li>
</ul>
```

::::::
