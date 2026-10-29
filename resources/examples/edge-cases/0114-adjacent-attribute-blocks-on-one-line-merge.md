## Adjacent attribute blocks on one line merge

Two (or more) `{...}` blocks written back-to-back on a block-attribute line
combine into one attribute set, exactly like a single space-separated block.

::: compare

```carve
{.c}{#i}
# H
```

```html
<section id="i">
  <h1 class="c">H</h1>
</section>
```

:::
