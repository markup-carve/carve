---
page: edge-lists
---

## A definition at a plus-attached description's body column registers

PART 9 §17 L3, CARVE-P0-010 and carve#4439. A first-block `+` hands the item the same block a `- a` / `+` spelling does, so a definition at the description body's column is a definition there too.

:::: compare

````carve
- +
:: term
: description
  [r]: /url

See [r][]
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>description</dd>
    </dl>
  </li>
</ul>
<p>See <a href="/url">r</a></p>
```

::::

:::: compare

````carve
- +
:: term
: description
  [^n]: note

See[^n]
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>description</dd>
    </dl>
  </li>
</ul>
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

````carve
1. +
:: term
: description
  [r]: /url

See [r][]
````

```html
<ol>
  <li>
    <dl>
      <dt>term</dt>
      <dd>description</dd>
    </dl>
  </li>
</ol>
<p>See <a href="/url">r</a></p>
```

::::
