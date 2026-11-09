---yaml
page: edge-lists
---

## A new list after a note-attached list

PART 9 §17 L3 offers one block to the note, and §11 N1 makes a different marker type a new sibling list (carve#5559).

::: compare
```carve
[^a]: +
* li
- sib

see[^a]
```

```html
<ul>
  <li>sib</li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>li</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```
:::
