## Lazy text stays in an unclosed quoted admonition

The quote keeps an open paragraph across a flush-left lazy line.

::: compare

```carve
> ::: note
> a
b
```

```html
<blockquote>
  <aside class="admonition note" aria-label="Note">
    <p>a
b</p>
  </aside>
</blockquote>
```

:::
