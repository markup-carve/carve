---
page: edge-lists
---

## An item hands its blank run to a description or note child's open fence

PART 0 S1 and S2 (carve#4047). The blank run before the line that ends the item stays in the child's open fence, as it does for a sublist's fence.

:::::: compare

`````carve
- :: t
  : ```
    code

after
`````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dd>
        <pre><code>code

</code></pre>
      </dd>
    </dl>
  </li>
</ul>
<p>after</p>
```

::::::

A footnote body on an item line keeps it too.

:::::: compare

`````carve
x[^1]

- [^1]: ```
    code

after
`````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<ul>
  <li></li>
</ul>
<p>after</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <pre><code>code

</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

The sublist twin.

:::::: compare

`````carve
- - ```
    code

after
`````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>code

</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>after</p>
```

::::::
