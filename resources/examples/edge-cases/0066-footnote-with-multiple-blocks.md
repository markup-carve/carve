## Footnote with multiple blocks

A footnote definition's body is parsed as full block content — multiple
paragraphs (or lists, etc.) indented under the definition. The backlink
is appended to the last block.

::: compare

```carve
See the note.[^n]

[^n]: First paragraph of the note.

    Second paragraph, indented under the definition.
```

```html
<p>See the note.<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>First paragraph of the note.</p>
      <p>Second paragraph, indented under the definition.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The continuation marker `+` also works here: a lone `+` attaches the following
flush-left block to the note, so a second block needs no indentation.

::: compare

```carve
See the note.[^n]

[^n]: First paragraph of the note.
+
A second paragraph, joined with +.
```

```html
<p>See the note.<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>First paragraph of the note.</p>
      <p>A second paragraph, joined with +.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
