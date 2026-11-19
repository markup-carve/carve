## An inline note's content resolves after the note

A note's content is rendered where it is written and placed where the endnotes
go, so a construct inside it whose own resolution is deferred - a crossref, a
reference link, a reference image - has to survive that move. It does: the note
carries the unresolved construct across, and the construct resolves against the
whole document once the note has been placed.

Whether it resolves is a separate question from whether it survives. An
unresolved crossref inside a note renders as its literal source, exactly as it
would outside one.

::: compare

```carve
a ^[see </#h>] b

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="#h">h</a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[see </#nope>] b
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see &lt;/#nope&gt;<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[see [t][r]] b

[r]: /u
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="/u">t</a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[see ![z][r]] b

[r]: /i.png
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <img src="/i.png" alt="z"><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A collapsed reference reaches the heading index from inside a note too, and the
note's own attributes are unaffected by what its content holds.

::: compare

```carve
a ^[see [h][]] b

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="#h">h</a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[</#h>]{.c} b

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref" class="c"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#h">h</a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A note reached from a footnote body is placed after the body that introduced it,
and its own content resolves the same way.

::: compare

```carve
a [^1] b

[^1]: see ^[</#h>]

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p><a href="#h">h</a><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
