---
page: edge-headings
---

## DEL is ASCII nonalphanumeric for heading slugs

An automatic heading id replaces DEL (U+007F) and an adjacent punctuation run with one hyphen (PART 2, CARVE-P2-004, carve#5462).

::: compare

```carve
# ab

# a!?b
```

```html
<section id="a-b">
  <h1>ab</h1>
</section>
<section id="a-b-2">
  <h1>a!?b</h1>
</section>
```

:::
