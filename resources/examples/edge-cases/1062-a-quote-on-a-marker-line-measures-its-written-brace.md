---
page: edge-attributes
---

## A quote on a marker line measures its written brace

When a quote opens on a note's or an item's marker line, an unprefixed continuation of a brace run in it is compared with the `{` where it is written, past the note label or a task box, not with the host's body column. A continuation at or short of that `{` refuses the run, which stays the quote's paragraph text; one column past it continues the run (CARVE-P2-035, carve#5805, carve#5820).

::: compare

```carve
[^q]: > {.x
     .y}

x[^q]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>{.x
.y}</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^q]: > {.x
         .y}

x[^q]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote>

      </blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
- > {.x
 }
plain
```

```html
<ul>
  <li>
    <blockquote><p>{.x
}
plain</p></blockquote>
  </li>
</ul>
```

:::

::: compare

```carve
- [ ] > {.x
      .y}
plain
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled> 
    <blockquote><p>{.x
.y}
plain</p></blockquote>
  </li>
</ul>
```

:::

::: compare

```carve
[^q]: > > {.x
       .y}

x[^q]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote>
        <blockquote><p>{.x
.y}</p></blockquote>
      </blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
