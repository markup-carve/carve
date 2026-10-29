## An abbreviation definition outside document level is not an invisible line

The second of the two exceptions to the invisible-line classification (§10 I5)
is a question of MEMBERSHIP, not of a member behaving differently: an
abbreviation definition is recognized at document level only (§16), so anywhere
else the line is not invisible at all. It is paragraph text, it is VISIBLE, and
it folds like any other plain line - and because it registered nothing, a use of
the abbreviation elsewhere in the document stays literal. Both halves have to be
pinned together: rendering the line AND defining from it is the half-fold the
classification does not offer.

At a definition description's content column, where a link or footnote
definition would be collected and would leave no trace:

::: compare

```carve
:: t
:  d
   *[A]: a
   tail

A
```

```html
<dl>
  <dt>t</dt>
  <dd>d
*[A]: a
tail</dd>
</dl>
<p>A</p>
```

:::

In a footnote body at its own minimum column, which is the other body with a
collector of its own:

::: compare

```carve
[^a]: intro
  *[A]: a
  more

see[^a] A
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> A</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro
*[A]: a
more<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Document level is the contrast that makes this an exception rather than a rule
about abbreviations - the identical line one host out both disappears from the
page and registers - and it needs no document of its own here: `177-two-abbreviation-definitions`
and `305-an-abbreviation-expands-inside-an-inline-container` already pin it, and
a third copy could not fail.
