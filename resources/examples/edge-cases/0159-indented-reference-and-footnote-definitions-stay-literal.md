## Indented reference and footnote definitions stay literal

A reference-link definition and a footnote definition are top-level block
constructs that register at column 0. Indented by a space the definition line is
an ordinary paragraph: it registers nothing, so the reference or footnote that
used it never resolves and both render as literal text.

An indented reference definition does not register; the link stays unresolved.

::: compare

```carve
 Read [intro][x].

 [x]: /intro "T"
```

```html
<p>Read <a href="/intro" title="T">intro</a>.</p>
```

:::

An indented footnote definition does not register; the footnote reference stays
literal.

::: compare

```carve
 Note[^fn].

 [^fn]: body.
```

```html
<p>Note<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>body.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
