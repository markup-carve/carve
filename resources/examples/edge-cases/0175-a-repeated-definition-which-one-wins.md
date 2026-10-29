## A repeated definition: which one wins

The three definition kinds do not answer this the same way, so each is pinned
separately.

A repeated **link reference** definition is overridden by the later one.

::: compare

```carve
see [t][r].

[r]: /a

[r]: /b
```

```html
<p>see <a href="/b">t</a>.</p>
```

:::

A repeated **abbreviation** definition behaves the same way - the later
expansion wins.

::: compare

```carve
*[A]: a
*[A]: b

A here.
```

```html
<p><abbr title="b">A</abbr> here.</p>
```

:::

A repeated **footnote** definition does not: the FIRST one wins and the later
one is dropped. `carve lint` reports it as `duplicate-footnote-definition`.

::: compare

```carve
see [^f].

[^f]: one

[^f]: two
```

```html
<p>see <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>one<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
