## A note body's own references resolve

A footnote body is rendered when the endnotes list is built, which is after the
document text has been walked. Whatever the body introduces - a reference link,
another footnote, a reference link whose text holds a footnote - is therefore
introduced late, and still has to be resolved.

The later note takes the next number in the same sequence, and its own body is
resolved on the same terms, so the list can grow while it is being built.

::: compare

```carve
a [^1] b

[^1]: see [x][r]

[r]: /u
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="/u">x</a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [^1] b

[^1]: see [^2]

[^2]: two
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>two<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [^1] b

[^1]: see [t[^2]][r]

[r]: /u

[^2]: two
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="/u">t<sup id="fnref2">2</sup></a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>two<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
