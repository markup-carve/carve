## Unresolved footnote reference with a trailing attribute stays literal

A `[^a]` footnote reference with no matching definition is not a footnote and
does not become an attributed span: it stays literal text, and a following
`{...}` attribute block does not attach to it.

::: compare

```carve
Text[^a]{.ref}.
```

```html
<p>Text[^a].</p>
```

:::

A resolved footnote reference is unaffected.

::: compare

```carve
Text[^a].

[^a]: note.
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A genuine bracketed span with attributes still works.

::: compare

```carve
A [span]{.c} here.
```

```html
<p>A <span class="c">span</span> here.</p>
```

:::
