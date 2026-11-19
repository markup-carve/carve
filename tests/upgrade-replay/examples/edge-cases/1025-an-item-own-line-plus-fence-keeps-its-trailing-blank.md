---
page: edge-lists
---

## An item own line plus fence keeps its trailing blank

An item reads a fence an own-line `+` attached like a body fence. It keeps the interior and trailing blanks until a nonblank line misses the item (PART 0 S1, carve#5560 and carve#5635).

:::::: compare

`````carve
- p
+
```
code

  tail

see
`````

```html
<ul>
  <li>p
    <pre><code>code

  tail

</code></pre>
  </li>
</ul>
<p>see</p>
```

::::::
