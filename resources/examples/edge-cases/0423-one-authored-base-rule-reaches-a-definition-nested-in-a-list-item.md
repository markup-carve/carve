## One authored base rule reaches a definition nested in a list item

List items, footnotes, and definitions use the same PART 0 rule. In this document
the definition list opens one column past the item's minimum, then the definition
body becomes the innermost owner. Its blank line does not discard the containing
block's base, so the quote at the definition's content column remains in the
`dd`, exactly as it does when the outer container is a footnote.

::: compare

```carve
- intro

   :: term
   :  definition

      > quote
```

```html
<ul>
  <li>intro
    <dl>
      <dt>term</dt>
      <dd>
        <p>definition</p>
        <blockquote><p>quote</p></blockquote>
      </dd>
    </dl>
  </li>
</ul>
```

:::

Nor is the innermost owner a definition body in particular. A LIST ITEM opened at
a footnote body's own column owns the lines below it the same way, so a quote
written at that item's content column stays in the item rather than being rebased
to the body's column and lifted out of it.

::: compare

```carve
[^n]: intro

  - item

    > quote

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <ul>
        <li>item
          <blockquote><p>quote</p></blockquote>
        </li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
