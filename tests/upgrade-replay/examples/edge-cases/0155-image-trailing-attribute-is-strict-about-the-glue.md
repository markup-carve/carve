## Image trailing attribute is strict about the glue

A trailing `{…}` attaches to a sole image only when glued directly to the closing paren. A space between the image and the block breaks the glue, so the `{…}` stays literal text alongside the image.

Glued: the attributes attach to the image.

::: compare

```carve
![alt](img.png){.x}
```

```html
<img src="img.png" alt="alt" class="x">
```

:::

Spaced: the block stays literal.

::: compare

```carve
![alt](img.png) {.x}
```

```html
<p><img src="img.png" alt="alt"> {.x}</p>
```

:::
