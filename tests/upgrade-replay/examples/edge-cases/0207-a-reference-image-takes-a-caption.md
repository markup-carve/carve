## A reference image takes a caption

A caption attaches to the captionable block above it, and an image written as a reference is an image. Every captioned-image case pinned the inline form, so the oracle accepted only that spelling and left the caption as literal text under a reference image while all three engines built the figure.

::: compare

```carve
![a][ok]
^ cap

[ok]: /p.png
```

```html
<figure>
  <img src="/p.png" alt="a">
  <figcaption>cap</figcaption>
</figure>
```

:::
