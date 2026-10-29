## An empty footnote body is written with the `{empty}` sentinel

"Footnote definition requires an inline body" above is a PARSE rule, and it leaves the canonical writer a problem: a footnote definition whose body holds no blocks cannot be written back as a bare `[^label]:`, because that line is not a definition - so the definition **and** every reference to it would come back as literal text. PART 11 §7b answers it. The writer emits the sentinel attribute block `{empty}`, which the definition line consumes as attributes and discards, leaving the body empty and the reference resolved.

`{ }` and `{}` do **not** work in this position, and they are the first two spellings a reader reaches for: a block-attribute line requires at least one attribute, so neither run is an attribute block here and both stay literal text inside the note.

::: compare

```carve
See[^f]

[^f]: {empty}
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
