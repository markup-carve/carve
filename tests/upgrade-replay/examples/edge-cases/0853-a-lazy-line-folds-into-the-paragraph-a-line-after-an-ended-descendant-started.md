---
page: edge-lists
---

## A lazy line folds into the paragraph a line after an ended descendant started

CARVE-P0-006 and PART 0 S4 (carve#4165). An ended descendant supplies no paragraph, but a later line at the enclosing item's content column starts one, and that paragraph takes a lazy line.

:::: compare

````carve
- - - ```
    x
    y
l
````

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
y
l
      </li>
    </ul>
  </li>
</ul>
```

::::
