## Indented reference and footnote definitions register

A reference-link definition and a footnote definition indented by a space at top
level register like ones at column 0 (carve#3885), so the reference or footnote
that uses them resolves.

An indented reference definition registers, and the link resolves.

::: compare

```carve
 Read [intro][x].

 [x]: /intro "T"
```

```html
<p>Read <a href="/intro" title="T">intro</a>.</p>
```

:::

An indented footnote definition registers, and the footnote reference resolves.

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
