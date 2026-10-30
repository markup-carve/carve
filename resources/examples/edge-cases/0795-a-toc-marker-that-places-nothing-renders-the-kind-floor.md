## A toc marker that places nothing renders the kind floor

Without the `toc` placement extension, `::: toc` places nothing. Like any marker that places nothing (CARVE-P9-072, carve#4134), it renders `<div class="toc">` with its title and label inside, the same floor `::: glossary` and `::: index` get.

:::: compare

```carve
::: toc "Contents"
:::
```

```html
<div class="toc">
  <p class="admonition-title">Contents</p>
</div>
```

::::

:::: compare

```carve
::: toc "Contents" [Overview]
Authored.
:::
```

```html
<div class="toc">
  <p class="admonition-title">Contents</p>
  <p class="div-label">Overview</p>
  <p>Authored.</p>
</div>
```

::::
