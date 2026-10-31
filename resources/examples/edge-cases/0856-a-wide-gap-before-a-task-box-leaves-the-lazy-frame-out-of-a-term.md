---
page: edge-lists
---

## A wide gap before a task box leaves the lazy frame out of a term

The lazy line folds into the term past the note (PART 0 S4, carve#4499).

::: compare

````carve
-  [ ] - [^f]: :: t
          c

[^f]
````

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t
c</dt>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
