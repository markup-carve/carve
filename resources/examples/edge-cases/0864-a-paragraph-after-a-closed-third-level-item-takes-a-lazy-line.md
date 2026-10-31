---
page: edge-lists
---

## A paragraph after a closed third-level item takes a lazy line

PART 0 S4 (carve#4162). `x` opens a paragraph in the second-level item after the fence item closes, and `tail` folds into it.

:::::: compare

`````carve
- - - ~~~
    x
tail
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
        x
tail
      </li>
    </ul>
  </li>
</ul>
```

::::::
