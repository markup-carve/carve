---
page: edge-lists
---

## A block at a pulled footnote column opens in the note

PART 0 CARVE-P0-011 ends a pulled paragraph when a block reaches the note's content column, as in a description (PART 9 §17 L3). A fence or attribute line there opens in the note; a later column-zero line leaves it.

::: compare

````carve
[^1]

[^1]: +
h
  ```
z
````

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p>z</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>h</p>
      <pre><code></code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^1]

[^1]: +
h
  {.c}
  k
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>h</p>
      <p class="c">k<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
