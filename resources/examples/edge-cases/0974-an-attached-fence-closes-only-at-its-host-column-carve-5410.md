---
page: edge-lists
---

## An attached fence closes only at its host column (carve#5410)

The indented fence line is outside the closer column of the fence opened by the marker-line `+`. Its first blank ends that fence. The indented line then opens a second fence in each host.

### List item

::::: compare

````carve
- +
```
a

  ```
  c
````

```html
<ul>
  <li>
    <pre><code>a
</code></pre>
    <pre><code>c
</code></pre>
  </li>
</ul>
```

:::::

### Definition body

::::: compare

````carve
:: t
: +
```
a

  ```
  c
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code>a
</code></pre>
    <pre><code>c
</code></pre>
  </dd>
</dl>
```

:::::

### Footnote body

::::: compare

````carve
[^1]: +
```
a

  ```
  c
[^1]
````

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <pre><code>a
</code></pre>
      <pre><code>c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::
