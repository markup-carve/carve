## A titled footnotes marker names the endnotes section

The opener's quoted title and label render as the first children of the placed
endnotes section, and the title names it (PART 9 section 12, CARVE-P9-072).

:::: compare

```carve
::: footnotes "Notes" [End]
:::

A[^1].

[^1]: n
```

```html
<section role="doc-endnotes" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Notes</p>
  <p class="div-label">End</p>
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
<p>A<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
```

::::
