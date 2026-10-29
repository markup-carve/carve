## Indented image and caption stay literal

A lone image on its own line at column 0 becomes a `<figure>` when a `^ ` caption
line follows. Indented by a space, neither the image line nor the caption is a
top-level opener, so the pair folds into a literal paragraph with the raw `^ `
still in the text.

::: compare

```carve
 ![Apollo](a.jpg)
 ^ Figure 1: moon
```

```html
<figure>
  <img src="a.jpg" alt="Apollo">
  <figcaption>Figure 1: moon</figcaption>
</figure>
```

:::

An indented attribute brace above the indented image and caption is likewise
literal; all three lines join as one paragraph.

::: compare

```carve
 {.gallery}
 ![Apollo](a.jpg)
 ^ Figure 1: moon
```

```html
<figure class="gallery">
  <img src="a.jpg" alt="Apollo">
  <figcaption>Figure 1: moon</figcaption>
</figure>
```

:::

Control - flush left at column 0 the same image and caption form the `<figure>`.

::: compare

```carve
![Apollo](a.jpg)
^ Figure 1: moon
```

```html
<figure>
  <img src="a.jpg" alt="Apollo">
  <figcaption>Figure 1: moon</figcaption>
</figure>
```

:::
