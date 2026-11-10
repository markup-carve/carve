---
page: edge-attributes
---

## A refused quoted run with a lazy continuation stays literal

A lazy continuation at or left of the quoted `{` refuses the run, and a refused run is literal paragraph text in every owner, so `{#a` reads no tag (CARVE-P2-035, carve#5829).

::: compare

```carve
- > {#a
   .y}
```

```html
<ul>
  <li>
    <blockquote><p>{#a
.y}</p></blockquote>
  </li>
</ul>
```

:::

::: compare

```carve
> - {#a
   .y}
```

```html
<blockquote>
  <ul>
    <li>{#a
.y}</li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
> {#a
 .y}
```

```html
<blockquote><p>{#a
.y}</p></blockquote>
```

:::
