## An enclosing closer ends a tag name

The deletion closer takes its hyphen before the tag name can consume it. A
bare tag keeps the same trailing hyphen because no frame is waiting to close.

::: compare

```carve
{-{#x-}

#x-
```

```html
<p><del>{<span class="tag"><strong>#x</strong></span></del></p>
<p><span class="tag"><strong>#x-</strong></span></p>
```

:::
