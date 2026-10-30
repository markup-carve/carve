---
page: edge-attributes
---

## A typed container writes each class once

The classes a typed `:::` container writes itself, `admonition` and the kind word, lead the class list, and an authored class with the same value is not written again (CARVE-P4-002, carve#4143).

::::: compare

```carve
{.calculation}
::: calculation
42
:::
```

```html
<div class="calculation">
  <p>42</p>
</div>
```

:::::

::::: compare

```carve
{.note}
::: note
42
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>42</p>
</aside>
```

:::::

::::: compare

```carve
{.admonition}
::: note
42
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>42</p>
</aside>
```

:::::

::::: compare

```carve
{.x .note .y}
::: note
42
:::
```

```html
<aside class="admonition note x y" aria-label="Note">
  <p>42</p>
</aside>
```

:::::
