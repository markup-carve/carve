---
page: edge-footnotes
---

## A wrapped attribute at a footnote body's column is one construct

PART 9 §24 C3 and §15 A1, A5 (carve#4104). A wrapped attribute line at the body column ends the paragraph and attaches to the next block, in a footnote body as in a list item.

:::::: compare

`````carve
[^f]: d
  {.c
}
  x

[^f]
`````

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>d</p>
      <p class="c">x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

The list item twin.

:::::: compare

`````carve
- d
  {.c
}
  x
`````

```html
<ul>
  <li>d
    <p class="c">x</p>
  </li>
</ul>
```

::::::
