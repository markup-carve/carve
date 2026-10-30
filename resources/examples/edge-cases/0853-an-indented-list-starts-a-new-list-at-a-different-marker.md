---
page: edge-lists
---

## An indented list starts a new list at a different marker

PART 9 §11 N1 and PART 0 S3 (carve#4363). An indented pair reads as its column-0 spelling.

:::: compare

````carve
 * a
 - x
````

```html
<ul>
  <li>a</li>
</ul>
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

````carve
- p

   * x
   - y
````

```html
<ul>
  <li>p
    <ul>
      <li>x</li>
    </ul>
    <ul>
      <li>y</li>
    </ul>
  </li>
</ul>
```

::::
