---
page: edge-lists
---

## A nested quoted attribute run closes the outer lazy claim

The valid wrapped attribute run misses the note marker column and leaves no paragraph open at either quote depth. The unmarked line opens after the outer quote (CARVE-P9-067, CARVE-P2-035, PART 9 §15 A5; carve#5629).

::: compare

````carve
> > [^a]: +
> >   {#i
> >    .y}
next

see[^a]
````

```html
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
<p>next</p>
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

:::
