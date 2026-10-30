## A first-block marker does not pull a column-zero list into a note or description

Reversed by carve#4409: a list attaches in every host except a list item (CARVE-P9-067), so a list at the marker column under `[^a]: +` or `: +` is the body.

A footnote takes the list

::::::: compare

`````carve
[^a]: +
- a list

see[^a]
`````

`````html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>a list</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
`````

:::::::

A description takes the list

::::::: compare

`````carve
:: t
: +
- a list
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a list</li>
    </ul>
  </dd>
</dl>
`````

:::::::
