---
page: edge-links
---

## Unresolved reference fallback folds soft breaks on plain and ANSI

PART 9R R1. The unresolved link or image stays literal. Its soft line feed
folds on plain and ANSI, including inside a local hard-break block; an authored
hard break survives (carve#5257).

::: compare

```carve
[a
b][missing]
```

```html
<p>[a
b][missing]</p>
```

:::

:::: compare

```carve
::: \
[a
b][missing]
:::
```

```html
<div class="hardbreaks">
  <p>[a
b][missing]</p>
</div>
```

::::

:::: compare

```carve
::: \
![a
b][missing]
:::
```

```html
<div class="hardbreaks">
  <p>![a
b][missing]</p>
</div>
```

::::

::: compare

```carve
[a\
b][missing]
```

```html
<p>[a\
b][missing]</p>
```

:::
