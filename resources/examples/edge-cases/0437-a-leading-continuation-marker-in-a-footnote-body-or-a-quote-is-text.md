## A leading continuation marker in a footnote body or a quote is text

Every container that takes the continuation marker also takes it in the
FIRST-BLOCK position (§17 L4): `- +`, `:  +`, `> +` and `[^a]: +` open a body
whose content is the following flush-left block. In a footnote body and a
block quote, a `+` with no flush-left block under it is ordinary text, and a
line below it that is not flush-left lands wherever the ordinary column rules
put it (markup-carve/carve#1821, markup-carve/carve#3105). That includes a line
at the note's body column (CARVE-P9-067, carve#4409).

A footnote body whose first line is a lone `+` over a flush-left line. The
`+` is the marker, and the note holds the paragraph `flush`.

::: compare

```carve
[^a]: +
flush

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Column 1 is not flush-left, so the `+` is the note's text, and the line folds
into it.

::: compare

```carve
[^a]: +
 flush

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+
flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

At column 2 the line is inside the body, and it folds into the paragraph the `+`
opened - one paragraph reading `+ flush`, not two blocks and not an attachment.

::: compare

```carve
[^a]: +
  flush

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+
flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

In a block quote, column 0 is the first-block form: the quote holds the
paragraph `flush`.

::: compare

```carve
> +
flush
```

```html
<blockquote><p>flush</p></blockquote>
```

:::

Column 1 is not flush-left, so the `+` is the quote's text, and the line
reaches that paragraph by §10 I6's lazy fold.

::: compare

```carve
> +
 flush
```

```html
<blockquote><p>+
flush</p></blockquote>
```

:::

Column 2, the column that would be the quote's content column if a marker were
reading one here. It is not, and the row is the control that says so.

::: compare

```carve
> +
  flush
```

```html
<blockquote><p>+
flush</p></blockquote>
```

:::
