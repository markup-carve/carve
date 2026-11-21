## Inside a note a footnote-shaped run is a bracket run

Footnote recognition is off inside a note (PART 9 SS16), so `[^[g]/]` there is an ordinary bracketed run. The run closes at its balanced `]`, and a delimiter inside it pairs inside it.

::: compare

```carve
^[/[^[g]/] b/]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><em>[^[g]/] b</em><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
^[{+[^[g]+}] b+}]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><ins>[^[g]+}] b</ins><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
