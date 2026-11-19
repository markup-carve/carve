---
page: edge-lists
---

## An own line plus fence ends before a shifted run

A shifted fence line after an own-line attachment's retained blank misses the host, ends its fence and opens a parent fence (PART 0 S1 step 2, carve#5658 F06 ruling).

:::::: compare

`````carve
- p
+
```
a

 ```
  zq
`````

```html
<ul>
  <li>p
    <pre><code>a

</code></pre>
  </li>
</ul>
<pre><code> zq
</code></pre>
```

::::::
