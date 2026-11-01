---
page: edge-inline
---

## Abbreviations skip generated and link-derived text

PART 9R R3 and R4. An authored heading and ordinary text expand an abbreviation term. A tag handle, an autolink display and a cloned cross-reference label keep their text opaque.

::: compare

```carve
*[A]: expansion

# A

<#A> </#A> <https://example.test/A> A
```

```html
<section id="A">
  <h1><abbr title="expansion">A</abbr></h1>
  <p>&lt;<span class="tag"><strong>#A</strong></span>&gt; <a href="#A">A</a> <a href="https://example.test/A">https://example.test/A</a> <abbr title="expansion">A</abbr></p>
</section>
```

:::
