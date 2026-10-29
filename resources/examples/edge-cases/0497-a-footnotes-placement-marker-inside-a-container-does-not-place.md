## A footnotes placement marker inside a container does not place

Only a top-level `::: footnotes` marker relocates the endnotes section (PART 9
§16, `CARVE-P9-073`). Inside a block quote the marker renders §12's
`<div class="footnotes">` floor where it is written, and the section is appended
where an unmarked document puts it - after all body content, which a position
inside the quote is not.

:::: compare

```carve
Intro[^a].

> ::: footnotes
> :::

[^a]: only note
```

```html
<p>Intro<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<blockquote>
  <div class="footnotes">

  </div>
</blockquote>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>only note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
