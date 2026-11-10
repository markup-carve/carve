---
page: edge-footnotes
---

## A refused marker-head brace run stays literal

The continuation reaches the opening brace's source column but does not pass it. The entire run is literal paragraph text in an item and in a note (CARVE-P2-035, carve#5773).

::: compare

```carve
- {#a
 }
```

```html
<ul>
  <li>{#a
}</li>
</ul>
```

:::

::: compare

```carve
[^n]: {#a
 }

x[^n]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>{#a
}<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
