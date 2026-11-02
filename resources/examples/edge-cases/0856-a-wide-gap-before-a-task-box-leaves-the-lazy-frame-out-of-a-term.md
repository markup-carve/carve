---
page: edge-lists
---

## A wide gap before a task box leaves the lazy frame out of a term

The line misses the note and the item, and a term holds no fold (carve#4861), so it is read outside them.

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
      <li>c</li>
    </ul>
  </li>
</ul>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
