## An unplaced footnotes marker keeps its authored blocks inside the div

A marker with no referenced notes renders the ordinary div. After a first
marker places the section, a later marker renders the same div.

:::: compare

```carve
Plain.

::: footnotes
No notes here.
:::
```

```html
<p>Plain.</p>
<div class="footnotes">
  <p>No notes here.</p>
</div>
```

::::

:::: compare

```carve
X[^a].

::: footnotes
First marker.
:::

::: footnotes
Second marker.
:::

[^a]: note
```

```html
<p>X<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<p>First marker.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
<div class="footnotes">
  <p>Second marker.</p>
</div>
```

::::
