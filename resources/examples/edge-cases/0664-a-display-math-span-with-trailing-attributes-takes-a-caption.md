## A display-math span with trailing attributes takes a caption

::: compare

```carve
$$`E=mc^2`{#eq-1}
^ cap
```

```html
<figure>
  <p><span class="math display" id="eq-1" role="math">\[E=mc^2\]</span></p>
  <figcaption>cap</figcaption>
</figure>
```

:::
