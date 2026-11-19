## Trojan-Source: heading ids are NFC-normalized and strip invisible controls

A heading id is NFC-normalized and stripped of bidi-override / isolate controls
and zero-width characters (PART 9 §26), so visually identical source cannot
produce diverging ids and an invisible control cannot smuggle a different
target.

<!-- The carve body holds a precomposed e-acute (U+00E9). -->
A precomposed `é` (U+00E9) yields id `Café`:

::: compare no-render

```carve
# Café
```

```html
<section id="Café">
  <h1>Café</h1>
</section>
```

:::

<!-- The carve body holds a decomposed e (U+0065) + COMBINING ACUTE ACCENT (U+0301). -->
A decomposed `e` + U+0301 yields the SAME id `Café` (NFC), while the rendered
heading text keeps the author's decomposed sequence:

::: compare no-render

```carve
# Café
```

```html
<section id="Café">
  <h1>Café</h1>
</section>
```

:::

<!-- The carve body holds A, RIGHT-TO-LEFT OVERRIDE (U+202E), B, ZERO WIDTH SPACE (U+200B), C. -->
A heading containing U+202E and U+200B yields an id with NEITHER (`ABC`); the
rendered text drops the bidi-override but keeps the zero-width space:

::: compare no-render

```carve
# A‮B​C
```

```html
<section id="ABC">
  <h1>AB​C</h1>
</section>
```

:::
