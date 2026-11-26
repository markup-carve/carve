## A bare attribute block on its own line is literal

A `block_attributes` line requires at least one attribute (PART 9 §15); there
is no block-level blessed-empty form (only the inline `[text]{}` span is
blessed). So a bare `{}` line stays a literal paragraph.

::: compare

```carve
{}
```

```html
<p>{}</p>
```

:::
