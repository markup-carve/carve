## A footnote definition past a box's column is hoisted

A footnote definition past a colon body's content column is a block on its
authored base, so it is hoisted like one at the box's own column (CARVE-P0-004,
CARVE-P9-083).

:::: compare

````carve
- ::: box
    [^n]: note
  :::

ref[^n]
````

```html
<ul>
  <li>
    <div class="box">

    </div>
  </li>
</ul>
<p>ref<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
