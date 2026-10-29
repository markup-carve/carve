## A definition inside a definition-list dd is collected, and the entry keeps no trace

A `<dd>` continues like a list item (§17, definition_body) and is one of the block-level contexts §17 L6 names: a definition written as its content is collected into the document-wide table and the entry renders empty, exactly as a list item or block quote does. This holds the same way for both definition kinds a `<dd>` can hold - a link reference definition and a footnote definition - so a fix for one is not a fix for only one (carve#666).

::: compare

```carve
:: term
:  [r]: /u

see [t][r]
```

```html
<dl>
  <dt>term</dt>
  <dd></dd>
</dl>
<p>see <a href="/u">t</a></p>
```

:::

::: compare

```carve
:: term
:  [^f]: x

see[^f]
```

```html
<dl>
  <dt>term</dt>
  <dd></dd>
</dl>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
