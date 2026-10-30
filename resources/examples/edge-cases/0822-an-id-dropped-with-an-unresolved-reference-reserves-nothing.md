---
page: edge-headings
---

## An id dropped with an unresolved reference reserves nothing

An unresolved reference keeps no trailing attributes (PART 9R), so its `{#i}` is not in the document. Heading-id dedup counts only ids the document renders (CARVE-P2-004), and the heading below keeps `id="i"` (carve#4288).

::: compare

```carve
x[^n]{#i}

## {#i}
```

```html
<p>x[^n]</p>
<section id="i">
  <h2>{<span class="tag"><strong>#i</strong></span>}</h2>
</section>
```

:::

An automatic slug reads the same way.

::: compare

```carve
x[^n]{#i}

## i
```

```html
<p>x[^n]</p>
<section id="i">
  <h2>i</h2>
</section>
```

:::
