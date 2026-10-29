## Footnote definition inside a container is collected

A footnote definition is document-level metadata: it is collected and resolved
even when it sits inside a blockquote or a list item (PART 9 §16). The reference
resolves to an endnote and the container that held the definition is left empty.

Definition inside a blockquote:

::: compare

```carve
See [^a].

> [^a]: note body
```

```html
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<blockquote>

</blockquote>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note body<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Definition inside a list item:

::: compare

```carve
See [^a].

- [^a]: note body
```

```html
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<ul>
  <li></li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note body<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
