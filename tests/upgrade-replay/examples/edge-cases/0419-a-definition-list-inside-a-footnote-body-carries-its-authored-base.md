## A definition list inside a footnote body carries its authored base

A definition list is a recognized opener, so it belongs to the footnote body at
or past that body's minimum column (PART 0, carve#1781). The definition then is
the innermost open container: a quote reaching its content column belongs to
the definition, whether the definition list itself was written at or past the
footnote's minimum.

::: compare

```carve
[^n]: intro

  :: term
  :  definition

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
      <dl>
        <dt>term</dt>
        <dd>
          <p>definition</p>
          <blockquote><p>quote</p></blockquote>
        </dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Written PAST the footnote column, the definition list itself first takes a local
base. That does not change the nested result: ownership is resolved from the
innermost container outward.

::: compare

```carve
[^n]: intro

   :: term
   :  definition

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
      <dl>
        <dt>term</dt>
        <dd>
          <p>definition</p>
          <blockquote><p>quote</p></blockquote>
        </dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Below the definition's content column, the definition ends. The quote still
reaches the surviving footnote body, where the shared rule recognizes it as a
structural sibling rather than literal marker text.

::: compare

```carve
[^n]: intro

   :: term
   :  definition

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
      <dl>
        <dt>term</dt>
        <dd>definition</dd>
      </dl>
      <blockquote><p>quote</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
