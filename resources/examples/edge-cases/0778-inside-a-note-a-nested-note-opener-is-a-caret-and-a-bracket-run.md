## Inside a note a nested note opener is a caret and a bracket run

Footnote recognition is off inside a note (PART 9 SS16), so a nested `^[` is a literal `^` before an ordinary bracketed run. That run takes a link tail, a reference tail or attributes like any other, and a link inside a note keeps its destination even when the note sits in link text, because the note renders in the endnotes.

::: compare

```carve
^[x ^[a](u) b]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x ^<a href="u">a</a> b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
^[x ^[a][r] b]

[r]: /v
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x ^<a href="/v">a</a> b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
^[x ^[a]{.c} b]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x ^<span class="c">a</span> b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[t ^[x [a](u) b]](/w)
```

```html
<p><a href="/w">t <sup id="fnref1">1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x <a href="u">a</a> b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
