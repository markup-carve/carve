---
page: edge-footnotes
---

## Repeated losing note pluses leave the block with the winning note

A losing duplicate definition registers nothing and its `+` takes nothing (PART 9R R2). Any number of losing `[^m]: +` lines before a blank therefore leave the indented list with the first definition.

::: compare

````carve
[^m]: +
[^m]: +
[^m]: +

  - item

see[^m]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>item</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Inside a quote the losing lines leave the list with the note too, and the quote holds only the invisible definitions.

::: compare

````carve
> [^m]: +
> [^m]: +
>
>   - item

see[^m]
````

```html
<blockquote>

</blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>item</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
