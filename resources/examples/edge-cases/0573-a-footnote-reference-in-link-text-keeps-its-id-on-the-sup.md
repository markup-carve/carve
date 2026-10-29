## A footnote reference in link text keeps its id on the sup

PART 9 §16 and markup-carve/carve#2978 Q12 place the reference id and authored
attributes on the `<sup>` inside link text. Repeated references keep distinct
ids and backlinks. An authored `data-carve-footnote-label` stays on that carrier.

::: compare

```carve
a [t[^1]{.x}](/u) c [^1] b

[^1]: n
```

```html
<p>a <a href="/u">t<sup id="fnref1" class="x">1</sup></a> c <a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference 1">↩<sup>1</sup></a> <a href="#fnref1-2" role="doc-backlink" aria-label="Back to reference 2">↩<sup>2</sup></a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [t[^named]{data-carve-footnote-label="named"}][r] b

[r]: /u

[^named]: n
```

```html
<p>a <a href="/u">t<sup id="fnref1" data-carve-footnote-label="named">1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
