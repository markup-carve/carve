---
page: edge-lists
---

## An attribute line left of a note's body column is the plus host's

A note between a first-block `+` and its block keeps only what reaches its body column. An attribute line left of it is the host's, closes the note's paragraph, and labels the attached block (CARVE-P9-067, CARVE-P9-013, carve#5576).

::: compare

````carve
- +
[^m]: n
{.x
 .y}
p
````

```html
<ul>
  <li><p class="x y">p</p></li>
</ul>
```

:::

::: compare

````carve
- +
[^m]: n
{.x .y}
p
````

```html
<ul>
  <li><p class="x y">p</p></li>
</ul>
```

:::

::: compare

````carve
- +
[^m]: n
{.x .y}
p

y[^m]
````

```html
<ul>
  <li><p class="x y">p</p></li>
</ul>
<p>y<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
