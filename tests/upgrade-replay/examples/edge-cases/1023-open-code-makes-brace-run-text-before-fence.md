---
page: edge-blocks
---

## Open code makes brace run text before fence

An open inline code span makes the brace run paragraph text. The later fence interrupts that paragraph, ending the span at its block boundary (PART 9 §10 I1, PART 3 UNCLOSED RUN; carve#5632).

:::: compare

````carve
p
 foo](`url)
 {.x
 .y}
 ```
 z
````

```html
<p>p
foo](<code>url)
{.x
.y}</code></p>
<pre><code>z
</code></pre>
```

::::
