## A footnote in reference link text nests the anchors too

Under PART 9 §16 and markup-carve/carve#2978 Q12, a footnote in link text
renders as a `<sup>` with its reference id and authored attributes. It counts
toward reference ordinals, and its endnote keeps the backlink to that id.

::: compare

```carve
a [t[^1]][r] b

[r]: /u

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
a [t^[n]][r] b

[r]: /u
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
a [t[^1]][r] c [^1] b

[r]: /u

[^1]: n
```

```html
<p>a <a href="/u">t<sup id="fnref1">1</sup></a> c <a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
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
a [t[^1]{#z}][r] [^1]{#y}

[r]: /u

[^1]: n
```

```html
<p>a <a href="/u">t<sup id="z">1</sup></a> <a id="y" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#z" role="doc-backlink" aria-label="Back to reference 1">↩<sup>1</sup></a> <a href="#y" role="doc-backlink" aria-label="Back to reference 2">↩<sup>2</sup></a></p>
    </li>
  </ol>
</section>
```

:::
