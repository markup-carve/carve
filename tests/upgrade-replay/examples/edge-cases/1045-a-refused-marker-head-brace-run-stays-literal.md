---
page: edge-footnotes
---

## A refused marker-head brace run stays literal

The continuation reaches but does not pass the brace column. Only the opener is forced literal; later text follows ordinary inline and block rules in both hosts (CARVE-P2-035, carve#5830).

::: compare

```carve
- {#a
 }
```

```html
<ul>
  <li>{<span class="tag"><strong>#a</strong></span>
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
      <p>{<span class="tag"><strong>#a</strong></span>
}<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
