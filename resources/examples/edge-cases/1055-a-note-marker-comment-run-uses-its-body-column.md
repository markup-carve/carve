---
page: edge-lists
---

## A note marker comment run uses its body column

The comment run opens the note on its marker line. Its continuation is past the note body column, so the run is invisible and the following attribute line remains a block attribute (CARVE-P2-035, carve#5804).

::: compare

````carve
x[^n]

[^n]: {% a
     b
     z %}
    {.x}
plain
````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p>plain</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
