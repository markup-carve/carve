## A container closer closes its container in a footnote body too

A colon-fence closer at its opener's column closes the container whatever the
host. A container opened in a FOOTNOTE body, holding a definition one column past
its content column, then closed: the definition is consumed and the closer
leaves the container empty. The footnote-body host used to keep the closer as a
`:::` paragraph inside the container; it now closes it, exactly as the
description-body host already does (markup-carve/carve#1948).

:::: compare

```carve
see[^f]

[^f]: a
    ::: note
     [r]: /url
    :::

[r][]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p><a href="/url">r</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a</p>
      <aside class="admonition note" aria-label="Note">

      </aside>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

The description-body host of the same geometry, unchanged - the control that
shows the two hosts now agree.

:::: compare

```carve
:: t
:  a
   ::: note
    [r]: /url
   :::

[r][]
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <aside class="admonition note" aria-label="Note">

    </aside>
  </dd>
</dl>
<p><a href="/url">r</a></p>
```

::::
