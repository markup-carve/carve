---
page: edge-footnotes
---

## A losing duplicate footnote definition's plus takes nothing

PART 9R R2: the first footnote definition wins and a later one registers nothing. When the losing definition's body is a lone `+`, that `+` takes nothing either: the losing line ends the blocks open before it, as any footnote marker line does, and the block below belongs to the container the losing line stands in.

The reproduction: the first definition is plain text, and the duplicate's `+` takes nothing, so `flush` is a top-level paragraph.

::: compare

````carve
[^a]: x
[^a]: +
 flush

see[^a]
````

```html
<p>flush</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Inside a quote the block below stays in the quote.

::: compare

````carve
> [^a]: x
> [^a]: +
> flush

see[^a]
````

```html
<blockquote><p>flush</p></blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

With three definitions, neither losing `+` takes the list at the body column.

::: compare

````carve
[^n]: one
[^n]: +
[^n]: +
  - item

see[^n]
````

```html
<ul>
  <li>item</li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>one<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

When both definitions carry `+`, the winner's `+` takes the losing definition line and `flush` stays top-level (carve#5465).

::: compare

````carve
[^a]: +
[^a]: +
 flush

see[^a]
````

```html
<p>flush</p>
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
