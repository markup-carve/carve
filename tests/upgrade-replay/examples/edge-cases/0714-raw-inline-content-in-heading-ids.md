## Raw inline content in heading ids

Raw inline content contributes no heading id text, even when the target is HTML:

::: compare

```carve
# a `<b>x</b>`{=html} c
```

```html
<section id="a-c">
  <h1>a <b>x</b> c</h1>
</section>
```

:::

A heading made only of raw inline content uses the empty id fallback:

::: compare

```carve
# `<b>x</b>`{=html}
```

```html
<section id="s">
  <h1><b>x</b></h1>
</section>
```

:::
