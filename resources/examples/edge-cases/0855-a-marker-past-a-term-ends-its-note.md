---
page: edge-definitions
---

## A marker past a term ends its note

A list marker that misses a term's footnote body ends the note and reads as it would without it (PART 0 B-term-keep).

::: compare

```carve
[^n]: :: t
- x

[^n]
```

```html
<ul>
  <li>x</li>
</ul>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^n]: :: t
more
- x

[^n]
```

```html
<ul>
  <li>x</li>
</ul>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t
more</dt>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
