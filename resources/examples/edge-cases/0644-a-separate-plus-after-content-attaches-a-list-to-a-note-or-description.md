## A separate plus after content attaches a list to a note or description

A lone `+` at an open container's marker column attaches the next block, and a list counts as one (PART 9 §17 L3). Only the first-block form `: +` or `[^a]: +` refuses a list (carve#3482).

A description with content takes the list after a separate `+`

::::::: compare

`````carve
:: t
: a
+
- b
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <ul>
      <li>b</li>
    </ul>
  </dd>
</dl>
`````

:::::::

A footnote with content takes the list after a separate `+`

::::::: compare

`````carve
[^a]: x
+
- b

see[^a]
`````

`````html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x</p>
      <ul>
        <li>b</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
`````

:::::::
