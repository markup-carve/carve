---
page: edge-headings
---

## An id dropped with an unresolved reference reserves nothing

An unresolved reference keeps its trailing attribute run as text (PART 9R, carve#4816), so its `{#i}` is no id. Heading-id dedup counts only ids the document renders (CARVE-P2-004), and the heading below keeps `id="i"` (carve#4288).

::: compare

```carve
x[^n]{#i}

## {#i}
```

```html
<p>x[^n]{#i}</p>
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
<p>x[^n]{#i}</p>
<section id="i">
  <h2>i</h2>
</section>
```

:::
