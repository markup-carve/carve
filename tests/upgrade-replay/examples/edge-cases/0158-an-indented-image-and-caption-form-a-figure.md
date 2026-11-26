## An indented image and caption form a figure

A lone image on its own line becomes a `<figure>` when a `^ ` caption line
follows. Indented by a space at top level, the pair still forms the figure
(carve#3885).

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

An indented attribute brace above the indented image and caption attaches to the
figure.

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
