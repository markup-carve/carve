## A guard that closes only inside its guarded child's block

The `_` is an open entry where the `*` stands, so the `*` opens whether or not the `_` closes later (markup-carve/carve#3973). The child closes and its block attaches, so the `_` inside the block is opaque and the guard stays text. A later attributed span reads the same way.

::: compare

```carve
_*a*{t="_"}
```

```html
<p>_<strong t="_">a</strong></p>
```

:::

::: compare

```carve
_*a*{t="_"} /a/{t=a_}
```

```html
<p>_<strong t="_">a</strong> <em t="a_">a</em></p>
```

:::
