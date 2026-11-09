---
page: edge-blocks
---

## A caption code span ends at a later fence

The caption is a paragraph owner. Its open inline code span ends when the later fence interrupts it (PART 9 §10 I1, PART 3 UNCLOSED RUN; carve#5632).

:::: compare

````carve
> quote
^ `open
 {.x
 .y}
 ```
 z
````

```html
<figure>
  <blockquote><p>quote</p></blockquote>
  <figcaption><code>open
 {.x
 .y}</code></figcaption>
</figure>
<pre><code>z
</code></pre>
```

::::
