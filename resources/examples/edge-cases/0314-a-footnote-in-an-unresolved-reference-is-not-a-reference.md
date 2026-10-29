## A footnote in an unresolved reference is not a reference

An unresolved reference degrades to its literal source (PART 9R R1), so the link
text it rendered is discarded rather than written into the document. A footnote
reference or an inline note sitting in that text therefore references nothing:
it draws no number, its definition stays unreferenced and is dropped, and no
endnotes section is written on its account.

Counting it anyway is what a pipeline does when it numbers footnotes before it
knows whether the reference resolved. The numbering says so out loud - the note
a reader can see is then numbered as a repeat of a reference the document does
not contain, and a lone one leaves an endnote whose backlink names an id no
element carries.

::: compare

```carve
a [t[^1]][nope] b

[^1]: n
```

```html
<p>a [t[^1]][nope] b</p>
```

:::

::: compare

```carve
a [t[^1]][nope] b [^1] c

[^1]: n
```

```html
<p>a [t[^1]][nope] b <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> c</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [t^[n]][nope] b
```

```html
<p>a [t^[n]][nope] b</p>
```

:::

A bracketed run that never had a tail is not a reference at all: PART 9 §14
renders its content, so a note inside it is written and counts.

::: compare

```carve
a [t[^1]] b

[^1]: n
```

```html
<p>a [t<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>] b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
