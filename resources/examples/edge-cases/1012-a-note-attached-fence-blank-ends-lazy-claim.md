---
page: edge-lists
---

## A note-attached fence blank ends lazy claim

The blank remains payload of the attached list item's unclosed fence. A later line below the note body column stays in the document (PART 0 S1 and S4, carve#5581).

::: compare

````carve
x[^a]

[^a]: +
- ```
  - nest

y
````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p>y</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>
          <pre><code>- nest

</code></pre>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
