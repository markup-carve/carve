---
page: edge-lists
---

## A closerless comment fence opens no span in a body

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

A `%%%` with no exact-width closer ahead is the line form of a comment and opens no span. A comment below the body column after it closes no body (carve#4862), in a description and a footnote body as in a list item, so a line after it at the body column stays in the body.

::::::: compare

````carve
:: t
: head

  %%%
%% below

  tail
````

````html
<dl>
  <dt>t</dt>
  <dd>head</dd>
</dl>
````

:::::::

::::::: compare

````carve
[^n]: head

  %%%
%% below

  tail

r[^n]
````

````html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>head<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::::
