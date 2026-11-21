---
page: edge-attributes
---

## A typed div's directive classes lead its attributes

The classes the directive adds hold their rank ahead of what the author wrote, and the authored classes follow them in one slot, wherever the first authored class stood.

:::: compare

```carve
{k=v .c}
::: note
x
:::
```

```html
<aside class="admonition note c" k="v" aria-label="Note">
  <p>x</p>
</aside>
```

::::

:::: compare

```carve
{k=v .c}
::: foo
x
:::
```

```html
<div class="foo c" k="v">
  <p>x</p>
</div>
```

::::

:::: compare

```carve
{k=v}
::: foo
x
:::
```

```html
<div class="foo" k="v">
  <p>x</p>
</div>
```

::::

:::: compare

```carve
{k=v .foo .c}
::: foo
x
:::
```

```html
<div class="foo c" k="v">
  <p>x</p>
</div>
```

::::
