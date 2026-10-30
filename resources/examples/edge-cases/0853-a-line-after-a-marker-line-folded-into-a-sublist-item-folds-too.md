---
page: edge-lists
---

## A line after a marker line folded into a sublist item folds too

PART 0 S4 (carve#4371). A fold closes nothing, so the deepest open paragraph takes the next lazy line.

:::: compare

````carve
1. - a
     - y
      1. ~~~
z
````

```html
<ol>
  <li>
    <ul>
      <li>a
        <ul>
          <li>y
1. ~~~
z</li>
        </ul>
      </li>
    </ul>
  </li>
</ol>
```

::::
