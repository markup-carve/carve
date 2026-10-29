## A footnote in link text nests the anchors

Under PART 9 §16 and markup-carve/carve#2978 Q12, a footnote in link text
renders as a `<sup>` with its reference id and authored attributes. It counts
toward reference ordinals, and its endnote keeps the backlink to that id.

::: compare

```carve
a [t[^1]](/u) b

[^1]: n
```

```html
<p>a <a href="/u">t<sup id="fnref1">1</sup></a> b</p>
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

::: compare

```carve
a [t^[n]](/u) b
```

```html
<p>a <a href="/u">t<sup id="fnref1">1</sup></a> b</p>
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
