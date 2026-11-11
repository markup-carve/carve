---
page: edge-lists
---

## A note kept at a wider host's marker column keeps its own body column

A note definition at a `+` host's marker column is kept by the host (CARVE-P9-067), and its body is the note's own: every line at or past the note's body column, two columns past its marker (PART 9 §24 C3), belongs to the note whatever block it opens, and a lazy line continues the note's open paragraph (PART 0 L4). The host's marker width does not move that column, so a `1. +` host reads the note as a `- +` host does, and the `+` is refused when no visible line at its marker column follows the note (carve#5993). After a closed fence the next line at the marker column is the `+`'s block.

::: compare

```carve
1. x
   1. +
   [^m]: n
     - z
   q

p[^m]
```

```html
<ol>
  <li>x
    <ol>
      <li></li>
    </ol>
  </li>
</ol>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <ul>
        <li>z
q</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
10. +
[^m]: n
  > z
q

p[^m]
```

```html
<ol start="10">
  <li></li>
</ol>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <blockquote><p>z
q</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
- +
[^m]: n
  1. z

     more

p[^m]
```

```html
<ul>
  <li></li>
</ul>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <ol>
        <li><p>z</p>
          <p>more</p>
        </li>
      </ol>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

````carve
- x
  1. +
  [^m]: n
    ```
    c
    ```
  q

p[^m]
````

````html
<ul>
  <li>x
    <ol>
      <li>q</li>
    </ol>
  </li>
</ul>
<p>p<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <pre><code>c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
