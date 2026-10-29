## A note's content recognizes no note

PART 9 §16 on the inline form: "Content is INLINE-only, parsed recursively with
footnote recognition DISABLED inside it (no `^[…]` or `[^ref]` nested in a note,
either direction)."

Disabled recognition makes the inner spelling ORDINARY TEXT rather than an
unrenderable document. Inside a note `^[` opens nothing, so the `^` is text and
`[b]` is a bracketed run; and `[^1]` is not a reference, so it is a bracketed run
over the content `^1` - which is why the second case renders `[^1]` even though
the document defines that label. The definition is then referenced by nothing and
renders nothing of its own.

Recognition stays off for the WHOLE content, not one level of it: the third case
holds a note spelling two deep and both stay literal.

The executable spec refused all three, and no corpus document nested a note in a
note (markup-carve/carve#1188).

::: compare

```carve
x ^[a ^[b] c]
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a ^[b] c<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
x ^[a [^1] c]

[^1]: n
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a [^1] c<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
x ^[a ^[b ^[c] d] e]
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a ^[b ^[c] d] e<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An attribute block on the inner spelling attaches to the bracketed run it turns
out to be, on either side of the pair.

::: compare

```carve
x ^[a [^1]{.k} c]

[^1]: n
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a <span class="k">^1</span> c<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
