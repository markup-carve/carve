---
page: edge-lists
---

## A marker-line note resumes after its plus block

When a note on a list item's marker line takes a block with `+`, the note resumes at its body column after that block, so the unclosed fence below `p` is the note's (carve#5512).

::: compare

````carve
- [^a]: +
  p
    ``` x
    [^z]: code

see[^a]
````

```html
<ul>
  <li></li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>p</p>
      <pre><code class="language-x">[^z]: code

</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
