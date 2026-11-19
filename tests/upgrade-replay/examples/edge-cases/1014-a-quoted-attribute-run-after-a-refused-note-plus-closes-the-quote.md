---
page: edge-lists
---

## A quoted attribute run after a refused note plus closes the quote

The brace opener misses the note marker column, so the `+` refuses it. The valid attribute run leaves no paragraph open for the unmarked line (CARVE-P9-067, CARVE-P2-035, PART 9 §15 A5; carve#5622).

::: compare

````carve
> [^a]: +
>   {#i
>    .y}
next

see[^a]
````

```html
<blockquote>

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
