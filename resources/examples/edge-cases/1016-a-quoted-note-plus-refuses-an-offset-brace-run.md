---
page: edge-definitions
---

## A quoted note plus refuses an offset brace run

The first-block `+` accepts a follower only at the note's marker column, measured through both quote prefixes (CARVE-P9-067, carve#5620). A brace run one column later remains in the inner quote.

:::::: compare

`````carve
> > [^a]: +
> >  {#i
  .y}

see[^a]
`````

```html
<blockquote>
  <blockquote><p>{#i
.y}</p></blockquote>
</blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::
