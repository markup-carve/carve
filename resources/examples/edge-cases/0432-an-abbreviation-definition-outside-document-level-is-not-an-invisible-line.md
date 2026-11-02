## An abbreviation definition outside document level is not an invisible line

An abbreviation definition is an invisible line in every container (§10 I5, carve#4865): it renders nothing, and a use elsewhere in the document expands. The section title names the reading carve#4865 replaced and stays as the corpus id.

At a definition description's content column, where a link or footnote
definition would be collected and would leave no trace:

::: compare

```carve
:: t
:  d
   *[A]: a
   tail

A
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <p>tail</p>
  </dd>
</dl>
<p><abbr title="a">A</abbr></p>
```

:::

In a footnote body at its own minimum column, which is the other body with a
collector of its own:

::: compare

```carve
[^a]: intro
  *[A]: a
  more

see[^a] A
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <abbr title="a">A</abbr></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <p>more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Document level reads the same way:
