## Line block inline note

An inline note keeps the stanza's break rule when its content moves to the endnote.

:::: compare

```carve
::: |
a ^[first
second] end
:::
```

```html
<div class="line-block">
  <p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> end</p>
</div>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>first<br>
second<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
