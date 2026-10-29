## A first-block marker does not pull a column-zero list into a note or description

The first-block form takes one non-list block (CARVE-P9-067). A list at column zero starts after the note or description. The refused `+` stays as text in the note; the description remains empty (carve#3482).

A footnote keeps the refused marker and leaves the list outside

::::::: compare

`````carve
[^a]: +
- a list

see[^a]
`````

`````html
<ul>
  <li>a list</li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
`````

:::::::

A description stays empty before the following list

::::::: compare

`````carve
:: t
: +
- a list
`````

`````html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<ul>
  <li>a list</li>
</ul>
`````

:::::::
