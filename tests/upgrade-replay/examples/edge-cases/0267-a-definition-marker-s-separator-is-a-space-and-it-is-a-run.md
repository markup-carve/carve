## A definition marker's separator is a space, and it is a run

The three definition markers share one separator rule: the marker-to-content
separator is the `space` terminal, U+0020, and a tab never satisfies it. What
the grammar did not say is how MANY. `footnote_definition` and
`abbreviation_definition` were spelled with a single `space` while all three
engines and the executable spec consumed a run, so the productions forbade a
shape nothing rejected. carve#892 corrects them to `space+`.

Note that this is the OPPOSITE cardinality answer from carve#912's, which held
four PADDING SLOTS to exactly one space. The two are not in conflict, because
they govern different positions. A padding slot sits between two tokens on a
line whose construct is already fixed, and its width means nothing. A marker
separator is what stands between the marker and the content it introduces, and
a writer aligning definitions in a column is writing separator, not content.

Two spaces, at both markers:

::: compare

```carve
*[HTML]:  Hyper Text

HTML
```

```html
<p><abbr title="Hyper Text">HTML</abbr></p>
```

:::

::: compare

```carve
x[^f]

[^f]:  note
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

### The run is ASCII spaces, so the first other character is content

This is where the three engines disagreed, each in a different place, and where
the executable spec gave a fourth answer no engine gave: it refused a footnote
marker followed by any non-ASCII whitespace as a definition at all.

A NO-BREAK SPACE after the separator is content. The abbreviation expands to a
string that starts with it:

::: compare

```carve
*[HTML]:  Hyper Text

HTML
```

```html
<p><abbr title=" Hyper Text">HTML</abbr></p>
```

:::

and the footnote is defined, with the character opening its body:

::: compare

```carve
x[^f]

[^f]:  note
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>&nbsp;note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A TAB after the run is content by the same rule, and the two markers then
answer differently for a reason downstream of this clause rather than in it. An
abbreviation expansion is a raw string, so the tab survives into the `title`:

::: compare

```carve
*[HTML]: 	Hyper Text

HTML
```

```html
<p><abbr title="	Hyper Text">HTML</abbr></p>
```

:::

while a footnote body is parsed as blocks, where a leading tab is that body's
own indentation run (PART 9 section 24 C1) rather than a character in it:

::: compare

```carve
x[^f]

[^f]: 	note
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

### The CONTROLS

A tab as the SEPARATOR is still not a separator. Widening the run is not
widening the terminal, and this is the pair that separates the two:

::: compare

```carve
*[HTML]:	Hyper Text

HTML
```

```html
<p>*[HTML]:	Hyper Text</p>
<p>HTML</p>
```

:::

::: compare

```carve
x[^f]

[^f]:	note
```

```html
<p>x[^f]</p>
<p>[^f]:	note</p>
```

:::

And MARKER REQUIRES CONTENT still applies after the run. A marker followed by
spaces and nothing else is a paragraph, because a line of `whitespace` is blank
(PART 1). The spaces-only forms are pinned in
`tests/separator-role-split.test.mjs` rather than here -- a trailing whitespace
run in a reviewable Markdown source file is one editor save from vanishing --
and this is the version the corpus can hold, a bare marker:

::: compare

```carve
x[^f]

[^f]:
```

```html
<p>x[^f]</p>
<p>[^f]:</p>
```

:::

One space is unchanged, which is the form every document actually uses:

::: compare

```carve
*[HTML]: Hyper Text

HTML
```

```html
<p><abbr title="Hyper Text">HTML</abbr></p>
```

:::
