---
page: edge-lists
---

## A closerless comment fence opens no span in a body

A `%%%` with no exact-width closer ahead is the line form of a comment and opens no span (CARVE-P9-053). A comment below the body column after it closes the body like any other comment (CARVE-P9-052), in a description and a footnote body as in a list item, so the line after it does not return to the body.

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
<p>tail</p>
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
<p>tail</p>
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
