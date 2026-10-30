---
page: edge-headings
---

## An indented dash line neither opens nor closes frontmatter

PART 1 `frontmatter_open` and `frontmatter_close` admit no indent (carve#4453).

:::: compare

````carve
 ---
a
---
x
````

```html
<hr>
<p>a</p>
<hr>
<p>x</p>
```

::::

:::: compare

````carve
---
a
 ---
x
````

```html
<hr>
<p>a</p>
<hr>
<p>x</p>
```

::::
