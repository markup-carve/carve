## Classes are deduplicated

Repeated class values are merged into a single `class` attribute and
deduplicated, keeping first-occurrence order (PART 9 §15). `class="a a"` and
`class="a"` are equivalent in HTML, so the shorter form is emitted.

::: compare

```carve
[x]{.a .a .b}
```

```html
<p><span class="a b">x</span></p>
```

:::
