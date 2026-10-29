## A styled display-math span takes a caption across one blank line

::: compare

```carve
$$`x+y`{.boxed data-k=v}

^ Equation #: Sum
```

```html
<figure>
  <p><span class="math display boxed" data-k="v" role="math">\[x+y\]</span></p>
  <figcaption>Equation 1: Sum</figcaption>
</figure>
```

:::
