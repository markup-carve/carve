---
page: edge-footnotes
---

## An attached list keeps its unclosed fence blank

The note's `+` attaches the list. Its descendant fence is ordinary, so the blank before the next document paragraph stays in the fence (PART 0 S1).

::: compare

````carve
[^a]: +
- li
  ``` x
  code

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>li
          <pre><code class="language-x">code

</code></pre>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
