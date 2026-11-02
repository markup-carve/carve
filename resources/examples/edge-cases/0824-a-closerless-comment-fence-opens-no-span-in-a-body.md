---
page: edge-lists
---

## A closerless comment fence opens no span in a body

A `%%%` with no exact-width closer ahead is the line form of a comment and opens no span (CARVE-P9-053). A comment below the body column after it closes no body (carve#4862), in a description and a footnote body as in a list item, so a line after it at the body column stays in the body.

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
  <dd>
    <p>head</p>
    <p>tail</p>
  </dd>
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
      <p>head</p>
      <p>tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::::
